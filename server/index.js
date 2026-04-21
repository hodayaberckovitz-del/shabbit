// server/index.js - Shabbit main server

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { IS_DEMO } from './sheets.js';
import authRoutes from './api/auth.js';
import housesRoutes from './api/houses.js';
import requestsRoutes from './api/requests.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', demo: IS_DEMO });
});

app.use('/api/auth', authRoutes);
app.use('/api/houses', housesRoutes);
app.use('/api/requests', requestsRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  shabbit running on http://localhost:${PORT}`);
  if (IS_DEMO) {
    console.log('  MODE: demo (in-memory data, no Google Sheets)');
    console.log('  CODE: SHAB2026\n');
  } else {
    console.log('  MODE: production (Google Sheets)\n');
  }
});
