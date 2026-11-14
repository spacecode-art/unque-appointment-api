# Nobody ever types or sees these. Terraform generates them, gives the database
# its password, and parks both in Parameter Store for the server to fetch at boot.
#
# Letters and digits only. DocumentDB passwords can't contain / " or @, and
# anything fancier would need escaping in shell scripts and connection strings.
resource "random_password" "db" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.name}/db_password"
  description = "DocumentDB master password"
  type        = "SecureString"
  value       = random_password.db.result
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.name}/jwt_secret"
  description = "Signing key for the API's JWTs"
  type        = "SecureString"
  value       = random_password.jwt.result
}