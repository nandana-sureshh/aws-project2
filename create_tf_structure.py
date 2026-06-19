import os

base_dir = "terraform"

directories = [
    "environments/dev",
    "environments/prod",
    "modules/vpc",
    "modules/security-groups",
    "modules/kms",
    "modules/eks",
    "modules/ecr",
    "modules/iam-irsa/policies",
    "modules/s3",
    "modules/sqs",
    "modules/rds",
    "modules/secrets-manager",
    "modules/cloudwatch",
    "modules/ses",
    "modules/lambda/src",
]

for d in directories:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

print("Terraform directory structure created.")
