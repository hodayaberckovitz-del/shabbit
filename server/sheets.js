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
  houses: [],
  requests: []
};

// Demo user name lookup
const demoUserNames = {
  '050-0000000': 'הודיה'
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
