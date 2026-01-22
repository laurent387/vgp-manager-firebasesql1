import * as z from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000'),
  
  DB_HOST: z.string().optional().default(''),
  DB_PORT: z.string().default('3306'),
  DB_NAME: z.string().optional().default(''),
  DB_USER: z.string().optional().default(''),
  DB_PASSWORD: z.string().optional().default(''),
  DB_SSL: z.string().optional(),
  DB_CONNECTION_LIMIT: z.string().default('10'),
  
  RESEND_API_KEY: z.string().optional(),
  
  CORS_ORIGINS: z.string().default('*'),
  
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  API_VERSION: z.string().default('v1'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('[Config] Environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }
  }
  
  cachedEnv = result.data || (process.env as unknown as Env);
  return cachedEnv;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}
