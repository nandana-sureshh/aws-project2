#!/bin/bash
# =============================================================================
# CareSync - Deployment Validation Script
# Uses dynamic discovery to validate the KGateway proxy and ALB.
# =============================================================================
set -euo pipefail

NAMESPACE="caresync-dev"
KGATEWAY_NAMESPACE="kgateway-system"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     CareSync Deployment Validation               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Namespace: ${NAMESPACE}"
echo "------------------------------------------------------------"

# --- 1. Pod Status ---
echo ""
echo "📦 1. Pod Status"
echo "------------------------------------------------------------"
kubectl get pods -n "${NAMESPACE}"

# --- 2. Services and HTTPRoutes ---
echo ""
echo "🌐 2. Services & HTTPRoutes"
echo "------------------------------------------------------------"
kubectl get svc -n "${NAMESPACE}"
echo ""
kubectl get httproute -n "${NAMESPACE}"

# --- 3. External Secrets ---
echo ""
echo "🔐 3. External Secrets (AWS Secrets Manager sync status)"
echo "------------------------------------------------------------"
kubectl get externalsecret -n "${NAMESPACE}"

# --- 4. KGateway Control Plane Status ---
echo ""
echo "🛸 4. KGateway Control Plane Status"
echo "------------------------------------------------------------"
kubectl get pods -n "${KGATEWAY_NAMESPACE}"
echo ""
kubectl get gatewayclass

# --- 5. Gateway & Dynamically Discovered Proxy ---
echo ""
echo "🌉 5. Gateway Resource & KGateway Proxy (Dynamic Discovery)"
echo "------------------------------------------------------------"
kubectl get gateway caresync-gateway -n "${NAMESPACE}"
echo ""

# Discover proxy service using KGateway's canonical label
PROXY_SVC=$(kubectl get svc -n "${NAMESPACE}" \
  -l "kgateway=kube-gateway" \
  -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

if [ -n "${PROXY_SVC}" ]; then
  PROXY_PORT=$(kubectl get svc -n "${NAMESPACE}" \
    -l "kgateway=kube-gateway" \
    -o jsonpath='{.items[0].spec.ports[?(@.name=="http")].port}' 2>/dev/null || true)
  [ -z "${PROXY_PORT}" ] && PROXY_PORT=$(kubectl get svc -n "${NAMESPACE}" \
    -l "kgateway=kube-gateway" \
    -o jsonpath='{.items[0].spec.ports[0].port}' 2>/dev/null || true)
  echo "✅ KGateway proxy service: ${PROXY_SVC} (port ${PROXY_PORT})"
else
  echo "⚠️  KGateway proxy service not found yet. Check: kubectl get svc -n ${NAMESPACE} -l kgateway=kube-gateway"
fi

# --- 6. ALB Ingress Status ---
echo ""
echo "⚡ 6. ALB Ingress Status"
echo "------------------------------------------------------------"
kubectl get ingress -n "${NAMESPACE}"
echo ""

echo "⏳ Waiting for ALB DNS hostname to be assigned (up to 5 min)..."
ALB_DNS=""
for i in {1..30}; do
  ALB_DNS=$(kubectl get ingress -n "${NAMESPACE}" caresync-alb-ingress \
    -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  if [ -n "${ALB_DNS}" ]; then
    echo "✅ ALB DNS: ${ALB_DNS}"
    break
  fi
  echo "    Waiting for AWS to provision ALB... (${i}/30)"
  sleep 10
done

if [ -z "${ALB_DNS}" ]; then
  echo "⚠️  ALB DNS not provisioned yet. This can take up to 5 minutes."
  echo "    Check ALB Controller logs: kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller"
fi

# --- 7. Traffic Reachability Test ---
if [ -n "${ALB_DNS}" ]; then
  echo ""
  echo "🏥 7. Traffic Reachability Test"
  echo "------------------------------------------------------------"
  echo "Frontend:"
  curl -s -I "http://${ALB_DNS}/" | head -n 1 || echo "(No response yet)"
  echo ""
  echo "API Health:"
  curl -s -I "http://${ALB_DNS}/api/health" | head -n 1 || echo "(API route not available)"
fi

# --- 8. HPA Status ---
echo ""
echo "📈 8. Horizontal Pod Autoscalers"
echo "------------------------------------------------------------"
kubectl get hpa -n "${NAMESPACE}"

echo ""
echo "✅ Validation complete."
echo "   For deep API testing, see TESTING_AND_DEPLOYMENT_GUIDE.md"
echo ""
