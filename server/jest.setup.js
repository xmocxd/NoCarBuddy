import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root .env (npm test runs with cwd = server/)
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
