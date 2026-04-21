// server/api/houses.js - houses CRUD

import { Router } from 'express';
import { readSheet, updateRow, getUserName } from '../sheets.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/houses - all houses (without full address for non-owners)
router.get('/', requireAuth, async (req, res) => {
  try {
    const houses = await readSheet('houses');
    const userPhone = req.user.phone;

    // Get approved request house IDs for this user
    const requests = await readSheet('requests');
    const approvedHouseIds = new Set(
      requests
        .filter(r => r.guest_phone === userPhone && r.status === 'approved')
        .map(r => r.house_id)
    );

    // Build response - hide sensitive info unless owner or approved
    const result = await Promise.all(houses.map(async (h) => {
      const isMine = h.owner_phone === userPhone;
      const isApproved = approvedHouseIds.has(h.id);
      const ownerName = await getUserName(h.owner_phone);

      return {
        id: h.id,
        name: h.name,
        owner_name: ownerName || 'חברה',
        is_mine: isMine,
        city: h.address?.split(',').pop()?.trim() || '',
        // Full address + phone only if owner or approved
        address: (isMine || isApproved) ? h.address : null,
        owner_phone: (isMine || isApproved) ? h.owner_phone : null,
        lat: h.lat,
        lng: h.lng,
        bedrooms: h.bedrooms,
        beds: h.beds,
        max_kids: h.max_kids,
        garden: h.garden,
        stairs: h.stairs,
        crib: h.crib,
        mamad: h.mamad,
        photos: h.photos ? h.photos.split(',').filter(Boolean) : [],
        is_available: h.is_available,
        note: h.note || '',
        is_approved: isApproved
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get houses error:', err);
    res.status(500).json({ error: 'שגיאה בטעינת הבתים' });
  }
});

// PATCH /api/houses/:id/availability - toggle availability (owner only)
router.patch('/:id/availability', requireAuth, async (req, res) => {
  try {
    const houseId = Number(req.params.id);
    const houses = await readSheet('houses');
    const house = houses.find(h => h.id === houseId);

    if (!house) {
      return res.status(404).json({ error: 'בית לא נמצא' });
    }

    if (house.owner_phone !== req.user.phone) {
      return res.status(403).json({ error: 'רק בעלת הבית יכולה לשנות' });
    }

    const newAvailability = !house.is_available;
    await updateRow('houses', 'id', houseId, { is_available: newAvailability });

    res.json({ id: houseId, is_available: newAvailability });
  } catch (err) {
    console.error('Toggle availability error:', err);
    res.status(500).json({ error: 'שגיאה בעדכון' });
  }
});

export default router;
