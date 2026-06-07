# --- VPC ---
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# --- Public Subnets ---
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
  }
}

# --- Frontend Private Subnets ---
resource "aws_subnet" "frontend" {
  count = length(var.frontend_subnet_cidrs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.frontend_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-frontend-${count.index + 1}"
  }
}

# --- Backend Private Subnets ---
resource "aws_subnet" "backend" {
  count = length(var.backend_subnet_cidrs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.backend_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-backend-${count.index + 1}"
  }
}

# --- Database Private Subnets ---
resource "aws_subnet" "database" {
  count = length(var.database_subnet_cidrs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-database-${count.index + 1}"
  }
}

# --- Internet Gateway ---
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

# --- NAT Gateway Elastic IPs ---
resource "aws_eip" "nat_a" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip-a"
  }
}

resource "aws_eip" "nat_b" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip-b"
  }
}

# --- NAT Gateways (High Availability) ---
resource "aws_nat_gateway" "nat_a" {
  allocation_id = aws_eip.nat_a.id
  subnet_id     = aws_subnet.public[0].id

  depends_on = [aws_internet_gateway.this]

  tags = {
    Name = "${var.project_name}-nat-a"
  }
}

resource "aws_nat_gateway" "nat_b" {
  allocation_id = aws_eip.nat_b.id
  subnet_id     = aws_subnet.public[1].id

  depends_on = [aws_internet_gateway.this]

  tags = {
    Name = "${var.project_name}-nat-b"
  }
}

# --- Route Tables ---
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table" "private_a" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_a.id
  }

  tags = {
    Name = "${var.project_name}-private-a-rt"
  }
}

resource "aws_route_table" "private_b" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_b.id
  }

  tags = {
    Name = "${var.project_name}-private-b-rt"
  }
}

resource "aws_route_table" "database" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.project_name}-database-rt"
  }
}

# --- Public Route Table Associations ---
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public[0].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public[1].id
  route_table_id = aws_route_table.public.id
}

# --- Private Route Table Associations (AZ-A) ---
resource "aws_route_table_association" "frontend_a" {
  subnet_id      = aws_subnet.frontend[0].id
  route_table_id = aws_route_table.private_a.id
}

resource "aws_route_table_association" "backend_a" {
  subnet_id      = aws_subnet.backend[0].id
  route_table_id = aws_route_table.private_a.id
}

# --- Private Route Table Associations (AZ-B) ---
resource "aws_route_table_association" "frontend_b" {
  subnet_id      = aws_subnet.frontend[1].id
  route_table_id = aws_route_table.private_b.id
}

resource "aws_route_table_association" "backend_b" {
  subnet_id      = aws_subnet.backend[1].id
  route_table_id = aws_route_table.private_b.id
}

# --- Database Route Table Associations ---
resource "aws_route_table_association" "database_a" {
  subnet_id      = aws_subnet.database[0].id
  route_table_id = aws_route_table.database.id
}

resource "aws_route_table_association" "database_b" {
  subnet_id      = aws_subnet.database[1].id
  route_table_id = aws_route_table.database.id
}