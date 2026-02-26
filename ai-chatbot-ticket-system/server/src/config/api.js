import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

// export const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL || 'http://127.0.0.1:8000';
export const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL;

// export const WEB_APP_BASE_URL = process.env.WEB_APP_BASE_URL || 'http://localhost:5173';
export const WEB_APP_BASE_URL = process.env.WEB_APP_BASE_URL;
