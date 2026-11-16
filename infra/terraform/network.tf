locals {
  # Fixed, not looked up. A lookup returns whatever zones exist today, so if AWS
  # ever added or reordered one, Terraform would want to move the subnets, and
  # moving subnets means rebuilding everything inside them.
  azs = ["${var.aws_region}a", "${var.aws_region}b"]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name}-igw" }

}

# The API server lives here. It needs a public address so Postman can reach it.
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 0)
  availability_zone = local.azs[0]

  # No automatic public IPs: the API server asks for its own (see ec2.tf), so
  # anything else added to this subnet later is private by default.

  tags = { Name = "${var.name}-public-${local.azs[0]}" }
}

# DocumentDB insists on subnets in at least two availability zones.
# These have no route to the internet, which is the point: the database
# can only be reached from inside the VPC.
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = { Name = "${var.name}-private-${local.azs[count.index]}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# The private subnets fall back to the VPC's default route table, which only
# knows about local traffic. No NAT gateway, so no NAT bill.