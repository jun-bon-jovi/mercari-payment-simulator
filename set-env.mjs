import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

// biome-ignore lint/complexity/useLiteralKeys: ok
const token = process.env['token'];
if (!token) throw new Error('token is empty');

const hashed_token = createHash('sha256').update(token).digest('hex').toLowerCase();

const environment_path = join('src', 'environments', 'environment.prod.ts');

const content = `
export const ENV = {
  hashed_token: '${hashed_token}',
} as const;
`;

writeFileSync(environment_path, content);
console.log(`Environment file generated.`);
