// server/api/requests.js - hosting request management

import { Router } from 'express';
import { readSheet, appendRow, updateRow } from '../sheets.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/requests - my requests (sent + received)
router.get('/', requireAuth, async (req, res) => {
  try {
    const allRequests = await readSheet('requests');
    const houses = await readSheet('houses');
    const userPhone = req.user.phone;

    // Requests I sent
    const sent = allRequests
      .filter(r => r.guest_phone === userPhone)
      .map(r => {
        const house = houses.find(h => h.id === r.house_id);
        return { ...r, house_name: house?.name || '?', type: 'sent' };
      });

    // Requests I received (for my houses)
    const myHouseIds = houses.filter(h => h.owner_phone === userPhone).map(h => h.id);
    const received = allRequests
      .filter(r => myHouseIds.includes(r.house_id))
      .map(r => {
        const house = houses.find(h => h.id === r.house_id);
        return { ...r, house_name: house?.name || '?', type: 'received' };
      });

    res.json({ sent, received });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'שגיאה בטעינת בקשות' });
  }
});

// POST /api/requests - send a hosting request
router.post('/', requireAuth, async (req, res) => {
  try {
    const { house_id } = req.body;
    const userPhone = req.user.phone;

    const houses = await readSheet('houses');
    const house = houses.find(h => h.id === Number(house_id));

    if (!house) {
      return res.status(404).json({ error: 'בית לא נמצא' });
    }

    if (!house.is_available) {
      return res.status(400).json({ error: 'הבית לא פנוי השבוע' });
    }

    if (house.owner_phone === userPhone) {
      return res.status(400).json({ error: 'לא ניתן לשלוח בקשה לבית שלך' });
    }

    // Check for existing pending request
    const requests = await readSheet('requests');
    const existing = requests.find(
      r => r.house_id === Number(house_id) && r.guest_phone === userPhone && r.status === 'pending'
    );
    if (existing) {
      return res.status(400).json({ error: 'כבר שלחת בקשה לבית הזה' });
    }

    const newId = requests.length > 0 ? Math.max(...requests.map(r => r.id || 0)) + 1 : 1;
    const now = new Date().toISOString().split('T')[0];

    await appendRow('requests', [newId, Number(house_id), userPhone, 'pending', now, '']);

    res.json({
      id: newId,
      house_id: Number(house_id),
      status: 'pending',
      house_name: house.name,
      owner_name: req.user.name
    });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'שגיאה בשליחת בקשה' });
  }
});

// PATCH /api/requests/:id - approve or reject (house owner only)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'סטטוס לא תקין' });
    }

    const requests = await readSheet('requests');
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ error: 'בקשה לא נמצאה' });
    }

    // Verify the current user owns the house
    const houses = await readSheet('houses');
    const house = houses.find(h => h.id === request.house_id);
    if (!house || house.owner_phone !== req.user.phone) {
      return res.status(403).json({ error: 'רק בעלת הבית יכולה לאשר/לדחות' });
    }

    const updates = { status };
    if (status === 'approved') {
      updates.approved_at = new Date().toISOString().split('T')[0];
    }

    await updateRow('requests', 'id', requestId, updates);

    res.json({ id: requestId, status });
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'שגיאה בעדכון בקשה' });
  }
});

export default router;
