# 🍦 Fanmilk Togo — Vendor Scorecard Dashboard

Live dashboard connected to Google Sheets via WhatsApp bot.

## Stack
- React + Vite (frontend)
- Recharts (charts)
- Vercel (hosting — free)
- Google Apps Script (data API)

## Deploy in 5 minutes

### Step 1 — Deploy Apps Script (data source)
1. Open your Google Sheet
2. Extensions → Apps Script
3. Paste the content of `apps_script.js`
4. Replace `SHEET_ID` with your Google Sheet ID
5. Deploy → New deployment → Web App → Anyone → Copy the URL

### Step 2 — Deploy to Vercel
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import this repo
3. Add environment variable:
   - Name: `VITE_APPS_SCRIPT_URL`
   - Value: your Apps Script URL from Step 1
4. Deploy → get your public URL 🎉

## Local development
```bash
npm install
echo "VITE_APPS_SCRIPT_URL=your_url_here" > .env.local
npm run dev
```
