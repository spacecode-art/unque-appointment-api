# Latest Amazon Linux 2023, read from the public parameter AWS keeps up to date
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_instance" "api" {
  ami                    = data.aws_ssm_parameter.al2023.insecure_value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.api.id]
  iam_instance_profile        = aws_iam_instance_profile.api.name
  associate_public_ip_address = true

  user_data = templatefile("${path.module}/../../scripts/bootstrap.sh.tftpl", {
    region            = var.aws_region
    repo_url          = var.repo_url
    repo_branch       = var.repo_branch
    docdb_endpoint    = aws_docdb_cluster.main.endpoint
    db_username       = local.db_username
    db_password_param = aws_ssm_parameter.db_password.name
    jwt_secret_param  = aws_ssm_parameter.jwt_secret.name
  })

  # User data only runs on first boot, so an edited script only takes effect
  # on a fresh instance. This makes Terraform replace it instead of ignoring it.
  user_data_replace_on_change = true

  # IMDSv2 only. A request-forgery bug in the app couldn't be used to read the
  # instance's credentials with a plain GET.
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 12
    encrypted   = true
  }

  # The database needs a writer before the API starts, and the role's
  # permissions must exist before the boot script asks for its secrets.
  depends_on = [
    aws_docdb_cluster_instance.main,
    aws_iam_role_policy.read_secrets,
    aws_iam_role_policy_attachment.ssm_core,
  ]

  tags = { Name = "${var.name}-api" }
}