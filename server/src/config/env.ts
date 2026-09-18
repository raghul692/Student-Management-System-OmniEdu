import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables before validation
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // JWT & Security Secrets
  JWT_ACCESS_SECRET: z.string().default('omniedu_dev_access_secret_super_key_2026'),
  JWT_REFRESH_SECRET: z.string().default('omniedu_dev_refresh_secret_super_key_2026'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  HALL_TICKET_SECRET: z.string().optional(),

  // Redis & Queue Config
  REDIS_URL: z.string().optional(),

  // Storage Config
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().default('omniedu-storage'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_SIGNING_SECRET: z.string().default('omniedu_dev_storage_secret_key_2026'),

  // Email Config
  EMAIL_PROVIDER: z.enum(['logger', 'smtp']).default('logger'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('OmniEdu <no-reply@omniedu.com>'),

  // Rate Limiting & Performance
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Phase G: Production Database Connection Pooling & Sizing
  DB_POOL_MIN: z.coerce.number().default(2),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_TIMEOUT_MS: z.coerce.number().default(15000),

  // Phase G: Observability & Telemetry Flags
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_TRACING: z.coerce.boolean().default(true),

  // Phase F: AI Platform Config
  AI_PROVIDER: z.enum(['gemini', 'openai', 'local']).default('local'),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  AI_MAX_TOKENS_PER_ORG: z.coerce.number().default(500000),
});

export function validateEnvironment(customEnv?: Record<string, any>) {
  const envSource = customEnv || process.env;
  const parsed = envSchema.safeParse(envSource);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    if (envSource.NODE_ENV === 'production') {
      throw new Error(`Production environment configuration error: ${errorDetails}`);
    }
    // In dev/test fallback with minimal config to maintain continuity
    return envSchema.parse({
      ...envSource,
      DATABASE_URL: envSource.DATABASE_URL || 'postgresql://resumate:resumate_secret@127.0.0.1:5432/omniedu_db?schema=public',
    });
  }

  // Strict production assertions
  if (parsed.data.NODE_ENV === 'production') {
    if (parsed.data.JWT_ACCESS_SECRET.includes('dev_access_secret')) {
      throw new Error('Default development JWT_ACCESS_SECRET detected in production environment!');
    }
    if (parsed.data.JWT_REFRESH_SECRET.includes('dev_refresh_secret')) {
      throw new Error('Default development JWT_REFRESH_SECRET detected in production environment!');
    }
    if (parsed.data.CORS_ORIGIN.includes('*')) {
      throw new Error('Wildcard CORS_ORIGIN is prohibited in production environment!');
    }
  }

  return parsed.data;
}

let loadedEnv: z.infer<typeof envSchema>;
try {
  loadedEnv = validateEnvironment();
} catch (err: any) {
  if (process.env.NODE_ENV === 'production') {
    console.error(`❌ FATAL: ${err.message}`);
    process.exit(1);
  }
  loadedEnv = envSchema.parse({
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://resumate:resumate_secret@127.0.0.1:5432/omniedu_db?schema=public',
  });
}

export const env = loadedEnv;
export type Environment = z.infer<typeof envSchema>;
