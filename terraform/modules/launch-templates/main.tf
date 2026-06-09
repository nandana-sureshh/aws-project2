# --- Latest Ubuntu 24.04 AMI ---

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ===========================================================================
# FRONTEND LAUNCH TEMPLATE
#
# Runs on separate EC2 instances in frontend private subnets.
# Clones repo, builds the React app inside Docker, starts Nginx.
# Uses docker-compose.frontend.yml (no backend dependency).
# ===========================================================================

locals {
  frontend_userdata = <<-USERDATA
#!/bin/bash
set -uo pipefail
exec > /var/log/caresync-frontend-init.log 2>&1
echo "=== CareSync Frontend Bootstrap Started: $(date) ==="

export DEBIAN_FRONTEND=noninteractive

# ---- System update ----
apt-get update -y
apt-get upgrade -y

# ---- Install Docker ----
apt-get install -y ca-certificates curl gnupg lsb-release git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# ---- Clone or update repository (with retries) ----
APP_DIR="/opt/caresync"

clone_or_pull() {
  if [ -d "$APP_DIR/.git" ]; then
    echo "Repository already exists — pulling latest changes"
    cd "$APP_DIR"
    git pull --ff-only || { echo "git pull failed, re-cloning"; rm -rf "$APP_DIR"; git clone ${var.github_repo_url} "$APP_DIR"; }
  else
    echo "Cloning repository..."
    rm -rf "$APP_DIR"
    git clone ${var.github_repo_url} "$APP_DIR"
  fi
}

for attempt in 1 2 3 4 5; do
  echo "Clone/pull attempt $attempt..."
  clone_or_pull && break || {
    echo "Attempt $attempt failed. Waiting 30s..."
    sleep 30
  }
done

[ -d "$APP_DIR/.git" ] || { echo "FATAL: repository not available after 5 attempts"; exit 1; }

# ---- Start frontend container ----
echo "Starting frontend..."
cd "$APP_DIR"
for attempt in 1 2 3; do
  docker compose -f docker-compose.frontend.yml up -d --build && break || {
    echo "docker compose attempt $attempt failed. Waiting 20s..."
    sleep 20
  }
done

echo "=== CareSync Frontend Bootstrap Complete: $(date) ==="
USERDATA
}

resource "aws_launch_template" "frontend" {
  name_prefix   = "${var.project_name}-${var.environment}-frontend-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  key_name      = var.key_name

  vpc_security_group_ids = [var.frontend_sg_id]

  monitoring {
    enabled = true
  }

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  user_data = base64encode(local.frontend_userdata)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-${var.environment}-frontend"
      Environment = var.environment
      Project     = var.project_name
      Role        = "frontend"
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-frontend-lt"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ===========================================================================
# BACKEND LAUNCH TEMPLATE
#
# Runs on separate EC2 instances in backend private subnets.
# IAM instance profile grants access to Secrets Manager, S3, and KMS.
# Uses docker-compose.backend.yml (no frontend dependency, no local postgres).
# Application reads secrets from Secrets Manager directly at startup.
# ===========================================================================

locals {
  backend_userdata = <<-USERDATA
#!/bin/bash
set -uo pipefail
exec > /var/log/caresync-backend-init.log 2>&1
echo "=== CareSync Backend Bootstrap Started: $(date) ==="

export DEBIAN_FRONTEND=noninteractive

# ---- System update ----
apt-get update -y
apt-get upgrade -y

# ---- Install Docker + unzip ----
apt-get install -y ca-certificates curl gnupg lsb-release git unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# ---- Install AWS CLI v2 ----
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp/
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws/

# ---- Install CloudWatch Agent ----
# Used to ship /var/log/caresync-backend-init.log → CloudWatch Log Group.
# Only this specific file is collected — no syslog, auth.log, or system logs.
curl -fsSL "https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb" \
  -o /tmp/amazon-cloudwatch-agent.deb
dpkg -i /tmp/amazon-cloudwatch-agent.deb
rm -f /tmp/amazon-cloudwatch-agent.deb

# Write CloudWatch Agent config.
# Log group name and region come from Terraform interpolation — not hardcoded.
CW_LOG_GROUP_INIT="/${var.project_name}/${var.environment}/backend/init"
CW_REGION="${var.aws_region}"

mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<CWCONFIG
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/caresync-backend-init.log",
            "log_group_name": "$CW_LOG_GROUP_INIT",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          }
        ]
      }
    }
  }
}
CWCONFIG

# Start the CloudWatch Agent with the config above
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

echo "CloudWatch Agent started. Shipping: /var/log/caresync-backend-init.log → $CW_LOG_GROUP_INIT"

# ---- Clone or update repository (with retries) ----
APP_DIR="/opt/caresync"

clone_or_pull() {
  if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists — pulling latest..."
    cd "$APP_DIR"
    git pull --ff-only || { echo "git pull failed, re-cloning"; rm -rf "$APP_DIR"; git clone ${var.github_repo_url} "$APP_DIR"; }
  else
    echo "Cloning repository..."
    rm -rf "$APP_DIR"
    git clone ${var.github_repo_url} "$APP_DIR"
  fi
}

for attempt in 1 2 3 4 5; do
  echo "Clone/pull attempt $attempt..."
  clone_or_pull && break || {
    echo "Attempt $attempt failed. Waiting 30s..."
    sleep 30
  }
done

[ -d "$APP_DIR/.git" ] || { echo "FATAL: repository not available after 5 attempts"; exit 1; }

# ---- Fetch EC2 Instance ID ----
# Used to ensure Docker container log streams are unique per EC2 instance.
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
EC2_INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)

# ---- Write backend environment file ----
# No secrets here — the application reads them from Secrets Manager at startup.
# CLOUDWATCH_LOG_GROUP_APP and AWS_REGION are needed by docker-compose.backend.yml
# for Docker Compose YAML variable substitution (awslogs driver logging block).
# Use printf to avoid any leading whitespace issues.
printf '%s\n' \
  "NODE_ENV=production" \
  "PORT=3000" \
  "HOST=0.0.0.0" \
  "AWS_REGION=${var.aws_region}" \
  "AWS_SECRETS_MANAGER_SECRET_NAME=${var.secret_name}" \
  "S3_BUCKET_NAME=${var.s3_bucket_name}" \
  "CLOUDWATCH_LOG_GROUP_APP=/${var.project_name}/${var.environment}/backend/app" \
  "CLOUDWATCH_LOG_GROUP_INIT=/${var.project_name}/${var.environment}/backend/init" \
  "EC2_INSTANCE_ID=$EC2_INSTANCE_ID" \
  "STORAGE_PROVIDER=s3" \
  "NOTIFICATION_PROVIDER=database" \
  "EVENT_PROVIDER=console" \
  "QUEUE_PROVIDER=local" \
  "JWT_EXPIRES_IN=15m" \
  "JWT_REFRESH_EXPIRES_IN=7d" \
  "CORS_ORIGIN=*" \
  "MAX_FILE_SIZE_MB=10" \
  "RATE_LIMIT_WINDOW_MS=900000" \
  "RATE_LIMIT_MAX_REQUESTS=200" \
  > "$APP_DIR/.env.aws"

# ---- Start backend container ----
# --env-file passes .env.aws variables to Docker Compose YAML substitution
# so $${AWS_REGION} and $${CLOUDWATCH_LOG_GROUP_APP} in the logging block resolve correctly.
echo "Starting backend..."
cd "$APP_DIR"
for attempt in 1 2 3; do
  docker compose --env-file "$APP_DIR/.env.aws" -f docker-compose.backend.yml up -d --build && break || {
    echo "docker compose attempt $attempt failed. Waiting 30s..."
    sleep 30
  }
done

echo "=== CareSync Backend Bootstrap Complete: $(date) ==="
USERDATA
}

resource "aws_launch_template" "backend" {
  name_prefix   = "${var.project_name}-${var.environment}-backend-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  key_name      = var.key_name

  vpc_security_group_ids = [var.backend_sg_id]

  iam_instance_profile {
    name = var.backend_instance_profile_name
  }

  monitoring {
    enabled = true
  }

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  user_data = base64encode(local.backend_userdata)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-${var.environment}-backend"
      Environment = var.environment
      Project     = var.project_name
      Role        = "backend"
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-lt"
    Environment = var.environment
    Project     = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}
