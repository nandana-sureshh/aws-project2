# --- External ALB ---

resource "aws_lb" "external" {
  name               = "${var.project_name}-external-alb"
  internal           = false
  load_balancer_type = "application"

  security_groups = [var.external_alb_sg_id]

  subnets = var.public_subnet_ids

  tags = {
    Name = "${var.project_name}-external-alb"
  }
}

# --- Frontend Target Group ---

resource "aws_lb_target_group" "frontend" {
  name     = "${var.project_name}-frontend-tg"
  port     = 80
  protocol = "HTTP"

  vpc_id = var.vpc_id

  health_check {
    path = "/"
  }
}

# --- External Listener ---

resource "aws_lb_listener" "external_http" {
  load_balancer_arn = aws_lb.external.arn

  port     = 80
  protocol = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# --- Internal ALB ---

resource "aws_lb" "internal" {
  name               = "${var.project_name}-internal-alb"
  internal           = true
  load_balancer_type = "application"

  security_groups = [var.internal_alb_sg_id]

  subnets = var.backend_subnet_ids

  tags = {
    Name = "${var.project_name}-internal-alb"
  }
}

# --- Backend Target Group ---

resource "aws_lb_target_group" "backend" {
  name     = "${var.project_name}-backend-tg"
  port     = 3000
  protocol = "HTTP"

  vpc_id = var.vpc_id

  health_check {
    path = "/api/health"
  }
}

# --- Internal Listener ---

resource "aws_lb_listener" "internal_http" {
  load_balancer_arn = aws_lb.internal.arn

  port     = 80
  protocol = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}