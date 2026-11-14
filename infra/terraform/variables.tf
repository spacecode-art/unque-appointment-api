variable "aws_region" {
  description = "Region everything is created in"
  type        = string
  default     = "us-east-1"
}

variable "name" {
  description = "Prefix for resource names"
  type        = string
  default     = "unque"
}

variable "vpc_cidr" {
  description = "Address range of the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_http_cidrs" {
  description = "Who can reach the API on port 80. Open to everyone for the demo."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}