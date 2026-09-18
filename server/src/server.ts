import http from 'http';
import { app } from './app';
import { logger } from './config/logger';
import { disconnectPrisma } from './config/prisma';
import { queueService } from './services/queue/queue.service';
import { redisClient } from './config/redis';

const PORT = process.env.PORT || 5000;
export const server = http.createServer(app);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`🚀 OmniEdu Enterprise Server active on http://localhost:${PORT}`);
    logger.info(`📡 Health probe available at http://localhost:${PORT}/health/live`);
    logger.info(`📊 Prometheus metrics available at http://localhost:${PORT}/metrics`);
  });
}

/**
 * Production-Grade Zero-Drop Graceful Shutdown Protocol:
 * 1. Stop accepting new inbound HTTP requests
 * 2. Drain and finish in-flight background queue jobs
 * 3. Disconnect Redis client cleanly
 * 4. Disconnect Prisma PostgreSQL connection pool
 * 5. Terminate cleanly with code 0 (or force-kill on 10s timeout)
 */
export async function performGracefulShutdown(signal: string, isTest = false): Promise<void> {
  logger.info({ signal }, `Graceful shutdown initiated by ${signal}. Draining in-flight work...`);

  // 1. Close HTTP Server
  await new Promise<void>((resolve) => {
    server.close((err) => {
      if (err) {
        logger.warn({ error: err.message }, 'Error closing HTTP server');
      } else {
        logger.info('HTTP server closed. Inbound traffic halted.');
      }
      resolve();
    });
  });

  // 2. Drain Background Queue Workers
  try {
    await queueService.drainAndStop(4000);
    logger.info('Background queue drained.');
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Error draining queue service');
  }

  // 3. Disconnect Redis
  try {
    await redisClient.quit();
    logger.info('Redis client disconnected.');
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Error closing Redis client');
  }

  // 4. Disconnect Prisma
  try {
    await disconnectPrisma();
    logger.info('Database connection pool disconnected.');
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Error disconnecting Prisma client');
  }

  logger.info('Graceful shutdown completed successfully.');

  if (!isTest && process.env.NODE_ENV !== 'test') {
    process.exit(0);
  }
}

// Attach OS Process Signals
if (process.env.NODE_ENV !== 'test') {
  let isShuttingDown = false;

  const handleSignal = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    // Safety timeout: force exit if dependencies hang
    setTimeout(() => {
      logger.error('Force shutdown timeout reached. Terminating process.');
      process.exit(1);
    }, 10000).unref();

    performGracefulShutdown(signal).catch((err) => {
      logger.error({ error: err.message }, 'Fatal error during shutdown');
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
}
