data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${var.name}-api-ec2"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Lets Session Manager open a shell and run deploy commands, so no SSH is needed
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# The two secrets, by exact ARN. Not a wildcard, and nothing else in Parameter Store.
data "aws_iam_policy_document" "read_secrets" {
  statement {
    actions = ["ssm:GetParameter"]
    resources = [
      aws_ssm_parameter.db_password.arn,
      aws_ssm_parameter.jwt_secret.arn,
    ]
  }
}

resource "aws_iam_role_policy" "read_secrets" {
  name   = "read-app-secrets"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.read_secrets.json
}

# An EC2 instance can't wear a role directly; it wears an instance profile
resource "aws_iam_instance_profile" "api" {
  name = "${var.name}-api"
  role = aws_iam_role.api.name
}