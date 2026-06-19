output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
output "cluster_name" {
  value = module.eks.cluster_name
}
output "db_secret_name" {
  value = module.secrets-manager.secret_name
}
output "sqs_queue_url" {
  value = module.sqs.queue_url
}
output "s3_bucket_name" {
  value = module.s3.bucket_name
}
output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}
output "irsa_role_arns" {
  value = module.iam-irsa.role_arns
}