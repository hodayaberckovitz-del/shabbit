// server/api/auth.js - authentication routes

import { Router } from 'express';
import crypto from 'crypto';
import { getSetting, readSheet, appendRow } from '../sheets.js';

const router = Router();

// In-memory session store (in production, use Redis or DB)
const sessions = new Map();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { code, name, phone } = req.body;

    if (!code || !name || !phone) {
      return res.status(400).json({ error: 'נא למלא את כל השדות' });
    }

    // Verify access code
    const accessCode = await getSetting('access_code');
    if (code !== accessCode) {
      return res.status(401).json({ error: 'קוד כניסה שגוי' });
    }

    // Check if user exists
    const users = await readSheet('users');
    const existing = users.find(u => u.phone === phone);

    if (!existing) {
      // Add new user
      await appendRow('users', [phone, name, new Date().toISOString().split('T')[0], 'FALSE']);
    }

    // Create session token
    const token = crypto.randomUUID();
    const isAdmin = existing?.is_admin === true || existing?.is_admin === 'TRUE';
    sessions.set(token, { phone, name: existing?.name || name, is_admin: isAdmin });

    res.json({
      token,
      user: {
        phone,
        name: existing?.name || name,
        is_admin: isAdmin
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/auth/me - verify token and get user info
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'לא מחובר' });
  }
  res.json(sessions.get(token));
});

// Middleware to protect routes
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }
  req.user = sessions.get(token);
  next();
}

export default router;
