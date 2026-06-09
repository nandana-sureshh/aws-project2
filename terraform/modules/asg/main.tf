# FRONTEND AUTO SCALING GROUP

resource "aws_autoscaling_group" "frontend" {
  name = "${var.project_name}-${var.environment}-frontend-asg"

  min_size         = 1
  desired_capacity = 1
  max_size         = 2

  vpc_zone_identifier = var.frontend_subnet_ids

  launch_template {
    id      = var.frontend_launch_template_id
    version = var.frontend_launch_template_version
  }

  target_group_arns = [var.frontend_target_group_arn]

  health_check_type = "ELB"

  # 600 seconds (10 minutes) — gives Docker install + image build time to complete
  health_check_grace_period = 600

  force_delete = false

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${var.environment}-frontend"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = var.project_name
    propagate_at_launch = true
  }

  tag {
    key                 = "Role"
    value               = "frontend"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# BACKEND AUTO SCALING GROUP

resource "aws_autoscaling_group" "backend" {
  name = "${var.project_name}-${var.environment}-backend-asg"

  min_size         = 1
  desired_capacity = 1
  max_size         = 2

  vpc_zone_identifier = var.backend_subnet_ids

  launch_template {
    id      = var.backend_launch_template_id
    version = var.backend_launch_template_version
  }

  target_group_arns = [
    var.backend_target_group_arn,
    var.internal_backend_target_group_arn
  ]

  health_check_type = "ELB"

  # 600 seconds — Docker install + image build + Secrets Manager fetch + Prisma migrations
  health_check_grace_period = 600

  force_delete = false

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${var.environment}-backend"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = var.project_name
    propagate_at_launch = true
  }

  tag {
    key                 = "Role"
    value               = "backend"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}
