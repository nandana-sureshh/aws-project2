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
#
# VITE_API_URL is empty ("") — React SPA uses relative /api/* paths.
# External ALB listener rule routes /api/* to the backend target group.
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
    http_put_response_hop_limit = 1
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

# ---- Write backend environment file ----
# No secrets here — the application reads them from Secrets Manager at startup.
# Use printf to avoid any leading whitespace issues.
printf '%s\n' \
  "NODE_ENV=production" \
  "PORT=3000" \
  "HOST=0.0.0.0" \
  "AWS_REGION=${var.aws_region}" \
  "AWS_SECRETS_MANAGER_SECRET_NAME=${var.secret_name}" \
  "S3_BUCKET_NAME=${var.s3_bucket_name}" \
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
echo "Starting backend..."
cd "$APP_DIR"
for attempt in 1 2 3; do
  docker compose -f docker-compose.backend.yml up -d --build && break || {
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
    http_put_response_hop_limit = 1
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
