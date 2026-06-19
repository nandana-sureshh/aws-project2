#!/bin/bash
set -e

echo "⛵ Deploying CareSync Helm Chart..."

# Ensure we are in root dir or helm dir
if [ -d "helm" ]; then
  cd helm
elif [ -f "Chart.yaml" ]; then
  # Already in helm dir
  :
else
  echo "❌ Could not find helm directory."
  exit 1
fi

echo "🔧 Installing Gateway API CRDs..."
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml || true

echo "📦 Upgrading/Installing Helm Release..."
helm upgrade --install caresync . -f values.yaml -f values-dev.yaml --namespace caresync-dev --create-namespace

echo "🎉 Helm deployment initiated!"
