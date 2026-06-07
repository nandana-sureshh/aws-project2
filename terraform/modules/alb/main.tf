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
  vpc_id   = var.vpc_id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-frontend-tg"
  }
}

# --- Backend Target Group ---

resource "aws_lb_target_group" "backend" {
  name     = "${var.project_name}-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/api/health"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-backend-tg"
  }
}

# --- Internal Backend Target Group ---

resource "aws_lb_target_group" "internal_backend" {
  name     = "${var.project_name}-int-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/api/health"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-int-backend-tg"
  }
}

# --- External Listener (path-based routing) ---
# Default: /* → Frontend
# /api/*  → Backend

resource "aws_lb_listener" "external_http" {
  load_balancer_arn = aws_lb.external.arn
  port              = 80
  protocol          = "HTTP"

  # Default action: serve frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Path-based rule: /api/* → Backend Target Group
resource "aws_lb_listener_rule" "api_to_backend" {
  listener_arn = aws_lb_listener.external_http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# --- Internal ALB ---
# Kept for internal service-to-service communication and future expansion.
# Frontend EC2 instances do NOT use this — browser traffic goes via External ALB.

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

# --- Internal Listener → Backend Target Group ---

resource "aws_lb_listener" "internal_http" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.internal_backend.arn
  }
}