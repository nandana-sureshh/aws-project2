import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { initSecrets, prisma, globalErrorHandler, notFoundHandler } from '@caresync/shared';
import notificationRoutes from './routes/notification.routes';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(compression() as any);
app.use(cookieParser());
app.use(express.json());
app.use(morgan('combined'));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/notifications', notificationRoutes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = parseInt(process.env.PORT ?? '3005');

async function start() {
  try {
    await initSecrets();
    await prisma.$connect();
    console.log('✅ [notification-service] Database connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [notification-service] Running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('❌ [notification-service] Failed to start:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
