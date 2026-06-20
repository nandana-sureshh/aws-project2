#!/bin/bash
set -euo pipefail

echo "🚀 Installing AWS Load Balancer Controller..."

CLUSTER_NAME=$(cd terraform/environments/dev && terraform output -raw cluster_name)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")
ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${CLUSTER_NAME}-albc-role"

echo "Cluster: $CLUSTER_NAME"
echo "Role ARN: $ROLE_ARN"

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="$CLUSTER_NAME" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$ROLE_ARN"

echo "✅ AWS Load Balancer Controller installed successfully!"
