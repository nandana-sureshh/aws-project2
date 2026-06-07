import 'dotenv/config';
import { initSecrets } from './config/secrets';
import app from './app';
import prisma from './config/database';

const PORT = parseInt(process.env.PORT ?? '3000');
const HOST = process.env.HOST ?? '0.0.0.0';

async function start() {
  try {
    // --- Step 1: Load secrets from AWS Secrets Manager (if configured) ---
    // On AWS: reads DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET from Secrets Manager
    // Locally: skips and uses .env values — no change to local dev workflow
    await initSecrets();

    // --- Step 2: Connect to database (DATABASE_URL now set correctly) ---
    await prisma.$connect();
    console.log('✅ Database connected');

    // --- Step 3: Start HTTP server ---
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 CareSync API running at http://${HOST}:${PORT}`);
      console.log(`📖 Swagger UI:   http://localhost:${PORT}/api/docs`);
      console.log(`📋 OpenAPI JSON: http://localhost:${PORT}/api/docs-json`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
