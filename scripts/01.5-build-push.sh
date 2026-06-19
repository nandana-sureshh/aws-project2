#!/bin/bash
set -e

# Dynamically fetch AWS Region and Account ID
REGION=$(aws configure get region || echo "us-east-1")
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "☁️  AWS Account ID: $AWS_ACCOUNT_ID"
echo "🌍 AWS Region: $REGION"
echo "🐳 ECR Registry: $ECR_REGISTRY"

echo "🔐 Logging into Amazon ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Define the microservices to build
SERVICES=(
  "auth-service:backend/services/auth-service"
  "user-service:backend/services/user-service"
  "appointment-service:backend/services/appointment-service"
  "document-service:backend/services/document-service"
  "notification-service:backend/services/notification-service"
  "ai-service:backend/services/ai-service"
  "frontend:frontend"
)

echo "🛠️  Building and pushing Docker images..."

for service_entry in "${SERVICES[@]}"; do
  # Split the string into SERVICE_NAME and BUILD_DIR
  SERVICE_NAME="${service_entry%%:*}"
  BUILD_DIR="${service_entry##*:}"
  
  REPO_NAME="caresync/$SERVICE_NAME"
  IMAGE_URI="${ECR_REGISTRY}/${REPO_NAME}:latest"
  
  echo "--------------------------------------------------------"
  echo "🚀 Processing $SERVICE_NAME"
  echo "📂 Build directory: $BUILD_DIR"
  echo "🏷️  Image URI: $IMAGE_URI"
  
  if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Directory $BUILD_DIR does not exist!"
    exit 1
  fi
  
  echo "⏳ Building image..."
  docker build -t "$IMAGE_URI" -f "${BUILD_DIR}/Dockerfile" "${BUILD_DIR}"
  
  echo "⬆️  Pushing image to ECR..."
  docker push "$IMAGE_URI"
  
  echo "✅ Successfully pushed $SERVICE_NAME"
done

echo "🎉 All images successfully built and pushed to ECR!"
