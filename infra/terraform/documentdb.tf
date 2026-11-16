locals {
  db_username = "unque_admin"
}

# Tells DocumentDB which subnets it may place the database in
resource "aws_docdb_subnet_group" "main" {
  name       = "${var.name}-docdb"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_docdb_cluster_parameter_group" "main" {
  name        = "${var.name}-docdb5"
  family      = "docdb5.0"
  description = "Require TLS 1.2 or newer"

  parameter {
    name  = "tls"
    value = "tls1.2+"
  }

  parameter {
    name         = "audit_logs"
    value        = "enabled"
    apply_method = "immediate"
  }
}

# DocumentDB writes to a log group named after the cluster. Creating it here
# first, with a retention period, stops it being created on demand and kept forever.
resource "aws_cloudwatch_log_group" "docdb_audit" {
  #checkov:skip=CKV_AWS_158:CloudWatch already encrypts logs at rest. A customer-managed key is a later step, together with the ones for Parameter Store and DocumentDB.
  name              = "/aws/docdb/${var.name}-docdb/audit"
  retention_in_days = 365
}

resource "aws_docdb_cluster" "main" {
  #checkov:skip=CKV_AWS_182:Storage is encrypted with the AWS-managed key. A customer-managed key can't be added to an existing cluster, so it means rebuilding the database.
  cluster_identifier = "${var.name}-docdb"
  engine             = "docdb"
  engine_version     = "5.0.0"

  master_username = local.db_username
  master_password = random_password.db.result

  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.db.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  storage_encrypted       = true
  backup_retention_period = 7

  enabled_cloudwatch_logs_exports = ["audit"]
  depends_on                      = [aws_cloudwatch_log_group.docdb_audit]

  # Demo settings, on purpose: a final snapshot or deletion protection would
  # make "terraform destroy" stop halfway and leave a bill running.
  # A real deployment would flip both.
  skip_final_snapshot = true
  deletion_protection = false
  apply_immediately   = true
}

# One instance only. The trial covers 750 hours a month, which is exactly one
# instance running all the time. A second would burn it twice as fast.
resource "aws_docdb_cluster_instance" "main" {
  identifier         = "${var.name}-docdb-1"
  cluster_identifier = aws_docdb_cluster.main.id
  engine             = "docdb"
  instance_class     = var.docdb_instance_class
}