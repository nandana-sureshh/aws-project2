import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSecrets, prisma, globalErrorHandler, notFoundHandler } from '@caresync/shared';
import { handleSummarize } from './controllers/ai.controller';
import { startSqsWorker } from './workers/sqs.worker';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'ai-service',
    timestamp: new Date().toISOString(),
  });
});

app.post('/internal/summarize', handleSummarize);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = parseInt(process.env.PORT ?? '3006');

async function start() {
  try {
    await initSecrets();
    await prisma.$connect();
    console.log('✅ [ai-service] Database connected');
    
    startSqsWorker();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [ai-service] Running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('❌ [ai-service] Failed to start:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
