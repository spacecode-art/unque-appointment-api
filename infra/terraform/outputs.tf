output "docdb_endpoint" {
  description = "Cluster endpoint the API connects to"
  value       = aws_docdb_cluster.main.endpoint
}