#!/bin/bash
set -e

echo "🚀 Starting CareSync EKS Infrastructure Deployment"

echo "📦 Deploying Infrastructure via Terraform..."
cd terraform/environments/dev
terraform init
terraform apply -auto-approve

CLUSTER_NAME=$(terraform output -raw cluster_name)
REGION=$(terraform output -raw aws_region || echo "us-east-1")
echo "✅ Infrastructure deployed. Cluster: $CLUSTER_NAME in $REGION"

echo "🔐 Updating Kubeconfig..."
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"
echo "✅ Kubeconfig updated."
