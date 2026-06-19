#!/bin/bash
set -e

echo "🚀 Installing ArgoCD on CareSync EKS Cluster"

echo "📦 Creating argocd namespace..."
kubectl create namespace argocd || true

echo "📥 Applying ArgoCD manifests..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "⏳ Waiting for ArgoCD server to be ready..."
kubectl rollout status deployment/argocd-server -n argocd --timeout=300s

echo "🔐 Retrieving initial ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "--------------------------------------------------------"
echo "✅ ArgoCD successfully installed!"
echo "👤 Username: admin"
echo "🔑 Password: $ARGOCD_PASSWORD"
echo "--------------------------------------------------------"
echo "ℹ️  To access the ArgoCD UI locally, run:"
echo "   kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "   Then open https://localhost:8080 in your browser."

echo "--------------------------------------------------------"
echo "⛵ Applying CareSync GitOps Application..."
kubectl apply -f gitops/apps/caresync-dev.yaml

echo "🎉 GitOps sync initiated! ArgoCD will now continuously monitor and deploy the helm chart."
