output "docdb_endpoint" {
  description = "Cluster endpoint the API connects to"
  value       = aws_docdb_cluster.main.endpoint
}


output "instance_id" {
  description = "Instance to connect to with Session Manager"
  value       = aws_instance.api.id
}

output "api_public_ip" {
  description = "Public address of the API server"
  value       = aws_instance.api.public_ip
}

output "api_url" {
  description = "Base URL for Postman"
  value       = "http://${aws_instance.api.public_ip}"
}