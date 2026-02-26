import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_ERROR_MESSAGE } from '../constants/controllerMessages.js';
import { protect } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, '../data/files/ticket-classifier.csv');

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const idxTags = headers.findIndex(h => /tags/i.test(h));
  const idxConcern = headers.findIndex(h => /concern/i.test(h));
  const idxEmail = headers.findIndex(h => /email/i.test(h));
  const out = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = lines[i];
    const cols = row.split(',').map(c => c.trim());
    const tag = idxTags >= 0 ? cols[idxTags] : '';
    const concern = idxConcern >= 0 ? cols[idxConcern] : '';
    const email = idxEmail >= 0 ? cols[idxEmail] : '';
    if (!tag && !concern) continue;
    out.push({ tag, concern, email });
  }
  return out;
}

export const getTicketConcerns = async (req, res) => {
  try {
    const raw = fs.readFileSync(CSV_PATH, 'utf-8');
    const entries = parseCsv(raw);
    const unique = [];
    const seen = new Set();
    for (const e of entries) {
      const key = `${e.tag}|${e.concern}|${e.email}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(e);
    }
    res.json({ success: true, data: unique });
  } catch (error) {
    console.error('Failed to read ticket-classifier.csv:', error);
    res.status(500).json({ success: false, message: SERVER_ERROR_MESSAGE });
  }
};
