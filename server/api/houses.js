// server/api/houses.js - houses CRUD

import { Router } from 'express';
import { readSheet, updateRow, appendRow, getUserName } from '../sheets.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/houses - all houses
router.get('/', requireAuth, async (req, res) => {
  try {
    const houses = await readSheet('houses');
    const userPhone = req.user.phone;

    const requests = await readSheet('requests');
    const approvedHouseIds = new Set(
      requests
        .filter(r => r.guest_phone === userPhone && r.status === 'approved')
        .map(r => r.house_id)
    );

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
        price: h.price || 0,
        price_note: h.price_note || '',
        is_approved: isApproved
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get houses error:', err);
    res.status(500).json({ error: 'שגיאה בטעינת הבתים' });
  }
});

// POST /api/houses - add a new house
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, address, lat, lng, bedrooms, beds, max_kids, garden, stairs, crib, mamad, note, price, price_note } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'שם וכתובת הם שדות חובה' });
    }

    const houses = await readSheet('houses');
    const newId = houses.length > 0 ? Math.max(...houses.map(h => h.id || 0)) + 1 : 1;

    await appendRow('houses', [
      newId,
      req.user.phone,
      name,
      address,
      lat || 0,
      lng || 0,
      bedrooms || 1,
      beds || 1,
      max_kids || 0,
      garden ? 'TRUE' : 'FALSE',
      stairs ? 'TRUE' : 'FALSE',
      crib ? 'TRUE' : 'FALSE',
      mamad ? 'TRUE' : 'FALSE',
      '', // photos
      'FALSE', // is_available
      note || '',
      price || 0,
      price_note || ''
    ]);

    res.json({ id: newId, message: 'הבית נוסף בהצלחה' });
  } catch (err) {
    console.error('Add house error:', err);
    res.status(500).json({ error: 'שגיאה בהוספת הבית' });
  }
});

// PUT /api/houses/:id - update house details (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const houseId = Number(req.params.id);
    const houses = await readSheet('houses');
    const house = houses.find(h => h.id === houseId);

    if (!house) {
      return res.status(404).json({ error: 'בית לא נמצא' });
    }
    if (house.owner_phone !== req.user.phone) {
      return res.status(403).json({ error: 'רק בעלת הבית יכולה לערוך' });
    }

    const { name, address, lat, lng, bedrooms, beds, max_kids, garden, stairs, crib, mamad, note, price, price_note } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (lat !== undefined) updates.lat = lat;
    if (lng !== undefined) updates.lng = lng;
    if (bedrooms !== undefined) updates.bedrooms = bedrooms;
    if (beds !== undefined) updates.beds = beds;
    if (max_kids !== undefined) updates.max_kids = max_kids;
    if (garden !== undefined) updates.garden = garden;
    if (stairs !== undefined) updates.stairs = stairs;
    if (crib !== undefined) updates.crib = crib;
    if (mamad !== undefined) updates.mamad = mamad;
    if (note !== undefined) updates.note = note;
    if (price !== undefined) updates.price = price;
    if (price_note !== undefined) updates.price_note = price_note;

    await updateRow('houses', 'id', houseId, updates);
    res.json({ id: houseId, message: 'הבית עודכן' });
  } catch (err) {
    console.error('Update house error:', err);
    res.status(500).json({ error: 'שגיאה בעדכון הבית' });
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
