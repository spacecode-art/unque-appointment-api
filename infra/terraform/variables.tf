variable "aws_region" {
  description = "Region everything is created in"
  type        = string
  default     = "eu-west-1"
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

variable "docdb_instance_class" {
  description = "DocumentDB instance size. db.t3.medium is the one the free trial covers."
  type        = string
  default     = "db.t3.medium"
}

variable "instance_type" {
  description = "Size of the API server"
  type        = string
  default     = "t3.micro"
}

variable "repo_url" {
  description = "Public Git URL the server clones the API from"
  type        = string
  default     = "https://github.com/spacecode-art/unque-appointment-api.git"
}

variable "repo_branch" {
  description = "Branch the server deploys on first boot"
  type        = string
  default     = "main"
}