# Savvion API Server

Complete Node.js backend for Savvion Control Centre — lead tracking, budget management, automated follow-ups, and client portal.

## 🚀 Features

- **JWT Authentication** — Role-based (admin, client, staff)
- **Lead Management** — Kanban board stages, drag & drop updates, source tracking
- **Booking System** — Full CRUD, status management, per-client visibility
- **Budget & Analytics** — Revenue tracking, conversion funnel, service mix, top clients
- **Automation** — WhatsApp/Email templates, triggers, send logs
- **Notifications** — Real-time in-app notifications
- **Client Portal** — Clients view/manage their own bookings only
- **Row-Level Security** — Clients never see other clients' data
- **SQLite (dev) / PostgreSQL (prod)** — Easy development, scalable production

## 📦 Quick Start (15 minutes)

### Prerequisites
- Node.js 18+ installed
- Git (optional)

### 1. Clone & Install

```bash
cd savvion-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3000
```

### 3. Initialize Database

```bash
npm run db:reset   # This runs init-db.js and seed-data.js
```

### 4. Start the Server

```bash
npm run dev  # Development with nodemon (auto-reload)
# or
npm start    # Production mode
```

The API will be available at: `http://localhost:3000`

**Health check:**
```bash
curl http://localhost:3000/api/health
```

## 🔐 Default Admin Account

```
Email:    admin@savvion.com
Password: admin123!
```

⚠️ **Change this password immediately after first login!**

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/register` | Register as client/staff |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Leads (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List all leads (filter by stage, source) |
| GET | `/api/leads/:id` | Get single lead |
| POST | `/api/leads` | Create lead |
| PATCH | `/api/leads/:id` | Update lead (stage change via drag-drop) |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/leads/stats/pipeline` | Pipeline counts per stage |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Admin: all bookings, Client: own only |
| GET | `/api/bookings/:id` | Get single booking |
| POST | `/api/bookings` | Create booking |
| PATCH | `/api/bookings/:id` | Update status/date/time |
| DELETE | `/api/bookings/:id` | Cancel booking |

### Clients (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients (paginated) |
| GET | `/api/clients/:id` | Get client details + stats |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List all active services |
| GET | `/api/services/:id` | Get service details |
| POST | `/api/services` | Create service (admin) |
| PUT | `/api/services/:id` | Update service (admin) |
| DELETE | `/api/services/:id` | Delete service (admin) |

### Analytics (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Dashboard KPIs |
| GET | `/api/analytics/revenue` | Monthly revenue history |
| GET | `/api/analytics/funnel` | Lead conversion funnel |
| GET | `/api/analytics/bookings` | Bookings by month |
| GET | `/api/analytics/services` | Service mix |
| GET | `/api/analytics/sources` | Lead sources breakdown |
| GET | `/api/analytics/top-clients` | Top clients by LTV |

### Automation (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/automation/templates` | List templates (filter by channel) |
| POST | `/api/automation/templates` | Create template |
| PATCH | `/api/automation/templates/:id` | Update template |
| DELETE | `/api/automation/templates/:id` | Delete template |
| GET | `/api/automation/triggers` | List trigger rules |
| PATCH | `/api/automation/triggers/:id` | Enable/disable trigger |
| POST | `/api/automation/send` | Manually send message |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user's notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| POST | `/api/notifications/mark-all-read` | Mark all as read |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get current user profile |
| PUT | `/api/profile` | Update profile |

## 🔌 Frontend Integration

### 1. Update Admin Panel (`Savvion admin.html`)

Modify `savvion-admin.js` to call API instead of using mock data:

```javascript
const API_BASE = 'http://localhost:3000/api';
const TOKEN = sessionStorage.getItem('token');

// Fetch headers
const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

// Replace seedData() with API fetch
async function loadData() {
  try {
    const [leadsRes, bookingsRes, clientsRes] = await Promise.all([
      fetch(`${API_BASE}/leads`, { headers }),
      fetch(`${API_BASE}/bookings`, { headers }),
      fetch(`${API_BASE}/clients`, { headers })
    ]);

    const leadsData = await leadsRes.json();
    const bookingsData = await bookingsRes.json();
    const clientsData = await clientsRes.json();

    if (leadsData.success) DB.leads = leadsData.data;
    if (bookingsData.success) DB.bookings = bookingsData.data;
    if (clientsData.success) DB.clients = clientsData.data;

    renderAllViews();
  } catch (err) {
    console.error('Failed to load data:', err);
    // Redirect to login if 401
     if (err.status === 401) window.location.href = 'savvion-auth.html';
  }
}

// Call loadData() in init() instead of seedData()
```

### 2. Update Client Portal (`savvion-client-portal.html`)

Replace mock `bookings` array:

```javascript
async function loadMyBookings() {
  const token = sessionStorage.getItem('token');
  const res = await fetch('http://localhost:3000/api/bookings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.success) {
    bookings = data.data;
    renderUpcoming();
    renderHistory();
    renderMiniCal();
    updateHero();
  }
}
```

### 3. Authentication Flow

In `savvion auth.html`, after successful login:

```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (data.success) {
  sessionStorage.setItem('token', data.token);
  sessionStorage.setItem('userId', data.user.id);
  sessionStorage.setItem('userRole', data.user.role);
  sessionStorage.setItem('clientName', data.user.name);
  sessionStorage.setItem('clientEmail', data.user.email);

  // Redirect based on role
  if (data.user.role === 'admin') {
    window.location.href = 'Savvion admin.html';
  } else {
    window.location.href = 'savvion-client-portal.html';
  }
}
```

## 🛠️ Development Scripts

```bash
npm run dev        # Start dev server with hot reload
npm start          # Start production server
npm run test       # Run tests
npm run db:reset   # Clear and recreate database
npm run db:seed    # Re-seed demo data only
```

## 🗄️ Database

### Development (SQLite)
- Database file: `savvion-api/data/savvion.db`
- No external DB required
- Full SQL feature support via better-sqlite3

### Production (PostgreSQL)
Set these environment variables:
```env
NODE_ENV=production
PG_HOST=your-postgres-host
PG_PORT=5432
PG_DATABASE=savvion
PG_USER=postgres
PG_PASSWORD=yourpassword
```

Schema is auto-applied on first run. See `database/schema.sql` for full DDL.

## 📦 Deployment

### Option 1: Railway (Easiest)
1. Push code to GitHub
2. Connect to Railway.app
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy

### Option 2: Render.com
1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add PostgreSQL database
6. Set env vars

### Option 3: VPS (DigitalOcean, Linode, AWS EC2)
```bash
git clone <your-repo>
cd savvion-api
npm install --production
npm run build  # if you have build step
npm start
```

Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name savvion-api
pm2 save
pm2 startup  # auto-start on reboot
```

### Option 4: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t savvion-api .
docker run -p 3000:3000 --env-file .env savvion-api
```

## 🔧 WhatsApp & Email Automation

### WhatsApp (Twilio or Facebook Graph API)

Add to `.env`:
```env
WHATSAPP_TOKEN=your_meta_token
WHATSAPP_PHONE_ID=your_phone_id
```

Implement in `routes/automation.js`:
```javascript
async function sendWhatsApp(to, message) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      })
    }
  );
  return response.json();
}
```

### Email (Resend, SendGrid, or Nodemailer)

```env
EMAIL_SERVICE=resend
EMAIL_API_KEY=your_resend_key
EMAIL_FROM=noreply@savvion.com
```

```javascript
const resend = require('resend')(process.env.EMAIL_API_KEY);

await resend.emails.send({
  from: process.env.EMAIL_FROM,
  to: recipient,
  subject: subject,
  html: body
});
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration
```

Example test (see `tests/auth.test.js`):
```javascript
describe('POST /api/auth/login', () => {
  it('should authenticate valid user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@savvion.com', password: 'admin123!' });
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });
});
```

## 🔒 Security

- **Helmet** — Security headers
- **Rate limiting** — 100 requests per 15 minutes per IP
- **JWT** — Stateless auth with configurable expiry
- **Password hashing** — bcrypt (salt rounds: 10)
- **SQL Injection protection** — Parameterized queries only
- **CORS** — Configurable allowed origins
- **XSS protection** — Input sanitization on output

## 🐛 Troubleshooting

**Database locked (SQLite)**
- Ensure `journal_mode = WAL` is enabled (default)
- Don't run multiple parallel writes
- Consider PostgreSQL for heavy production load

**JWT token expired**
- Token lifetime: 7 days (configurable via `JWT_EXPIRES_IN`)
- User must log in again

**CORS errors**
- Check `CORS_ORIGIN` includes your frontend URL
- Include protocol: `http://localhost:5500`

**Cannot find module 'better-sqlite3'**
- Run `npm install` again
- On Windows, may need Python & Visual Studio Build Tools

**Port already in use**
- Kill process: `npx kill-port 3000`
- Or change PORT in `.env`: `PORT=3001`

## 📖 API Response Format

All endpoints return consistent JSON:

Success:
```json
{
  "success": true,
  "data": { ... },
  "count": 10,
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

Error:
```json
{
  "success": false,
  "error": "Error message",
  "code": "INVALID_TOKEN"
}
```

## 📚 Database Schema

See `database/schema.sql` for full schema with:
- `users` — Authentication & profiles
- `services` — What you sell
- `leads` — Sales pipeline
- `bookings` — Appointments
- `clients` — Extended client info
- `automation_templates` — Message templates
- `automation_logs` — Send history
- `notifications` — In-app notifications
- `activity_logs` — System activity feed
- `integrations` — Connected services

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes with clear messages
4. Push and create PR

## 📄 License

MIT License — free to use for your projects.

## 📞 Support

For issues, questions, or feature requests:
- Open GitHub issue
- Contact: support@savvion.com

---

**Built with ❤️ by Savvion Team**
