import { z } from 'zod';

const buildFallbacks = {
  JWT_SECRET: 'development_jwt_secret_for_build_only_change_in_production',
  STUDIO_SYNC_SECRET: 'development_studio_sync_secret_for_build_only_change_in_production',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
} as const;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET phải có ít nhất 32 ký tự').default(buildFallbacks.JWT_SECRET),
  STUDIO_SYNC_SECRET: z.string().trim().min(32, 'STUDIO_SYNC_SECRET phải có ít nhất 32 ký tự').default(buildFallbacks.STUDIO_SYNC_SECRET),
  NEXT_PUBLIC_APP_URL: z.string().trim().url('NEXT_PUBLIC_APP_URL phải là URL hợp lệ').default(buildFallbacks.NEXT_PUBLIC_APP_URL),
  DATABASE_URL: z.string().trim().url('DATABASE_URL phải là URL hợp lệ').optional().or(z.literal('')).default(''),
  DIRECT_URL: z.string().trim().url('DIRECT_URL phải là URL hợp lệ').optional().or(z.literal('')).default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined> = process.env): AppEnv {
  const normalizedEnv = {
    ...rawEnv,
    JWT_SECRET: rawEnv.JWT_SECRET ?? buildFallbacks.JWT_SECRET,
    STUDIO_SYNC_SECRET: rawEnv.STUDIO_SYNC_SECRET ?? buildFallbacks.STUDIO_SYNC_SECRET,
    NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL ?? buildFallbacks.NEXT_PUBLIC_APP_URL,
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
export const runtimeEnv = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PATH: process.env.PATH ?? '',
};
