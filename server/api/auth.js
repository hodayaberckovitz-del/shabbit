// server/api/auth.js - authentication routes

import { Router } from 'express';
import crypto from 'crypto';
import { getSetting, readSheet, appendRow, updateRow } from '../sheets.js';

const router = Router();

// In-memory session store
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
      // New user - register as pending approval
      await appendRow('users', [phone, name, new Date().toISOString().split('T')[0], 'FALSE', 'FALSE']);
      return res.status(403).json({
        error: 'pending_approval',
        message: 'הבקשה נשלחה! המנהלת תאשר אותך בקרוב'
      });
    }

    // Existing user - check if approved
    if (!existing.approved) {
      return res.status(403).json({
        error: 'pending_approval',
        message: 'הבקשה שלך עדיין ממתינה לאישור המנהלת'
      });
    }

    // Approved user - create session
    const token = crypto.randomUUID();
    const isAdmin = existing.is_admin === true || existing.is_admin === 'TRUE';
    sessions.set(token, { phone, name: existing.name, is_admin: isAdmin });

    res.json({
      token,
      user: {
        phone,
        name: existing.name,
        is_admin: isAdmin
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'לא מחובר' });
  }
  res.json(sessions.get(token));
});

// GET /api/auth/pending - list pending users (admin only)
router.get('/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await readSheet('users');
    const pending = users.filter(u => !u.approved && !u.is_admin);
    res.json(pending);
  } catch (err) {
    console.error('Pending users error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/auth/users - list all users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await readSheet('users');
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// PATCH /api/auth/approve/:phone - approve a user (admin only)
router.patch('/approve/:phone', requireAuth, requireAdmin, async (req, res) => {
  try {
    const phone = req.params.phone;
    const updated = await updateRow('users', 'phone', phone, { approved: true });
    if (!updated) {
      return res.status(404).json({ error: 'משתמשת לא נמצאה' });
    }
    res.json({ message: 'המשתמשת אושרה', phone });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// DELETE /api/auth/reject/:phone - reject/remove a user (admin only)
router.delete('/reject/:phone', requireAuth, requireAdmin, async (req, res) => {
  try {
    const phone = req.params.phone;
    const users = await readSheet('users');
    const user = users.find(u => u.phone === phone);
    if (!user) {
      return res.status(404).json({ error: 'משתמשת לא נמצאה' });
    }
    if (user.is_admin) {
      return res.status(400).json({ error: 'לא ניתן להסיר מנהלת' });
    }
    // Mark as rejected by setting approved to 'rejected'
    await updateRow('users', 'phone', phone, { approved: 'rejected' });
    res.json({ message: 'המשתמשת נדחתה', phone });
  } catch (err) {
    console.error('Reject user error:', err);
    res.status(500).json({ error: 'שגיאת שרת' });
  }
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

// Middleware for admin-only routes
export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'גישה למנהלות בלבד' });
  }
  next();
}

export default router;
