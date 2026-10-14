import crypto from 'crypto';
import { z } from 'zod';

const buildFallbacks = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  DATABASE_URL: '',
  DIRECT_URL: '',
} as const;

function buildDevelopmentSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function resolveRequiredSecret(
  rawValue: string | undefined,
  key: 'JWT_SECRET' | 'STUDIO_SYNC_SECRET',
  nodeEnv: 'development' | 'test' | 'production'
): string {
  const trimmed = rawValue?.trim();

  if (trimmed && trimmed.length >= 32) {
    return trimmed;
  }

  if (nodeEnv === 'production') {
    throw new Error(`Missing required environment variable: ${key}. Set it in .env.local or your deployment platform.`);
  }

  return buildDevelopmentSecret();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET phải có ít nhất 32 ký tự'),
  STUDIO_SYNC_SECRET: z.string().trim().min(32, 'STUDIO_SYNC_SECRET phải có ít nhất 32 ký tự'),
  NEXT_PUBLIC_APP_URL: z.string().trim().url('NEXT_PUBLIC_APP_URL phải là URL hợp lệ').default(buildFallbacks.NEXT_PUBLIC_APP_URL),
  DATABASE_URL: z.string().trim().url('DATABASE_URL phải là URL hợp lệ').optional().or(z.literal('')).default(''),
  DIRECT_URL: z.string().trim().url('DIRECT_URL phải là URL hợp lệ').optional().or(z.literal('')).default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined> = process.env): AppEnv {
  const nodeEnv = (rawEnv.NODE_ENV ?? 'development') as AppEnv['NODE_ENV'];

  const normalizedEnv = {
    ...rawEnv,
    NODE_ENV: nodeEnv,
    JWT_SECRET: resolveRequiredSecret(rawEnv.JWT_SECRET, 'JWT_SECRET', nodeEnv),
    STUDIO_SYNC_SECRET: resolveRequiredSecret(rawEnv.STUDIO_SYNC_SECRET, 'STUDIO_SYNC_SECRET', nodeEnv),
    NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL ?? buildFallbacks.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: rawEnv.DATABASE_URL ?? buildFallbacks.DATABASE_URL,
    DIRECT_URL: rawEnv.DIRECT_URL ?? buildFallbacks.DIRECT_URL,
  };

  const parsed = envSchema.safeParse(normalizedEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = parseEnv();
export const hasDatabaseConfig = Boolean(env.DATABASE_URL?.trim());
export const runtimeEnv = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PATH: process.env.PATH ?? '',
};
