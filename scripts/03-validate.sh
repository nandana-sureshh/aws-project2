#!/bin/bash
set -e

NAMESPACE="caresync-dev"
echo "🔍 Validating CareSync Deployment in namespace: $NAMESPACE"
echo "------------------------------------------------------------"

echo "📦 1. Checking Pod Status..."
kubectl get pods -n "$NAMESPACE"
echo ""

echo "🌐 2. Checking Services & HTTPRoutes..."
kubectl get svc -n "$NAMESPACE"
kubectl get httproute -n "$NAMESPACE"
echo ""

echo "🔐 3. Checking External Secrets (AWS Secrets Manager Sync)..."
kubectl get externalsecret -n "$NAMESPACE"
echo ""

echo "🌉 4. Checking Gateway & Ingress (ALB)..."
kubectl get gateway caresync-gateway -n "$NAMESPACE"
kubectl get ingress -n "$NAMESPACE"
echo ""

echo "⏳ Waiting for ALB DNS..."
ALB_DNS=""
for i in {1..30}; do
  ALB_DNS=$(kubectl get ingress -n "$NAMESPACE" envoy-alb-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  if [ -n "$ALB_DNS" ]; then
    echo "✅ ALB DNS found: $ALB_DNS"
    break
  fi
  echo "Waiting for AWS to provision ALB... ($i/30)"
  sleep 10
done

if [ -n "$ALB_DNS" ]; then
  echo ""
  echo "🏥 5. Testing ALB Reachability..."
  echo "Testing Frontend:"
  curl -s -I "http://$ALB_DNS/" | head -n 1
  echo "Testing API Routing:"
  curl -s -I "http://$ALB_DNS/api/health" | head -n 1 || echo "API Health route check finished."
else
  echo "⚠️ ALB DNS not provisioned yet. It may take up to 5 minutes."
fi

echo ""
echo "📈 6. Checking Horizontal Pod Autoscalers..."
kubectl get hpa -n "$NAMESPACE"

echo ""
echo "✅ Baseline Validation complete. See TESTING_AND_DEPLOYMENT_GUIDE.md for deep End-to-End API testing."
