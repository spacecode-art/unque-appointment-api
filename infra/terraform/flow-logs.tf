# A record of who talked to what inside the VPC: addresses, ports, accepted or
# rejected. It's what you'd go to after an incident.
resource "aws_cloudwatch_log_group" "vpc_flow" {
  #checkov:skip=CKV_AWS_158:CloudWatch already encrypts logs at rest. A customer-managed key is a later step, together with the ones for Parameter Store and DocumentDB.
  name              = "/aws/vpc/${var.name}/flow-logs"
  retention_in_days = 365
}

data "aws_iam_policy_document" "flow_logs_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "flow_logs" {
  name               = "${var.name}-vpc-flow-logs"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume.json
}

# Write to this one log group, nothing else
data "aws_iam_policy_document" "flow_logs_write" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    resources = [
      aws_cloudwatch_log_group.vpc_flow.arn,
      "${aws_cloudwatch_log_group.vpc_flow.arn}:*",
    ]
  }
}

resource "aws_iam_role_policy" "flow_logs" {
  name   = "write-flow-logs"
  role   = aws_iam_role.flow_logs.id
  policy = data.aws_iam_policy_document.flow_logs_write.json
}

resource "aws_flow_log" "main" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.vpc_flow.arn
  iam_role_arn         = aws_iam_role.flow_logs.arn
}