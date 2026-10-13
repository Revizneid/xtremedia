import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET phải có ít nhất 32 ký tự'),
  STUDIO_SYNC_SECRET: z.string().trim().min(32, 'STUDIO_SYNC_SECRET phải có ít nhất 32 ký tự'),
  NEXT_PUBLIC_APP_URL: z.string().trim().url('NEXT_PUBLIC_APP_URL phải là URL hợp lệ'),
  DATABASE_URL: z.string().trim().url('DATABASE_URL phải là URL hợp lệ').optional().or(z.literal('')),
  DIRECT_URL: z.string().trim().url('DIRECT_URL phải là URL hợp lệ').optional().or(z.literal('')),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined> = process.env): AppEnv {
  const parsed = envSchema.safeParse(rawEnv);

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
