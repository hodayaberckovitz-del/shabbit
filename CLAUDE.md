# שבית - הוראות ל-Claude Code

## סקירה
אפליקציית ווב לשיתוף בתים בסופ"ש בקבוצה סגורה של חברות.
**פרויקט עצמאי** - לא קשור למוח העסקי או לפרויקטי עבודה.

## שפה
- תקשורת בעברית פשוטה
- מחרוזות UI בעברית (RTL)
- שמות קבצים ותיקיות באנגלית בלבד

## Stack
- Node.js + Express (server)
- Google Sheets API (data) - עם fallback למצב דמו
- Leaflet + OpenStreetMap (map - free)
- Cloudinary (images - stage 2)
- Make.com (WhatsApp - stage 3)
- Railway (hosting)

## אבטחה
1. קוד כניסה נבדק בשרת בלבד
2. session_token (UUID) בכל קריאת API
3. כתובות + טלפונים נחשפים רק אחרי אישור בקשה
4. Environment Variables ב-Railway, לא בקוד

## מצב דמו
כשאין GOOGLE_SHEET_ID ב-.env, השרת עובד עם נתוני דמו בזיכרון.
זה מאפשר פיתוח ובדיקה בלי צורך ב-Google Sheets.
