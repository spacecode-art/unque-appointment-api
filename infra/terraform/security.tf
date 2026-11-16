resource "aws_security_group" "api" {
  name        = "${var.name}-api"
  description = "API server: HTTP in, anything out"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.name}-api-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "api_http" {
  #checkov:skip=CKV_AWS_260:The API is public by design so it can be reached from Postman. Narrow allowed_http_cidrs to restrict it.
  for_each = toset(var.allowed_http_cidrs)

  security_group_id = aws_security_group.api.id
  description       = "HTTP to the API"
  cidr_ipv4         = each.value
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

# Terraform removes the allow-all outbound rule AWS adds by default, so we add
# it back here on purpose. The instance has to reach GitHub, npm and the
# Systems Manager endpoints.
resource "aws_vpc_security_group_egress_rule" "api_all" {
  security_group_id = aws_security_group.api.id
  description       = "Outbound for package installs and Systems Manager"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "db" {
  name        = "${var.name}-docdb"
  description = "DocumentDB: only the API server may connect"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.name}-docdb-sg" }
}

# The source is the API's security group, not an IP range. Whatever instance
# wears that group can connect, and nothing else can, even inside the VPC.
resource "aws_vpc_security_group_ingress_rule" "db_from_api" {
  security_group_id            = aws_security_group.db.id
  description                  = "MongoDB protocol from the API server"
  referenced_security_group_id = aws_security_group.api.id
  from_port                    = 27017
  to_port                      = 27017
  ip_protocol                  = "tcp"
}

# Every VPC comes with a default security group that lets its members talk to
# each other freely. Adopting it with no rules strips them all, so nothing can
# land in it by accident. Our instances use their own groups above.
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name}-default-locked" }
}