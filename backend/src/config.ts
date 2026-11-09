import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (16+ chars) in production');
  }
  // Dev only: random per-process secret (tokens reset on restart)
  console.warn('[config] JWT_SECRET not set — using a random development secret.');
  return crypto.randomBytes(32).toString('hex');
}

export const config = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: resolveJwtSecret(),
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Energy assumptions (overridable per request)
  tariffInrPerKwh: Number(process.env.TARIFF_INR_PER_KWH || 9),
  gridKgCo2PerKwh: Number(process.env.GRID_KG_CO2_PER_KWH || 0.72),
};
