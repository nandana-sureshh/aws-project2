/**
 * AWS Secrets Manager Integration
 *
 * Called ONCE at application startup (before prisma.$connect()).
 *
 * On AWS (AWS_SECRETS_MANAGER_SECRET_NAME is set):
 *   - Fetches DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
 *   - Injects them into process.env
 *   - Uses EC2 Instance Profile — no access keys needed
 *
 * Locally (AWS_SECRETS_MANAGER_SECRET_NAME not set):
 *   - No-op — .env values already loaded by dotenv
 *   - Local development workflow is completely unchanged
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';

interface AppSecrets {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
}

let secretsLoaded = false;

export async function initSecrets(): Promise<void> {
  const secretName = process.env.AWS_SECRETS_MANAGER_SECRET_NAME;

  if (!secretName) {
    console.log('ℹ️  Secrets Manager not configured — using local .env values');
    return;
  }

  if (secretsLoaded) {
    return;
  }

  const region = process.env.AWS_REGION ?? 'us-east-1';
  console.log(`🔐 Fetching secrets from AWS Secrets Manager: ${secretName} (${region})`);

  const client = new SecretsManagerClient({ region });

  let response: GetSecretValueCommandOutput;
  try {
    response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
  } catch (err) {
    const msg =
      `Failed to retrieve secrets from Secrets Manager (${secretName}). ` +
      'Verify the EC2 instance profile has secretsmanager:GetSecretValue permission ' +
      'and the secret exists in the correct region.';
    console.error('❌', msg, err);
    throw new Error(msg);
  }

  if (!response.SecretString) {
    throw new Error(
      `Secret "${secretName}" has no value. ` +
      'Add values via AWS Console → Secrets Manager → Edit secret. ' +
      'Required keys: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET'
    );
  }

  let secrets: AppSecrets;
  try {
    secrets = JSON.parse(response.SecretString) as AppSecrets;
  } catch {
    throw new Error(
      `Secret "${secretName}" is not valid JSON. ` +
      'Expected: {"DATABASE_URL":"...","JWT_SECRET":"...","JWT_REFRESH_SECRET":"..."}'
    );
  }

  const required: (keyof AppSecrets)[] = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  for (const key of required) {
    if (!secrets[key]) {
      throw new Error(
        `Secret "${secretName}" is missing required field: "${key}". ` +
        'Add it via AWS Console → Secrets Manager → Edit secret.'
      );
    }
  }

  process.env.DATABASE_URL = secrets.DATABASE_URL;
  process.env.JWT_SECRET = secrets.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = secrets.JWT_REFRESH_SECRET;

  secretsLoaded = true;
  console.log('✅ Secrets loaded from AWS Secrets Manager');
}
