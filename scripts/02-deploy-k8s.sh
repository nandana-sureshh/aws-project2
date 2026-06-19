#!/bin/bash
# =============================================================================
# CareSync - Kubernetes Deployment Script
# Installs KGateway, deploys the Helm chart, and dynamically provisions the
# AWS ALB pointing to the correct KGateway proxy service.
# =============================================================================
set -euo pipefail

NAMESPACE="caresync-dev"
KGATEWAY_VERSION="v2.3.1"
KGATEWAY_NAMESPACE="kgateway-system"
GATEWAY_API_CRD_VERSION="v1.2.0"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     CareSync Kubernetes Deployment               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# --- Step 1: Install Gateway API Standard CRDs ---
echo "📐 Step 1: Installing Kubernetes Gateway API CRDs (${GATEWAY_API_CRD_VERSION})..."
kubectl apply -f "https://github.com/kubernetes-sigs/gateway-api/releases/download/${GATEWAY_API_CRD_VERSION}/standard-install.yaml"
echo "✅ Gateway API CRDs installed."
echo ""

# --- Step 2: Install KGateway CRDs ---
echo "📦 Step 2: Installing KGateway CRDs (${KGATEWAY_VERSION})..."
helm upgrade -i --create-namespace \
  --namespace "${KGATEWAY_NAMESPACE}" \
  kgateway-crds \
  oci://cr.kgateway.dev/kgateway-dev/charts/kgateway-crds \
  --version "${KGATEWAY_VERSION}"
echo "✅ KGateway CRDs installed."
echo ""

# --- Step 3: Install KGateway Control Plane ---
echo "🛸 Step 3: Installing KGateway Control Plane (${KGATEWAY_VERSION})..."
helm upgrade -i \
  --namespace "${KGATEWAY_NAMESPACE}" \
  kgateway \
  oci://cr.kgateway.dev/kgateway-dev/charts/kgateway \
  --version "${KGATEWAY_VERSION}"
echo "✅ KGateway control plane installed."
echo ""

# --- Step 4: Wait for KGateway Control Plane Readiness ---
# Critical: Must wait for validating webhooks to be online before applying
# Gateway resources, otherwise the Gateway resource will be rejected by k8s.
echo "⏳ Step 4: Waiting for KGateway control plane to be fully ready..."
kubectl wait --for=condition=Available \
  deployment/kgateway \
  -n "${KGATEWAY_NAMESPACE}" \
  --timeout=120s
echo "✅ KGateway control plane is ready."
echo ""

# --- Step 4.5: Install External Secrets Operator (ESO) ---
# Required before deploying CareSync because the Helm chart contains ClusterSecretStore resources
echo "🔐 Step 4.5: Installing External Secrets Operator..."
helm repo add external-secrets https://charts.external-secrets.io || true
helm upgrade -i external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --wait
echo "⏳ Waiting for External Secrets Operator CRDs to register with API server..."
sleep 5
kubectl wait --for=condition=established crd/clustersecretstores.external-secrets.io --timeout=60s
kubectl wait --for=condition=established crd/externalsecrets.external-secrets.io --timeout=60s
echo "✅ External Secrets Operator installed and ready."
echo ""

# --- Step 5: Deploy CareSync Helm Chart ---
# This deploys: Namespace, GatewayClass, Gateway, HTTPRoutes, Services,
# Deployments, ServiceAccounts, ExternalSecrets, NetworkPolicies, HPAs.
# KGateway detects the Gateway resource and dynamically provisions the proxy.
echo "⛵ Step 5: Deploying CareSync Helm Chart..."
if [ -d "helm" ]; then
  cd helm
elif [ ! -f "Chart.yaml" ]; then
  echo "❌ Could not find helm directory or Chart.yaml."
  exit 1
fi

helm upgrade --install caresync . \
  -f values.yaml \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  --wait \
  --timeout 5m
echo "✅ CareSync Helm chart deployed."
cd ..
echo ""

# --- Step 6: Wait for KGateway Proxy to be Provisioned ---
# KGateway dynamically creates a proxy Deployment and Service in the app
# namespace after it detects the Gateway resource. We wait for it here.
echo "🔍 Step 6: Waiting for KGateway to provision the proxy in ${NAMESPACE}..."
echo "    (KGateway creates the proxy service after detecting the Gateway resource)"

PROXY_SVC=""
for i in {1..30}; do
  # KGateway labels its proxy services with: gloo=kube-gateway
  PROXY_SVC=$(kubectl get svc -n "${NAMESPACE}" \
    -l "gloo=kube-gateway" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [ -n "${PROXY_SVC}" ]; then
    echo "✅ KGateway proxy service detected: ${PROXY_SVC}"
    break
  fi
  echo "    Waiting for proxy service... (${i}/30)"
  sleep 5
done

if [ -z "${PROXY_SVC}" ]; then
  echo ""
  echo "❌ ERROR: KGateway proxy service was not found in namespace '${NAMESPACE}' after 150 seconds."
  echo "    Troubleshooting steps:"
  echo "    1. Check KGateway control plane logs: kubectl logs -n ${KGATEWAY_NAMESPACE} -l app=kgateway"
  echo "    2. Check GatewayClass status: kubectl get gatewayclass"
  echo "    3. Check Gateway status: kubectl describe gateway caresync-gateway -n ${NAMESPACE}"
  exit 1
fi

# --- Step 7: Dynamically Discover Proxy Port ---
# We discover the exact HTTP port that KGateway chose for this proxy.
# This avoids hardcoding 8080 which may vary across KGateway versions.
echo ""
echo "🔎 Step 7: Dynamically discovering proxy HTTP port..."
PROXY_PORT=$(kubectl get svc -n "${NAMESPACE}" \
  -l "gloo=kube-gateway" \
  -o jsonpath='{.items[0].spec.ports[?(@.name=="http")].port}' 2>/dev/null || true)

# Fallback: if the port named "http" does not exist, pick the first port
if [ -z "${PROXY_PORT}" ]; then
  PROXY_PORT=$(kubectl get svc -n "${NAMESPACE}" \
    -l "gloo=kube-gateway" \
    -o jsonpath='{.items[0].spec.ports[0].port}' 2>/dev/null || true)
fi

if [ -z "${PROXY_PORT}" ]; then
  echo "❌ ERROR: Could not discover proxy port from service '${PROXY_SVC}'."
  echo "    Run: kubectl get svc ${PROXY_SVC} -n ${NAMESPACE} -o yaml"
  exit 1
fi

echo "✅ Discovered proxy service: ${PROXY_SVC}"
echo "✅ Discovered proxy port:    ${PROXY_PORT}"
echo ""

# --- Step 8: Generate and Apply the ALB Ingress Dynamically ---
# The Ingress is NOT defined in the Helm chart to prevent fragile coupling
# to KGateway's internal naming conventions. We generate it here using the
# exact, real-time discovered service name and port.
echo "🌐 Step 8: Generating and applying ALB Ingress..."
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: caresync-alb-ingress
  namespace: ${NAMESPACE}
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /
    alb.ingress.kubernetes.io/healthcheck-port: "${PROXY_PORT}"
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${PROXY_SVC}
                port:
                  number: ${PROXY_PORT}
EOF

echo "✅ ALB Ingress applied (targeting ${PROXY_SVC}:${PROXY_PORT})."
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Complete!                         ║"
echo "║                                                  ║"
echo "║  ALB provisioning takes 2-5 minutes.            ║"
echo "║  Run ./scripts/03-validate.sh to check status.  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
