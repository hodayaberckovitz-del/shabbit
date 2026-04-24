// server/sheets.js - Google Sheets connection + demo mode fallback

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const IS_DEMO = !SPREADSHEET_ID || SPREADSHEET_ID === 'your-sheet-id-here';

// ==================== Demo Mode Data ====================
const demoData = {
  settings: [
    { key: 'access_code', value: 'SHAB2026' },
    { key: 'admin_phone', value: '050-0000000' }
  ],
  users: [
    { phone: '050-0000000', name: 'הודיה', created_at: '2026-04-21', is_admin: true, approved: true }
  ],
  houses: [
    {
      id: 1, owner_phone: '050-0000000', name: 'הבית של הודיה',
      address: 'רחוב הרצל 42, ירושלים', lat: 31.7683, lng: 35.2137,
      bedrooms: 3, beds: 5, max_kids: 4,
      garden: true, stairs: false, crib: true, mamad: true,
      photos: '', is_available: false, note: 'הבית שלי', price: 0, price_note: ''
    },
    {
      id: 2, owner_phone: '050-0000000', name: 'בית הורי בנתניה',
      address: 'שדרות הים 15, נתניה', lat: 32.3215, lng: 34.8532,
      bedrooms: 4, beds: 7, max_kids: 5,
      garden: true, stairs: true, crib: true, mamad: false,
      photos: '', is_available: true, note: 'בית מקסים ליד הים', price: 0, price_note: ''
    },
    {
      id: 3, owner_phone: '052-1111111', name: 'דירה בלב תל אביב',
      address: 'רחוב דיזנגוף 88, תל אביב', lat: 32.0853, lng: 34.7818,
      bedrooms: 2, beds: 3, max_kids: 2,
      garden: false, stairs: true, crib: false, mamad: true,
      photos: '', is_available: true, note: 'דירה חמימה, קרובה לחופים', price: 50, price_note: 'חשמל בלבד'
    },
    {
      id: 4, owner_phone: '052-2222222', name: 'הבית בצפת',
      address: 'רחוב העלייה 7, צפת', lat: 32.9646, lng: 35.4960,
      bedrooms: 3, beds: 6, max_kids: 4,
      garden: true, stairs: true, crib: true, mamad: false,
      photos: '', is_available: true, note: 'בית כפרי מקסים בעיר העתיקה', price: 0, price_note: ''
    },
    {
      id: 5, owner_phone: '054-3333333', name: 'בית משפחתי בחיפה',
      address: 'רחוב הגפן 12, חיפה', lat: 32.7940, lng: 34.9896,
      bedrooms: 4, beds: 8, max_kids: 6,
      garden: true, stairs: false, crib: true, mamad: true,
      photos: '', is_available: true, note: 'בית גדול ומרווח, מושלם למשפחות', price: 100, price_note: 'חשמל + ניקיון'
    },
    {
      id: 6, owner_phone: '050-4444444', name: 'וילה בבאר שבע',
      address: 'רחוב האלונים 3, באר שבע', lat: 31.2518, lng: 34.7913,
      bedrooms: 5, beds: 10, max_kids: 8,
      garden: true, stairs: true, crib: false, mamad: true,
      photos: '', is_available: false, note: 'וילה מפוארת עם בריכה', price: 200, price_note: 'כולל ניקיון'
    },
    {
      id: 7, owner_phone: '052-5555555', name: 'דירה באילת',
      address: 'שדרות התמרים 20, אילת', lat: 29.5577, lng: 34.9519,
      bedrooms: 2, beds: 4, max_kids: 2,
      garden: false, stairs: false, crib: false, mamad: true,
      photos: '', is_available: false, note: 'נוף לים האדום', price: 0, price_note: ''
    },
    {
      id: 8, owner_phone: '053-6666666', name: 'בית בזיכרון יעקב',
      address: 'רחוב המייסדים 8, זיכרון יעקב', lat: 32.5767, lng: 34.9543,
      bedrooms: 3, beds: 5, max_kids: 3,
      garden: true, stairs: true, crib: true, mamad: false,
      photos: '', is_available: false, note: 'בית חמים באווירה כפרית', price: 0, price_note: ''
    }
  ],
  requests: []
};

// Demo user name lookup
const demoUserNames = {
  '050-0000000': 'הודיה',
  '052-1111111': 'שירה כהן',
  '052-2222222': 'רחל לוי',
  '054-3333333': 'נועה אברהם',
  '050-4444444': 'מיכל דוד',
  '052-5555555': 'תמר מזרחי',
  '053-6666666': 'אסתר פרידמן'
};

// ==================== Google Sheets Connection ====================
let sheets = null;
if (!IS_DEMO) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheets = google.sheets({ version: 'v4', auth });
}

// ==================== Read ====================
export async function readSheet(sheetName) {
  if (IS_DEMO) {
    return JSON.parse(JSON.stringify(demoData[sheetName] || []));
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  const [headers, ...dataRows] = rows;
  return dataRows.map(row => {
    const obj = {};
    headers.forEach((key, i) => {
      const value = row[i] || '';
      if (value === 'TRUE') obj[key] = true;
      else if (value === 'FALSE') obj[key] = false;
      else if (value !== '' && !isNaN(value)) obj[key] = Number(value);
      else obj[key] = value;
    });
    return obj;
  });
}

// ==================== Append ====================
export async function appendRow(sheetName, row) {
  if (IS_DEMO) {
    demoData[sheetName] = demoData[sheetName] || [];
    // Convert array to object using known keys
    if (sheetName === 'users') {
      demoData[sheetName].push({ phone: row[0], name: row[1], created_at: row[2], is_admin: row[3] === 'TRUE' || row[3] === true, approved: row[4] === 'TRUE' || row[4] === true });
    } else if (sheetName === 'houses') {
      demoData[sheetName].push({
        id: row[0], owner_phone: row[1], name: row[2], address: row[3],
        lat: Number(row[4]) || 0, lng: Number(row[5]) || 0,
        bedrooms: Number(row[6]) || 1, beds: Number(row[7]) || 1, max_kids: Number(row[8]) || 0,
        garden: row[9] === 'TRUE' || row[9] === true,
        stairs: row[10] === 'TRUE' || row[10] === true,
        crib: row[11] === 'TRUE' || row[11] === true,
        mamad: row[12] === 'TRUE' || row[12] === true,
        photos: row[13] || '', is_available: row[14] === 'TRUE' || row[14] === true,
        note: row[15] || '', price: Number(row[16]) || 0, price_note: row[17] || ''
      });
    } else if (sheetName === 'requests') {
      demoData[sheetName].push({ id: row[0], house_id: row[1], guest_phone: row[2], status: row[3], created_at: row[4], approved_at: row[5] || '' });
    }
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

// ==================== Update Cell ====================
export async function updateCell(sheetName, cell, value) {
  if (IS_DEMO) {
    // Not used in demo mode directly - use updateRow instead
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${cell}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

// ==================== Update Row (for demo + sheets) ====================
export async function updateRow(sheetName, matchKey, matchValue, updates) {
  if (IS_DEMO) {
    const arr = demoData[sheetName] || [];
    const item = arr.find(r => r[matchKey] == matchValue);
    if (item) Object.assign(item, updates);
    return !!item;
  }

  // For Google Sheets: read all, find row index, update specific cells
  const allRows = await readSheet(sheetName);
  const rowIndex = allRows.findIndex(r => r[matchKey] == matchValue);
  if (rowIndex === -1) return false;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!1:1`,
  });
  const headers = response.data.values[0];

  for (const [key, val] of Object.entries(updates)) {
    const colIndex = headers.indexOf(key);
    if (colIndex === -1) continue;
    const colLetter = String.fromCharCode(65 + colIndex);
    const rowNum = rowIndex + 2; // +1 for header, +1 for 0-based
    await updateCell(sheetName, `${colLetter}${rowNum}`, val);
  }
  return true;
}

// ==================== Get Setting ====================
export async function getSetting(key) {
  const settings = await readSheet('settings');
  const setting = settings.find(s => s.key === key);
  return setting?.value;
}

// ==================== Get User Name by Phone ====================
export async function getUserName(phone) {
  if (IS_DEMO) {
    return demoUserNames[phone] || null;
  }
  const users = await readSheet('users');
  const user = users.find(u => u.phone === phone);
  return user?.name || null;
}

export { IS_DEMO };
