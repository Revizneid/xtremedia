const fs = require('fs');
const path = require('path');

const requiredSecretKeys = ['JWT_SECRET', 'STUDIO_SYNC_SECRET'];
const requiredUrlKeys = ['NEXT_PUBLIC_APP_URL'];
const filePath = path.resolve(__dirname, '..', '.env.local');
const envFileExists = fs.existsSync(filePath);

const missingSecrets = requiredSecretKeys.filter((key) => !process.env[key] || process.env[key].trim().length < 32);
const missingUrls = requiredUrlKeys.filter((key) => !process.env[key] || !process.env[key].trim());
const invalidUrls = ['NEXT_PUBLIC_APP_URL', 'DATABASE_URL', 'DIRECT_URL']
  .filter((key) => process.env[key] && process.env[key].trim())
  .filter((key) => {
    try {
      new URL(process.env[key]);
      return false;
    } catch {
      return true;
    }
  });

if (missingSecrets.length > 0 || missingUrls.length > 0 || invalidUrls.length > 0) {
  const issues = [...missingSecrets, ...missingUrls, ...invalidUrls].join(', ');
  console.error('[deploy-check] Missing or invalid production env values:', issues);
  if (!envFileExists) {
    console.error('[deploy-check] Add a real .env.local based on .env.example before deploying.');
  }
  process.exit(1);
}

console.log('[deploy-check] Production environment looks ready.');
console.log(`[deploy-check] Detected secrets: ${requiredSecretKeys.map((key) => `${key}=set`).join(', ')}`);
