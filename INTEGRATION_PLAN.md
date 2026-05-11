# Savvion Integration Plan

## Current State
- ✅ Admin panel built (`savvion-admin.html` + `savvion-admin.js`)
- ✅ Node.js API server built (`savvion-api-server.js`) with full REST endpoints
- ✅ Sample data loaded (15 leads, 10 clients, 13 bookings, etc.)
- ✅ Server runs on `http://localhost:3000`
- ✅ Landing page deployed at `https://onsavvy-io.vercel.app`

## Integration Points Needed

### 1. Contact Form → Lead Capture
**Where:** Landing page contact form (Name, Email, Phone, Interest field)
**Action:** Form submission should POST to `https://onsavvy-io.vercel.app/api/leads` (or your API server URL)
**Status:** Not connected yet

### 2. Admin Panel Data Flow
**Current:** Admin panel uses hardcoded mock data in `savvion-admin.js:seedData()`
**Needed:** Replace mock data with `fetch('/api/...')` calls to live API
**Status:** API server ready, but admin panel not yet calling it

### 3. Authentication & Access Control
**Current:** `savvion-auth.html` exists but unclear if it protects admin panel
**Needed:** Session validation before showing `/savvion-admin.html`
**Status:** Auth page exists, needs integration with API

### 4. Real-time Notifications
**Current:** Admin panel shows static notifications
**Needed:** Poll `/api/notifications` every 30s or use WebSocket
**Status:** Endpoint ready, frontend polling not implemented

## Integration Architecture

```
┌─────────────────┐
│  Vercel Site    │  (https://onsavvy-io.vercel.app)
│  - index.html   │
│  - contact form │
└────────┬────────┘
         │ form submit
         ▼
┌─────────────────┐
│  Savvion API    │  (http://localhost:3000 or deployed)
│  - POST /leads  │
│  - GET /leads   │
│  - All CRUD     │
└────────┬────────┘
         │ store
         ▼
   ┌───────────┐
   │  JSON DB  │  (in-memory, persist to file/db later)
   └───────────┘
         ▲
         │ fetch
┌────────┴────────┐
│  Admin Panel    │  (/savvion-admin.html)
│  - Kanban board │
│  - Charts       │
│  - Follow-ups   │
└─────────────────┘
```

## What's Left To Build

### Phase 1: Connect Admin Panel to API
- Update `savvion-admin.js` to replace `seedData()` with `fetch()` calls
- Load leads, clients, bookings from `/api/leads`, `/api/clients`, `/api/bookings`
- Implement loading states and error handling
- Test all CRUD operations (drag & drop stage change, add lead, edit client)

### Phase 2: Connect Website Forms to API
- Locate contact form in `index.html` (deployed)
- Change `<form action="...">` to POST to `/api/leads`
- Add client-side validation + success/error feedback
- Test: submit from live site → appears in admin panel

### Phase 3: Authentication
- Protect `/savvion-admin.html` route (check session/token)
- Use existing `savvion-auth.html` as login page
- On successful login, set session cookie or localStorage token
- Add auth check at top of `savvion-admin.js`; redirect to auth if not logged in
- Optionally: role-based access (admin only)

### Phase 4: Deploy API
- Deploy `savvion-api-server.js` to Railway/Heroku/AWS EC2
- Update frontend base URL from `localhost:3000` → `https://your-api.vercel.app`
- Add environment variable support for API_URL
- Enable persistence (SQLite/PostgreSQL) instead of in-memory

### Phase 5: Real-time & polish
- Notification polling (every 30s)
- New lead alerts (toast notification)
- WebSocket option for live updates
- Error logging & monitoring
- Rate limiting on API endpoints

## Questions for You

1. **Auth method:** Should admins use email+password (store in DB), or simple shared PIN? Your `savvion-auth.html` currently shows email & password fields.

2. **API hosting:** Deploy the Node.js API separately (e.g., Railway) or use Vercel serverless functions? Vercel would mean rewriting as serverless.

3. **Form handling:** Does your current contact form already submit anywhere? I saw the contact form markup in index.html — need to know current behavior.

4. **Data persistence:** In-memory DB works for demo, but restarts lose data. Should I add SQLite (file-based) so data survives server restarts?

5. **Multi-admin:** Will multiple team members access the admin? If yes, need user management table and per-admin permissions.

## Immediate Next Step

**I recommend starting with Phase 1:** connect the admin panel to the running API.

I'll modify `savvion-admin.js` to:
- Replace all `mockLeads`, `mockClients`, `mockBookings` with `fetch()` calls
- Load data from `http://localhost:3000/api/...`
- Keep fallback to mock data if API unreachable (for offline dev)
- Wire up all CRUD operations to actual API endpoints

Then you can see live data in the admin panel as soon as the API is reachable.

Want me to proceed with Phase 1 integration now?
