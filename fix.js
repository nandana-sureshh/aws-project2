const fs = require('fs');
const path = require('path');

const replacements = {
    'resource "random_password" "db" { length = 16; special = false }': 'resource "random_password" "db" {\n  length = 16\n  special = false\n}',
    'output "db_password" { value = random_password.db.result; sensitive = true }': 'output "db_password" {\n  value = random_password.db.result\n  sensitive = true\n}',
    'egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }': 'egress {\n  from_port = 0\n  to_port = 0\n  protocol = "-1"\n  cidr_blocks = ["0.0.0.0/0"]\n}',
    'ingress { from_port = 0; to_port = 0; protocol = "-1"; self = true }': 'ingress {\n  from_port = 0\n  to_port = 0\n  protocol = "-1"\n  self = true\n}',
    'ingress { from_port = 0; to_port = 0; protocol = "-1"; security_groups = [aws_security_group.eks_cluster.id] }': 'ingress {\n  from_port = 0\n  to_port = 0\n  protocol = "-1"\n  security_groups = [aws_security_group.eks_cluster.id]\n}',
    'ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.eks_nodes.id] }': 'ingress {\n  from_port = 5432\n  to_port = 5432\n  protocol = "tcp"\n  security_groups = [aws_security_group.eks_nodes.id]\n}',
    'ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.lambda.id] }': 'ingress {\n  from_port = 5432\n  to_port = 5432\n  protocol = "tcp"\n  security_groups = [aws_security_group.lambda.id]\n}',
    'ingress { from_port = 22; to_port = 22; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }': 'ingress {\n  from_port = 22\n  to_port = 22\n  protocol = "tcp"\n  cidr_blocks = ["0.0.0.0/0"]\n}',
    'principals { type = "Federated", identifiers = [var.oidc_provider_arn] }': 'principals {\n  type = "Federated"\n  identifiers = [var.oidc_provider_arn]\n}',
    'condition {\n      test     = "StringEquals"\n      variable = "${replace(var.oidc_provider_url, "https://", "")}:sub"\n      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]\n    }': 'condition {\n      test     = "StringEquals"\n      variable = "${replace(var.oidc_provider_url, "https://", "")}:sub"\n      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]\n    }', // ALBC is fine
    'Condition = { StringEquals = { "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:caresync-dev:ai-service-sa" } }': 'Condition = { StringEquals = { "${replace(var.oidc_provider_url, "https://", "")}:sub" = "system:serviceaccount:caresync-dev:ai-service-sa" } }', // IAM policies as JSON strings are fine. Wait, looking at iam-irsa/main.tf line 475:
    'Principal = { Federated = var.oidc_provider_arn }': 'Principal = { Federated = var.oidc_provider_arn }',
    'Statement = [{ Action = "sts:AssumeRole", Principal = { Service = "lambda.amazonaws.com" }, Effect = "Allow" }]': 'Statement = [{\n  Action = "sts:AssumeRole"\n  Principal = { Service = "lambda.amazonaws.com" }\n  Effect = "Allow"\n}]',
    'principals { type = "Federated"; identifiers = [var.oidc_provider_arn] }': 'principals {\n  type = "Federated"\n  identifiers = [var.oidc_provider_arn]\n}'
};

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.tf')) results.push(file);
        }
    });
    return results;
}

const files = walk('terraform');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Exact string replacements
    for (const [k, v] of Object.entries(replacements)) {
        // Need to be careful with double quotes in k and content
        // Better to just replace via string literal
        while(content.indexOf(k) !== -1) {
            content = content.replace(k, v);
        }
    }

    // Also fixing iam-irsa/main.tf jsonencode blocks if any syntax issues
    // Wait, the error was: Invalid single-argument block definition on data "aws_iam_policy_document" "eso_assume"
    // `principals { type = "Federated", identifiers = [var.oidc_provider_arn] }`
    content = content.replace('principals { type = "Federated", identifiers = [var.oidc_provider_arn] }', 'principals {\n      type = "Federated"\n      identifiers = [var.oidc_provider_arn]\n    }');
    content = content.replace('principals { type = "Federated"; identifiers = [var.oidc_provider_arn] }', 'principals {\n      type = "Federated"\n      identifiers = [var.oidc_provider_arn]\n    }');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed ' + file);
    }
});

const kms_vars = 'terraform/modules/kms/variables.tf';
if (fs.existsSync(kms_vars)) {
    fs.unlinkSync(kms_vars);
    console.log('Removed stale kms/variables.tf');
}
