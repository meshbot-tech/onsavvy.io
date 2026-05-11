// ═══════════════════════════════════════════════════════════════════════════════════════
//  SAVVION CONTROL CENTRE — Main JavaScript (API-Connected)
//  Overview · Leads · Bookings · Clients · Automation · Analytics · Settings
// ═══════════════════════════════════════════════════════════════════════════════════════

// ──── API Configuration ───────────────────────────────────────────────────────────────
const API_BASE = (() => {
  const saved = localStorage.getItem('savvion_api_base');
  if (saved) return saved;
  const origin = window.location.origin;
  return `${origin}:3000`;
})();

function getAuthHeaders() {
  const token = sessionStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {})
    },
    ...options
  };
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'API request failed');
  return data;
}

function requireAuth() {
  const token = sessionStorage.getItem('token');
  if (!token) { window.location.href = 'savvion auth.html'; return false; }
  return true;
}

// ──── Helpers ───────────────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const TODAY = new Date();
const TODAY_STR = TODAY.toISOString().slice(0, 10);
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtKES(num) { return "KES " + Math.round(num).toLocaleString(); }
function relDays(dateStr) {
  const d = new Date(dateStr);
  const diff = (TODAY - d) / (1000 * 60 * 60 * 24);
  if (diff < 1) return "Today";
  if (diff < 2) return "Yesterday";
  if (diff < 7) return Math.round(diff) + "d";
  if (diff < 30) return Math.round(diff / 7) + "w";
  return Math.round(diff / 30) + "mo";
}
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

// ──── API Data Store ──────────────────────────────────────────────────────────────────
const DB = {
  currentUser: { name: "Emmanuel M.", initials: "EM", role: "Super Admin" },
  leads: [], bookings: [], clients: [],
  activities: [], notifications: [],
  integrations: [], notificationSettings: [],
  revenueHistory: [], bookingsByMonth: [], topClients: [],
  whatsappTemplates: [], emailTemplates: [], triggers: []
};

async function loadFromAPI() {
  if (!requireAuth()) return;
  const headers = getAuthHeaders();

  try {
    document.body.classList.add('loading');
    const [
      leadsRes, bookingsRes, clientsRes,
      analyticsRes, automationRes, notifRes, userRes
    ] = await Promise.all([
      apiFetch('/api/leads', { headers }),
      apiFetch('/api/bookings', { headers }),
      apiFetch('/api/clients', { headers }),
      apiFetch('/api/analytics', { headers }),
      apiFetch('/api/automation/templates', { headers }),
      apiFetch('/api/notifications', { headers }),
      apiFetch('/api/auth/me', { headers })
    ]);

    DB.leads = leadsRes.data || [];
    DB.bookings = bookingsRes.data || [];
    DB.clients = clientsRes.data || [];

    if (userRes.user) {
      DB.currentUser = {
        name: userRes.user.name,
        initials: userRes.user.name.split(' ').map(n=>n[0]).join('').slice(0,2),
        role: userRes.user.role
      };
    }

    // Build analytics data from real numbers
    const totalRev = analyticsRes.data?.totalRevenue || DB.bookings.reduce((sum,b) => sum + (b.amount||0), 0);
    const totalBookings = analyticsRes.data?.totalBookings || DB.bookings.length;
    DB.revenueHistory = generateRevenueHistory(totalRev);
    DB.bookingsByMonth = generateBookingsByMonth(totalBookings);
    DB.topClients = analyticsRes.data?.topClients || DB.clients.slice(0,5);

    DB.whatsappTemplates = automationRes.data?.filter(t => t.channel === 'whatsapp') || [];
    DB.emailTemplates = automationRes.data?.filter(t => t.channel === 'email') || [];
    DB.notifications = notifRes.data || [];

    // Static/reference
    DB.integrations = [
      { name: "WhatsApp Business API", icon: "ti-brand-whatsapp", status: "connected", desc: "Send automated WhatsApp messages" },
      { name: "SMTP Email", icon: "ti-mail", status: "connected", desc: "Transactional & marketing emails" },
      { name: "Google Calendar", icon: "ti-calendar", status: "disconnected", desc: "Sync bookings to calendar" },
      { name: "Stripe Payments", icon: "ti-credit-card", status: "connected", desc: "Receive online payments" },
    ];
    DB.notificationSettings = [
      { setting: "New Booking", enabled: true },
      { setting: "Cancellation", enabled: true },
      { setting: "Payment Received", enabled: true },
      { setting: "Weekly Digest", enabled: false },
      { setting: "System Alerts", enabled: true },
    ];
    DB.triggers = [
      { id:'1', name:"Booking Confirmed", icon:"ti-check", iconColor:"var(--green)", enabled:true },
      { id:'2', name:"Payment Received", icon:"ti-currency-shilling", iconColor:"var(--amber)", enabled:true },
      { id:'3', name:"24h Before Appointment", icon:"ti-clock", iconColor:"var(--blue)", enabled:false },
      { id:'4', name:"Lead Won", icon:"ti-trophy", iconColor:"var(--green)", enabled:true },
      { id:'5', name:"Lead Lost", icon:"ti-thumb-down", iconColor:"var(--red)", enabled:false },
    ];

    // Activity (from DB or mock)
    DB.activities = [
      { icon:"ti-check", color:"var(--green)", text:"Booking <strong>confirmed</strong> for Tabitha M.", time:"2 minutes ago" },
      { icon:"ti-brand-whatsapp", color:"var(--wa-dark)", text:"WhatsApp sent to <strong>Samuel O.</strong>", time:"12 minutes ago" },
      { icon:"ti-user-plus", color:"var(--blue)", text:"New lead <strong>Martin Okello</strong> added", time:"32 minutes ago" },
      { icon:"ti-chart-line", color:"var(--purple)", text:"Monthly report generated", time:"1 hour ago" },
      { icon:"ti-calendar-event", color:"var(--amber)", text:"Reminder: Booking with <strong>Linet C.</strong> in 1h", time:"2 hours ago" },
    ];

  } catch (err) {
    console.error('Data load failed:', err);
    if (err.message.includes('401')) window.location.href = 'savvion auth.html';
    else showToast('Failed to load data', 'red');
  } finally {
    document.body.classList.remove('loading');
  }
}

function generateRevenueHistory(total) {
  const base = total / 6;
  return [
    { month:'Jan', value: base*0.8 },
    { month:'Feb', value: base*0.9 },
    { month:'Mar', value: base },
    { month:'Apr', value: base*1.1 },
    { month:'May', value: base*1.05 },
    { month:'Jun', value: base*1.15 }
  ];
}
function generateBookingsByMonth(total) {
  const base = total / 6;
  return [
    { month:'Jan', bookings: Math.floor(base*0.8) },
    { month:'Feb', bookings: Math.floor(base*0.9) },
    { month:'Mar', bookings: Math.floor(base) },
    { month:'Apr', bookings: Math.floor(base*1.1) },
    { month:'May', bookings: Math.floor(base*1.05) },
    { month:'Jun', bookings: Math.floor(base*1.15) }
  ];
}

// ──── Mini helper to refresh a row's highlight ───────────────────────────────────────
function refreshRowHighlight(tbody, id) {
  tbody.querySelectorAll('tr').forEach(row => {
    row.style.background = row.dataset.id === id ? 'var(--green-light)' : '';
  });
}

// ──── Navigation ─────────────────────────────────────────────────────────────────────
function setupNavigation() {
  $$(".sb-item[data-view]").forEach(el => {
    el.addEventListener("click", () => switchView(el.dataset.view));
  });

  // Overview booking tabs
  $("#ov-booking-tabs")?.addEventListener("click", e => {
    if (!e.target.classList.contains("f-tab")) return;
    const filter = e.target.dataset.filter;
    $("#ov-booking-tabs .f-tab").forEach(t => t.classList.remove("is-active"));
    e.target.classList.add("is-active");
    const tbody = $("#ov-bookings-tbody");
    if (!tbody) return;
    let filtered = filter === "all" ? DB.bookings : DB.bookings.filter(b => b.status === filter);
    filtered = filtered.slice(0, 5);
    renderRecentBookingsBody(filtered);
    // Re-attach row handler
    tbody.querySelectorAll("tr[data-type='booking']").forEach(row => {
      row.style.cursor = "pointer";
      row.onclick = () => openBookingDrawer(row.dataset.id);
    });
  });

  // Leads view toggle
  $("#leads-view-toggle")?.addEventListener("click", e => {
    if (!e.target.classList.contains("f-tab")) return;
    const isKanban = e.target.dataset.lview === "kanban";
    $("#leads-kanban").style.display = isKanban ? "flex" : "none";
    $("#leads-table-wrap").style.display = isKanban ? "none" : "block";
    e.target.closest(".filter-tabs").querySelectorAll(".f-tab").forEach(t => t.classList.remove("is-active"));
    e.target.classList.add("is-active");
  });

  // Leads filters
  $("#leads-stage-tabs")?.addEventListener("click", e => {
    if (e.target.classList.contains("f-tab")) renderLeadsTable();
  });
  $("#leads-search")?.addEventListener("input", renderLeads);

  // Bookings filters
  $("#bookings-tabs")?.addEventListener("click", e => {
    if (e.target.classList.contains("f-tab")) renderBookings();
  });
  $("#bookings-search")?.addEventListener("input", renderBookings);

  // Clients search
  $("#clients-search")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    $$(".client-card").forEach(card => {
      const name = card.querySelector(".cc-name").textContent.toLowerCase();
      card.style.display = name.includes(q) ? "flex" : "none";
    });
  });

  // Analytics range
  $("#analytics-range")?.addEventListener("click", e => {
    if (e.target.classList.contains("f-tab")) {
      document.querySelectorAll("#analytics-range .f-tab").forEach(t => t.classList.remove("is-active"));
      e.target.classList.add("is-active");
      renderAnalytics();
    }
  });
}

function switchView(viewId) {
  currentView = viewId;
  $$(".view").forEach(v => v.classList.remove("is-active"));
  $(`#view-${viewId}`).classList.add("is-active");
  $$(".sb-item").forEach(item => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });

  const titleEl = $("#topbar-title");
  switch (viewId) {
    case "overview":
      titleEl.innerHTML = `Overview <span class="topbar-sub">Good ${new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, ${DB.currentUser.name.split(" ")[0]} 👋</span>`;
      renderOverview();
      break;
    case "leads": renderLeads(); break;
    case "bookings": renderBookings(); break;
    case "clients": renderClients(); break;
    case "automation": renderAutomation(); break;
    case "analytics": renderAnalytics(); break;
    case "settings": renderSettings(); break;
  }
}

// ──── Sidebar collapse ──────────────────────────────────────────────────────────────
function setupSidebar() {
  $("#btn-collapse").addEventListener("click", () => {
    sidebarCollapsed = !sidebarCollapsed;
    $("body").classList.toggle("sidebar-collapsed", sidebarCollapsed);
    $("#sidebar").classList.toggle("collapsed", sidebarCollapsed);
    $("#main").classList.toggle("collapsed", sidebarCollapsed);
    const label = $("#btn-collapse").querySelector(".bc-label");
    if (label) label.textContent = sidebarCollapsed ? "Expand" : "Collapse";
  });
}

function setupTimeline() {
  const dateEl = $("#overview-date");
  if (dateEl) {
    const options = { weekday: "long", month: "long", day: "numeric" };
    dateEl.textContent = TODAY.toLocaleDateString("en-KE", options);
  }
}

// ──── Overview ──────────────────────────────────────────────────────────────────────
function renderOverview() {
  renderKPIs("#overview-kpis", false);
  renderRecentBookings();
  renderPipelineSummary();
  renderWeekStats();
  renderActivity();
}

function renderKPIs(container, analyticsMode = false) {
  const containerEl = $(container);
  if (!containerEl) return;

  if (analyticsMode) {
    const totalRev = DB.revenueHistory.reduce((s,m)=>s+m.value,0);
    const avgRev = totalRev / DB.revenueHistory.length;
    containerEl.innerHTML = `
      <div class="kpi-card c-green">
        <div class="kpi-icon green"><i class="ti ti-currency-shilling"></i></div>
        <div class="kpi-val">KES ${(avgRev/1000).toFixed(0)}K</div>
        <div class="kpi-lbl">Avg Monthly Revenue (30d)</div>
        <div class="kpi-delta up"><i class="ti ti-arrow-up"></i> 12%</div>
      </div>
      <div class="kpi-card c-blue">
        <div class="kpi-icon blue"><i class="ti ti-users"></i></div>
        <div class="kpi-val">${DB.bookings.length}</div>
        <div class="kpi-lbl">Bookings (30d)</div>
        <div class="kpi-delta up"><i class="ti ti-arrow-up"></i> 8%</div>
      </div>
      <div class="kpi-card c-purple">
        <div class="kpi-icon purple"><i class="ti ti-filter"></i></div>
        <div class="kpi-val">${DB.leads.length}</div>
        <div class="kpi-lbl">Active Leads</div>
        <div class="kpi-delta down"><i class="ti ti-arrow-down"></i> 3%</div>
      </div>
    `;
    return;
  }

  const confirmedBookings = DB.bookings.filter(b => b.status === "confirmed").length;
  const pipelineValue = DB.leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const wonLeads = DB.leads.filter(l => l.stage === "won").length;
  const conversionRate = Math.round((wonLeads / Math.max(DB.leads.length,1)) * 100) || 0;

  containerEl.innerHTML = `
    <div class="kpi-card c-green">
      <div class="kpi-icon green"><i class="ti ti-currency-shilling"></i></div>
      <div class="kpi-val">KES ${(pipelineValue/1000000).toFixed(2)}M</div>
      <div class="kpi-lbl">Pipeline Value</div><div class="kpi-delta up"><i class="ti ti-arrow-up"></i> ${randInt(5,18)}%</div>
    </div>
    <div class="kpi-card c-amber">
      <div class="kpi-icon amber"><i class="ti ti-calendar-event"></i></div>
      <div class="kpi-val">${confirmedBookings}</div>
      <div class="kpi-lbl">Confirmed Bookings</div><div class="kpi-delta up"><i class="ti ti-arrow-up"></i> ${randInt(1,6)} this week</div>
    </div>
    <div class="kpi-card c-blue">
      <div class="kpi-icon blue"><i class="ti ti-users"></i></div>
      <div class="kpi-val">${DB.clients.length}</div>
      <div class="kpi-lbl">Active Clients</div><div class="kpi-delta up"><i class="ti ti-user-plus"></i> +${randInt(2,6)} new</div>
    </div>
    <div class="kpi-card c-wa">
      <div class="kpi-icon wa"><i class="ti ti-brand-whatsapp"></i></div>
      <div class="kpi-val">${conversionRate}%</div>
      <div class="kpi-lbl">Lead Conversion</div><div class="kpi-delta up"><i class="ti ti-arrow-up"></i> ${randInt(1,4)}%</div>
    </div>
  `;
}

function renderRecentBookings() {
  const filtered = DB.bookings.slice(0, 5);
  renderRecentBookingsBody(filtered);
}

function renderRecentBookingsBody(bookings) {
  const tbody = $("#ov-bookings-tbody");
  if (!tbody) return;
  let html = "";
  bookings.forEach(b => {
    const statusClass = { confirmed:"badge-confirmed", pending:"badge-pending", completed:"badge-completed", cancelled:"badge-cancelled" }[b.status]||"";
    html += `
      <tr data-id="${b.id}" data-type="booking">
        <td><div class="td-flex"><div class="c-avatar" style="background:${b.clientColor}">${b.clientAvatar}</div><div><div class="td-primary">${b.clientName}</div><div class="td-sub">${b.service}</div></div></div></td>
        <td class="td-primary">${b.service}</td>
        <td>${new Date(b.date).toLocaleDateString("en-KE",{month:"short",day:"numeric"})}</td>
        <td class="td-amount td-mono">KES ${(b.amount/1000).toFixed(0)}K</td>
        <td><span class="badge ${statusClass}">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span></td>
      </tr>`;
  });
  tbody.innerHTML = html;
  tbody.querySelectorAll("tr[data-type='booking']").forEach(row => {
    row.style.cursor = "pointer";
    row.onclick = () => openBookingDrawer(row.dataset.id);
  });
}

function renderPipelineSummary() {
  const container = $("#ov-funnel"); if (!container) return;
  const stages = [
    { name:"New", count: DB.leads.filter(l=>l.stage==="new").length, pct:100 },
    { name:"Contacted", count: DB.leads.filter(l=>l.stage==="contacted").length, pct:80 },
    { name:"Qualified", count: DB.leads.filter(l=>l.stage==="qualified").length, pct:60 },
    { name:"Proposal", count: DB.leads.filter(l=>l.stage==="proposal").length, pct:40 },
    { name:"Won", count: DB.leads.filter(l=>l.stage==="won").length, pct:20 },
  ];
  let max = Math.max(...stages.map(s=>s.count));
  let html = "";
  stages.forEach(s => {
    const pct = max ? (s.count/max)*100 : 0;
    html += `<div class="funnel-row"><div class="funnel-label">${s.name}</div><div class="funnel-bar-wrap"><div class="funnel-bar-fill" style="width:${pct}%;background:var(--green)"><span class="funnel-count">${s.count}</span></div></div><div class="funnel-pct">${s.pct}%</div></div>`;
  });
  container.innerHTML = html;
}

function renderWeekStats() {
  const container = $("#ov-week-stats"); if (!container) return;
  const stats = [
    { label:"New Leads", val: randInt(3,12) },
    { label:"Bookings Made", val: randInt(2,8) },
    { label:"Messages Sent", val: randInt(15,45) },
    { label:"Revenue (KES)", val: fmtKES(randInt(200000,880000)) },
  ];
  let html = ""; stats.forEach(s => { html += `<div class="mini-stat"><div class="ms-label">${s.label}</div><div class="ms-val">${s.val}</div></div>`; });
  container.innerHTML = html;
}

function renderActivity() {
  const container = $("#ov-activity"); if (!container) return;
  let html = "";
  DB.activities.forEach(a => {
    html += `<div class="activity-item"><div class="act-icon" style="background:${a.color}20;color:${a.color}"><i class="ti ${a.icon}"></i></div><div style="flex:1"><div class="act-text">${a.text}</div><div class="act-time">${a.time}</div></div></div>`;
  });
  container.innerHTML = html;
}

// ──── Leads ───────────────────────────────────────────────────────────────────────────
function setupLeads() {}
function renderLeads() { renderKanban(); renderLeadsTable(); }

function renderKanban() {
  const stages = [
    { key:"new", label:"New", dot:"var(--blue)" },
    { key:"contacted", label:"Contacted", dot:"var(--purple)" },
    { key:"qualified", label:"Qualified", dot:"var(--teal)" },
    { key:"proposal", label:"Proposal", dot:"var(--amber)" },
    { key:"won", label:"Won", dot:"var(--green)" },
    { key:"lost", label:"Lost", dot:"var(--red)" },
  ];
  const container = $("#leads-kanban"); if (!container) return;
  let html = "";
  stages.forEach(st => {
    const leads = DB.leads.filter(l => l.stage === st.key);
    html += `
      <div class="kanban-col kanban-column" data-stage="${st.key}">
        <div class="kanban-hdr"><div class="kanban-hdr-left"><div class="kanban-hdr-dot" style="background:${st.dot}"></div><div class="kanban-hdr-name">${st.label}</div></div><div class="kanban-hdr-count">${leads.length}</div></div>
        <div class="kanban-cards">${leads.map(leadCard).join("")}${leads.length===0?'<div class="kanban-empty">Drop leads here</div>':''}</div>
      </div>`;
  });
  container.innerHTML = html;
  setupKanbanDnD();
}

function leadCard(lead) {
  return `<div class="lead-card" draggable="true" data-id="${lead.id}" data-stage="${lead.stage}">
    <div class="lead-card-top"><div class="lead-card-name">${lead.clientName}</div><div class="lead-card-src ${lead.srcClass}">${lead.source}</div></div>
    <div class="lead-card-svc">${lead.service}</div>
    <div class="lead-card-val">KES ${(lead.value/1000).toFixed(0)}K</div>
    <div class="lead-card-footer"><div class="lead-card-days">${relDays(lead.created)}</div>
      <div class="lead-card-actions">
        <button class="lead-action la-wa" title="WhatsApp" onclick="openLeadDrawer('${lead.id}')"><i class="ti ti-brand-whatsapp"></i></button>
        <button class="lead-action la-email" title="Email" onclick="composeEmail('${lead.clientName}')"><i class="ti ti-mail"></i></button>
      </div>
    </div>
  </div>`;
}

function setupKanbanDnD() {
  $$(".kanban-col").forEach(col => {
    col.addEventListener("dragover", e => { e.preventDefault(); col.style.background = "var(--gray-50)"; });
    col.addEventListener("dragleave", () => { col.style.background = ""; });
    col.addEventListener("drop", e => {
      e.preventDefault(); col.style.background = "";
      const card = e.target.closest(".lead-card");
      if (card) updateLeadStage(card.dataset.id, col.dataset.stage);
    });
  });
}

async function updateLeadStage(leadId, newStage) {
  try {
    await apiFetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage: newStage })
    });
    // Update local DB
    const lead = DB.leads.find(l => l.id === leadId);
    if (lead) lead.stage = newStage;
    renderLeads();
    openNotify(`Lead moved to <strong>${newStage.charAt(0).toUpperCase()+newStage.slice(1)}</strong>`);
  } catch (err) {
    console.error('Stage update failed:', err);
    openNotify('Failed to update lead', 'red');
  }
}

function renderLeadsTable() {
  const tbody = $("#leads-table-tbody"); if (!tbody) return;
  const filter = document.querySelector("#leads-stage-tabs .f-tab.is-active").dataset.filter;
  const search = $("#leads-search")?.value.toLowerCase() || "";
  let leads = DB.leads;
  if (filter !== "all") leads = leads.filter(l => l.stage === filter);
  if (search) leads = leads.filter(l => l.clientName.toLowerCase().includes(search));

  let html = "";
  leads.forEach(l => {
    const stageBadge = l.stage==="won"?"badge-won":l.stage==="lost"?"badge-lost":l.stage==="new"?"badge-new":l.stage==="contacted"?"badge-contacted":l.stage==="qualified"?"badge-qualified":"badge-proposal";
    html += `<tr data-id="${l.id}"><td><div class="td-flex"><div class="c-avatar" style="background:${l.clientColor}">${l.clientAvatar}</div><div><div class="td-primary">${l.clientName}</div><div class="td-sub">${l.service}</div></div></div></td>
      <td>${l.service}</td><td class="td-amount td-mono">KES ${(l.value/1000).toFixed(0)}K</td><td><span class="badge ${l.srcClass}">${l.source}</span></td>
      <td><span class="badge ${stageBadge}">${l.stage.charAt(0).toUpperCase()+l.stage.slice(1)}</span></td><td>${relDays(l.created)}</td>
      <td><button class="btn-icon" onclick="openLeadDrawer('${l.id}')"><i class="ti ti-eye"></i></button></td></tr>`;
  });
  tbody.innerHTML = html;
  tbody.querySelectorAll("tr").forEach(row => {
    row.style.cursor = "pointer";
    row.onclick = () => openLeadDrawer(row.dataset.id);
  });
}

async function openLeadDrawer(leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;
  const drawer = $("#lead-drawer");
  const body = $("#lead-drawer-body");
  const stageLabels = { new:"New Lead", contacted:"Contacted", qualified:"Qualified", proposal:"Proposal Sent", won:"Won ✨", lost:"Lost" };

  body.innerHTML = `
    <div class="drawer-field"><label>Stage</label><p><span class="badge badge-${lead.stage}">${stageLabels[lead.stage]}</span></p></div>
    <div class="drawer-field"><label>Lead</label><p>${lead.clientName}</p></div>
    <div class="drawer-field"><label>Service</label><p>${lead.service}</p></div>
    <div class="drawer-field"><label>Value</label><p class="td-mono td-amount">KES ${(lead.value/1000).toFixed(0)}K</p></div>
    <div class="drawer-field"><label>Source</label><p>${lead.source}</p></div>
    <div class="drawer-field"><label>Created</label><p>${new Date(lead.created).toLocaleDateString("en-KE")}</p></div>
    <div class="drawer-field"><label>Notes</label><textarea class="form-field" rows="3" placeholder="Add notes...">${lead.notes||""}</textarea></div>
  `;

  $("#lead-convert-btn").onclick = async () => {
    try {
      await apiFetch(`/api/leads/${leadId}`, { method:'PATCH', body: JSON.stringify({ stage:'won' }) });
      lead.stage = 'won';
      drawer.classList.remove("is-open");
      renderLeads(); renderOverview();
      openNotify("Lead converted to client!");
    } catch(err){ openNotify('Conversion failed', 'red'); }
  };

  drawer.classList.add("is-open");
}

// ──── Bookings ───────────────────────────────────────────────────────────────────────
function setupBookings() {}
function renderBookings() {
  const tbody = $("#bookings-tbody"); if (!tbody) return;
  const filter = document.querySelector("#bookings-tabs .f-tab.is-active").dataset.filter;
  const search = $("#bookings-search")?.value.toLowerCase() || "";
  let bookings = DB.bookings;
  if (filter !== "all") bookings = bookings.filter(b => b.status === filter);
  if (search) bookings = bookings.filter(b => b.clientName.toLowerCase().includes(search) || b.service.toLowerCase().includes(search));

  let html = "";
  bookings.forEach(b => {
    const statusClass = { confirmed:"badge-confirmed", pending:"badge-pending", completed:"badge-completed", cancelled:"badge-cancelled" }[b.status]||"";
    html += `<tr data-id="${b.id}" data-type="booking">
      <td><div class="td-flex"><div class="c-avatar" style="background:${b.clientColor}">${b.clientAvatar}</div><div><div class="td-primary">${b.clientName}</div><div class="td-sub">${b.service}</div></div></div></td>
      <td>${b.service}</td><td class="td-mono">${b.date} · ${b.time}</td><td class="td-amount">KES ${(b.amount/1000).toFixed(0)}K</td>
      <td><span class="badge ${statusClass}" style="font-weight:600">${b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span></td>
      <td><button class="btn-icon" onclick="openBookingDrawer('${b.id}')"><i class="ti ti-eye"></i></button></td></tr>`;
  });
  tbody.innerHTML = html;
  tbody.querySelectorAll("tr[data-type='booking']").forEach(row => {
    row.style.cursor = "pointer";
    row.onclick = () => openBookingDrawer(row.dataset.id);
  });
}

async function openBookingDrawer(bookingId) {
  const booking = DB.bookings.find(b => b.id === bookingId);
  if (!booking) return;
  const drawer = $("#booking-drawer");
  const body = $("#booking-drawer-body");

  body.innerHTML = `
    <div class="drawer-field"><label>Client</label><p>${booking.clientName}</p></div>
    <div class="drawer-field"><label>Service</label><p>${booking.service}</p></div>
    <div class="drawer-field"><label>Date & Time</label><p>${booking.date} at ${booking.time}</p></div>
    <div class="drawer-field"><label>Amount</label><p class="td-mono td-amount">KES ${(booking.amount/1000).toFixed(0)}K</p></div>
    <div class="drawer-field"><label>Status</label><p><span class="badge badge-${booking.status}">${booking.status.charAt(0).toUpperCase()+booking.status.slice(1)}</span></p></div>
    <div class="drawer-field"><label>Contact</label><p>+254 700 000 000</p></div>
  `;

  $("#booking-confirm-btn").onclick = async () => {
    try {
      await apiFetch(`/api/bookings/${bookingId}`, { method:'PATCH', body: JSON.stringify({ status:'confirmed' }) });
      booking.status = 'confirmed';
      drawer.classList.remove("is-open");
      renderBookings(); renderOverview();
      openNotify("Booking confirmed!");
    } catch(err){ openNotify('Failed to confirm', 'red'); }
  };

  drawer.classList.add("is-open");
}

// ──── Clients ─────────────────────────────────────────────────────────────────────────
function setupClients() {}
function renderClients() {
  const grid = $("#clients-grid"); if (!grid) return;
  let html = "";
  DB.clients.forEach(c => {
    html += `<div class="client-card" onclick="openClientDrawer('${c.id}')">
      <div class="cc-top"><div class="cc-avatar" style="background:${c.color}">${c.avatar||c.name.charAt(0)}</div><div><div class="cc-name">${c.name}</div><div class="cc-type">${c.type}</div></div></div>
      <div class="cc-stats">
        <div class="cc-stat"><div class="cc-stat-num">${c.bookings||0}</div><div class="cc-stat-lbl">Bookings</div></div>
        <div class="cc-stat"><div class="cc-stat-num">KES ${((c.totalSpent||0)/1000).toFixed(0)}K</div><div class="cc-stat-lbl">Spent</div></div>
        <div class="cc-stat"><div class="cc-stat-num">${relDays(c.lastActive||c.created||TODAY_STR)}</div><div class="cc-stat-lbl">Active</div></div>
      </div></div>`;
  });
  grid.innerHTML = html;
}

async function openClientDrawer(clientId) {
  const client = DB.clients.find(c => c.id === clientId);
  if (!client) return;
  const drawer = $("#client-drawer");
  const body = $("#client-drawer-body");

  body.innerHTML = `
    <div class="drawer-field"><label>Name</label><p>${client.name}</p></div>
    <div class="drawer-field"><label>Type</label><p>${client.type}</p></div>
    <div class="drawer-field"><label>Total Spent</label><p class="td-mono td-amount">KES ${((client.totalSpent||0)/1000).toFixed(0)}K</p></div>
    <div class="drawer-field"><label>Bookings</label><p>${client.bookings||0} sessions</p></div>
    <div class="drawer-field"><label>Last Active</label><p>${client.lastActive||new Date().toLocaleDateString("en-KE")}</p></div>
    <div class="drawer-field"><label>Contact</label><p>${client.phone||'+254 700 000 000'}</p></div>
  `;

  drawer.classList.add("is-open");
}

// ──── Automation ─────────────────────────────────────────────────────────────────────
function setupAutomation() {
  $("#auto-tabs")?.addEventListener("click", e => {
    if (!e.target.classList.contains("f-tab")) return;
    const tab = e.target.dataset.autotab;
    $$("#auto-tabs .f-tab").forEach(t => t.classList.remove("is-active"));
    e.target.classList.add("is-active");
    $$("#auto-panel-whatsapp, #auto-panel-email, #auto-panel-triggers").forEach(p => p.style.display = "none");
    $(`#auto-panel-${tab}`).style.display = "block";
  });

  $("#btn-compose-wa")?.addEventListener("click", () => openComposeModal("whatsapp"));
  $("#btn-compose-email")?.addEventListener("click", () => openComposeModal("email"));
}

function renderAutomation() {
  renderWhatsAppPanel(); renderEmailPanel(); renderTriggersPanel();
}

function renderWhatsAppPanel() {
  const panel = $("#auto-panel-whatsapp"); if (!panel) return;
  panel.innerHTML = `
    <div class="page-hdr" style="padding:0 0 16px;"><h3 style="font-size:15px;font-weight:800">WhatsApp Templates</h3></div>
    <div class="template-grid">
      ${DB.whatsappTemplates.map(t => `
        <div class="template-card">
          <div class="tc-top">
            <div class="tc-icon" style="background:${t.color}20;color:${t.color}"><i class="ti ${t.icon}"></i></div>
            <div><div class="tc-name">${t.name}</div><div class="tc-trigger">⏱ ${t.trigger}</div></div>
          </div>
          <div class="tc-preview">${t.body}</div>
          <div class="tc-footer">
            <div class="tc-sent">📤 ${t.sentCount||0} sent</div>
            <div><button class="btn-icon" title="Edit"><i class="ti ti-pencil"></i></button><button class="btn-icon" title="Duplicate"><i class="ti ti-copy"></i></button></div>
          </div>
        </div>`).join("")}
      <div class="template-card" style="display:flex;align-items:center;justify-content:center;height:140px;border:2px dashed var(--gray-200);cursor:pointer;color:var(--gray-400)" id="btn-add-wa-template">
        <i class="ti ti-plus" style="font-size:24px"></i>
      </div>
    </div>`;
  $("#btn-add-wa-template").addEventListener("click", () => openNotify("Add WhatsApp template flow would open here"));
}

function renderEmailPanel() {
  const panel = $("#auto-panel-email"); if (!panel) return;
  panel.innerHTML = `
    <div class="page-hdr" style="padding:0 0 16px;"><h3 style="font-size:15px;font-weight:800">Email Templates</h3></div>
    <div class="template-grid">
      ${DB.emailTemplates.map(t => `
        <div class="template-card">
          <div class="tc-top">
            <div class="tc-icon" style="background:${t.color}20;color:${t.color}"><i class="ti ${t.icon}"></i></div>
            <div><div class="tc-name">${t.name}</div><div class="tc-trigger">⏱ ${t.trigger}</div></div>
          </div>
          <div class="tc-preview">${t.body}</div>
          <div class="tc-footer">
            <div class="tc-sent">📤 ${t.sentCount||0} sent</div>
            <div><button class="btn-icon" title="Edit"><i class="ti ti-pencil"></i></button><button class="btn-icon" title="Duplicate"><i class="ti ti-copy"></i></button></div>
          </div>
        </div>`).join("")}
      <div class="template-card" style="display:flex;align-items:center;justify-content:center;height:140px;border:2px dashed var(--gray-200);cursor:pointer;color:var(--gray-400)" id="btn-add-email-template">
        <i class="ti ti-plus" style="font-size:24px"></i>
      </div>
    </div>`;
  $("#btn-add-email-template").addEventListener("click", () => openNotify("Add email template flow would open here"));
}

function renderTriggersPanel() {
  const panel = $("#auto-panel-triggers"); if (!panel) return;
  panel.innerHTML = `<div class="trigger-list">${DB.triggers.map(t => `
    <div class="trigger-row">
      <div class="tr-icon" style="background:${t.iconColor}20;color:${t.iconColor}"><i class="ti ${t.icon}"></i></div>
      <div class="tr-info"><div class="tr-name">${t.name}</div><div class="tr-desc">Automatically sent when ${t.name.toLowerCase()} occurs</div></div>
      <div class="tr-arrow"><i class="ti ti-chevron-right"></i></div>
      <label class="toggle"><input type="checkbox" ${t.enabled?"checked":""} onchange="toggleTrigger('${t.id}',this.checked)"><span class="toggle-slider"></span></label>
    </div>`).join("")}</div>`;
}

function toggleTrigger(triggerId, enabled) {
  const trigger = DB.triggers.find(t => t.id === triggerId);
  if (trigger) { trigger.enabled = enabled; openNotify(`Trigger "${trigger.name}" ${enabled?"enabled":"disabled"}`); }
}

// ──── Analytics ──────────────────────────────────────────────────────────────────────
function setupAnalytics() {
  $("#analytics-range")?.addEventListener("click", e => {
    if (e.target.classList.contains("f-tab")) {
      document.querySelectorAll("#analytics-range .f-tab").forEach(t => t.classList.remove("is-active"));
      e.target.classList.add("is-active");
      renderAnalytics();
    }
  });
}

function renderAnalytics() {
  renderAnalyticsKPIs();
  renderRevenueChart();
  renderFunnelChart();
  renderBookingsChart();
  renderServiceMix();
  renderSourceMix();
  renderTopClients();
}

function renderAnalyticsKPIs() {
  const container = $("#analytics-kpis"); if (!container) return;
  const totalRevenue = DB.revenueHistory.reduce((s,m)=>s+m.value,0);
  const winRate = Math.round((DB.leads.filter(l=>l.stage==="won").length/DB.leads.length)*100)||0;
  container.innerHTML = `
    <div class="kpi-card c-green">
      <div class="kpi-icon green"><i class="ti ti-currency-shilling"></i></div>
      <div class="kpi-val">KES ${(totalRevenue/1000000).toFixed(1)}M</div>
      <div class="kpi-lbl">Total Revenue (6 mo)</div><div class="kpi-delta up"><i class="ti ti-arrow-up"></i> 18%</div>
    </div>
    <div class="kpi-card c-blue">
      <div class="kpi-icon blue"><i class="ti ti-calendar-event"></i></div>
      <div class="kpi-val">${DB.bookings.length}</div>
      <div class="kpi-lbl">Total Bookings</div><div class="kpi-delta up"><i class="ti ti-arrow-up"></i> 12%</div>
    </div>
    <div class="kpi-card c-purple">
      <div class="kpi-icon purple"><i class="ti ti-users"></i></div>
      <div class="kpi-val">${DB.clients.length}</div>
      <div class="kpi-lbl">Clients</div><div class="kpi-delta up"><i class="ti ti-user-plus"></i> +${randInt(3,8)}</div>
    </div>
    <div class="kpi-card c-teal">
      <div class="kpi-icon teal"><i class="ti ti-percentage"></i></div>
      <div class="kpi-val">${winRate}%</div>
      <div class="kpi-lbl">Win Rate</div><div class="kpi-delta down"><i class="ti ti-arrow-down"></i> 2%</div>
    </div>`;
}

function renderRevenueChart() {
  const container = $("#rev-chart"); const labelsContainer = $("#rev-labels"); if (!container||!labelsContainer) return;
  const range = parseInt($("#analytics-range").querySelector(".f-tab.is-active").dataset.range)||30;
  const data = DB.revenueHistory.slice(-Math.min(6, range/30));
  const maxVal = Math.max(...data.map(d=>d.value));
  let html = ""; data.forEach(d => { const h = (d.value/maxVal)*100; html += `<div class="bar-col" style="height:110px"><div class="bar" style="height:${h}%" title="KES ${(d.value/1000).toFixed(0)}K"></div><div class="bar-lbl">${d.month}</div></div>`; });
  container.innerHTML = html;
  let lbls = ""; data.forEach(d => { lbls += `<span style="font-size:10px;color:var(--gray-400);text-align:center;flex:1">${d.month}</span>`; });
  labelsContainer.innerHTML = lbls;
}

function renderFunnelChart() {
  const container = $("#funnel-chart"); if (!container) return;
  const stages = [
    { name:"New", count: DB.leads.filter(l=>l.stage==="new").length },
    { name:"Contacted", count: DB.leads.filter(l=>l.stage==="contacted").length },
    { name:"Qualified", count: DB.leads.filter(l=>l.stage==="qualified").length },
    { name:"Proposal", count: DB.leads.filter(l=>l.stage==="proposal").length },
    { name:"Won", count: DB.leads.filter(l=>l.stage==="won").length },
  ];
  const max = Math.max(...stages.map(s=>s.count));
  let html = ""; stages.forEach(s => {
    const pct = max ? (s.count/max)*100 : 0;
    html += `<div class="funnel-row"><div class="funnel-label">${s.name}</div><div class="funnel-bar-wrap"><div class="funnel-bar-fill" style="width:${pct}%;background:var(--green)"><span class="funnel-count">${s.count}</span></div></div></div>`;
  });
  container.innerHTML = html;
}

function renderBookingsChart() {
  const container = $("#bookings-chart"); const labelsContainer = $("#bookings-chart-labels"); if (!container||!labelsContainer) return;
  const data = DB.bookingsByMonth.slice(-6); const max = Math.max(...data.map(d=>d.bookings));
  let html = ""; data.forEach(d => { const h = (d.bookings/max)*100; html += `<div class="bar-col" style="height:110px"><div class="bar" style="height:${h}%;background:var(--blue)"></div><div class="bar-lbl">${d.month}</div></div>`; });
  container.innerHTML = html;
  let lbls = ""; data.forEach(d => { lbls += `<span style="font-size:10px;color:var(--gray-400);text-align:center;flex:1">${d.month.slice(0,3)}</span>`; });
  labelsContainer.innerHTML = lbls;
}

function renderServiceMix() {
  const container = $("#service-mix"); if (!container) return;
  const counts = {}; DB.bookings.forEach(b => { counts[b.service] = (counts[b.service]||0)+1; });
  const services = Object.entries(counts).sort((a,b)=>b[1]-a[1]); const max = Math.max(...services.map(s=>s[1]));
  let html = ""; services.forEach(([svc,cnt]) => {
    const pct = ((cnt/max)*100).toFixed(0);
    html += `<div class="funnel-row"><div class="funnel-label" style="width:100px">${svc}</div><div class="funnel-bar-wrap"><div class="funnel-bar-fill" style="width:${pct}%;background:var(--teal)"><span class="funnel-count">${cnt}</span></div></div><div class="funnel-pct">${pct}%</div></div>`;
  });
  container.innerHTML = html;
}

function renderSourceMix() {
  const container = $("#source-mix"); if (!container) return;
  const counts = {}; DB.leads.forEach(l => { counts[l.source] = (counts[l.source]||0)+1; });
  const sources = Object.entries(counts).sort((a,b)=>b[1]-a[1]); const max = Math.max(...sources.map(s=>s[1]));
  let html = ""; sources.forEach(([src,cnt]) => {
    const pct = ((cnt/max)*100).toFixed(0);
    html += `<div class="funnel-row"><div class="funnel-label" style="width:90px">${src}</div><div class="funnel-bar-wrap"><div class="funnel-bar-fill" style="width:${pct}%;background:var(--purple)"><span class="funnel-count">${cnt}</span></div></div><div class="funnel-pct">${pct}%</div></div>`;
  });
  container.innerHTML = html;
}

function renderTopClients() {
  const tbody = $("#top-clients-tbody"); if (!tbody) return;
  // Sort by spent (topClients from analytics already sorted)
  const clients = DB.topClients || DB.clients.slice(0,5);
  let html = "";
  clients.forEach(c => {
    html += `<tr><td><div class="td-flex"><div class="c-avatar" style="background:${c.color||'#3b82f6'}">${(c.avatar||c.name.charAt(0)).toUpperCase()}</div><div class="td-primary">${c.name}</div></div></td>
      <td class="td-sub">${c.type||'Client'}</td><td class="td-mono">${c.bookings||0}</td><td class="td-amount td-mono">KES ${((c.totalSpent||c.spent||0)/1000).toFixed(0)}K</td>
      <td class="td-sub">${relDays(c.lastActive||c.created||TODAY_STR)}</td><td class="td-amount td-mono" style="font-weight:900">KES ${((c.totalSpent||c.spent||0)/1000).toFixed(0)}K</td></tr>`;
  });
  tbody.innerHTML = html;
}

// ──── Settings ───────────────────────────────────────────────────────────────────────
function setupSettings() {}
function renderSettings() {
  renderIntegrations(); renderNotificationSettings();
}

function renderIntegrations() {
  const container = $("#integrations-list"); if (!container) return;
  let html = "";
  DB.integrations.forEach(int => {
    const statusColor = int.status==="connected"?"var(--green)":"var(--gray-400)";
    const statusText = int.status==="connected"?"Connected":"Not Connected";
    html += `<div class="mini-stat">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:var(--r-md);background:var(--gray-100);display:flex;align-items:center;justify-content:center;color:var(--gray-600)"><i class="ti ${int.icon}"></i></div>
        <div><div style="font-size:13px;font-weight:600;color:var(--black)">${int.name}</div><div style="font-size:11px;color:var(--gray-400)">${int.desc}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:${statusColor}"></div><span style="font-size:12px;color:var(--gray-600)">${statusText}</span></div>
    </div>`;
  });
  container.innerHTML = html;
}

function renderNotificationSettings() {
  const container = $("#notif-settings"); if (!container) return;
  let html = "";
  DB.notificationSettings.forEach(setting => {
    html += `<div class="mini-stat" style="justify-content:space-between;align-items:center">
      <div class="ms-label">${setting.setting}</div>
      <label class="toggle"><input type="checkbox" ${setting.enabled?"checked":""} onchange="toggleNotifSetting(this,'${setting.setting}')"><span class="toggle-slider"></span></label>
    </div>`;
  });
  container.innerHTML = html;
}

function toggleNotifSetting(checkbox, settingName) {
  const setting = DB.notificationSettings.find(s => s.setting === settingName);
  if (setting) { setting.enabled = checkbox.checked; openNotify(`${settingName} notifications ${checkbox.checked?"enabled":"disabled"}`); }
}

// ──── Notifications Panel ────────────────────────────────────────────────────────────
function setupNotifications() {
  const notifBtn = $("#btn-notif"); const panel = $("#notif-panel"); const overlay = $("#overlay");
  notifBtn?.addEventListener("click", () => {
    notificationsOpen = !notificationsOpen;
    panel.classList.toggle("is-open", notificationsOpen);
  });
  overlay?.addEventListener("click", closeAllOverlays);
  $("#mark-all-read")?.addEventListener("click", async () => {
    // In a real app, call API to mark all as read
    DB.notifications.forEach(n => n.read = true);
    renderNotifications();
    openNotify("All notifications marked as read");
  });
}

function renderNotifications() {
  const list = $("#np-list"); if (!list) return;
  let html = "";
  DB.notifications.forEach(n => {
    html += `<div class="np-item ${n.read?"":"unread"}" onclick="markNotifRead('${n.id}')">
      <div class="np-icon" style="background:${n.color||'var(--blue)'}20;color:${n.color||'var(--blue)'}"><i class="ti ${n.icon}"></i></div>
      <div class="np-text"><strong>${n.text}</strong><br><span class="np-time">${n.time}</span></div>
    </div>`;
  });
  list.innerHTML = html;
}

function markNotifRead(notifId) {
  const notif = DB.notifications.find(n => n.id === notifId);
  if (notif) { notif.read = true; renderNotifications(); }
}

// ──── Modals & Drawers ───────────────────────────────────────────────────────────────
function setupModalsAndDrawers() {
  $("#close-booking-drawer")?.addEventListener("click", () => $("#booking-drawer").classList.remove("is-open"));
  $("#booking-close-btn")?.addEventListener("click", () => $("#booking-drawer").classList.remove("is-open"));
  $("#close-client-drawer")?.addEventListener("click", () => $("#client-drawer").classList.remove("is-open"));
  $("#client-close-btn")?.addEventListener("click", () => $("#client-drawer").classList.remove("is-open"));
  $("#close-lead-drawer")?.addEventListener("click", () => $("#lead-drawer").classList.remove("is-open"));
  $("#lead-close-btn")?.addEventListener("click", () => $("#lead-drawer").classList.remove("is-open"));
  $("#close-compose")?.addEventListener("click", closeComposeModal);
  $("#btn-new-lead")?.addEventListener("click", () => openNotify("New lead form would open here"));
  $("#btn-new-booking")?.addEventListener("click", () => openNotify("New booking form would open here"));
  $("#btn-quick-wa")?.addEventListener("click", () => openComposeModal("whatsapp"));
  $("#client-wa-btn")?.addEventListener("click", () => openComposeModal("whatsapp"));
  $("#client-email-btn")?.addEventListener("click", () => openComposeModal("email"));
  $("#lead-wa-btn")?.addEventListener("click", () => openComposeModal("whatsapp"));
}

function closeAllOverlays() {
  $$(".overlay, .drawer, .modal").forEach(el => el.classList.remove("is-active"));
  notificationsOpen = false;
}

function openComposeModal(channel) {
  const modal = $("#compose-modal");
  const title = $("#compose-modal-title");
  const body = $("#compose-modal-body");
  const footer = $("#compose-modal-footer");

  const channelConfig = {
    whatsapp: { title: "Send WhatsApp", icon: "ti-brand-whatsapp", placeholder: "Type your WhatsApp message…", color: "var(--wa)" },
    email: { title: "Compose Email", icon: "ti-mail", placeholder: "Type your email message…", color: "var(--blue)" }
  };
  const cfg = channelConfig[channel];

  title.innerHTML = `<i class="ti ${cfg.icon}" style="color:${cfg.color};margin-right:8px"></i>${cfg.title}`;
  body.innerHTML = `
    <div class="form-field"><label>Recipients</label><div class="recipient-chip"><div class="r-chip-avatar" style="background:var(--black)">${DB.currentUser.initials}</div><span class="r-chip-name">${DB.currentUser.name}</span></div></div>
    <div class="form-field"><label>Message</label><textarea placeholder="${cfg.placeholder}" rows="5">Hi! This is an automated ${channel} message from Savvion.</textarea></div>
    <div class="form-field"><label>Preview</label><div class="msg-preview ${channel==="whatsapp"?"wa-preview":""}">Hi! This is an automated ${channel} message from Savvion.</div></div>
  `;
  footer.innerHTML = `
    <button class="btn btn-ghost" onclick="closeComposeModal()">Cancel</button>
    <button class="btn ${channel==='whatsapp'?'btn-wa':'btn-dark'}" onclick="sendMessage('${channel}')"><i class="ti ${cfg.icon}"></i> Send</button>
  `;

  modal.classList.add("is-open"); $("#overlay").classList.add("is-active");
}

function closeComposeModal() {
  $("#compose-modal").classList.remove("is-open"); $("#overlay").classList.remove("is-active");
}

async function sendMessage(channel) {
  closeComposeModal();
  try {
    await apiFetch('/api/automation/send', {
      method: 'POST',
      body: JSON.stringify({ channel, recipient: 'demo', templateId: 1, variables: { name: 'Demo' } })
    });
    openNotify(`${channel.charAt(0).toUpperCase()+channel.slice(1)} message sent successfully!`);
  } catch (err) {
    openNotify('Failed to send message', 'red');
  }
}

function composeEmail(name, email) { openComposeModal("email"); }

function openNotify(message) {
  const notifPanel = $("#notif-panel");
  if(notifPanel) notifPanel.classList.add("is-open");
  DB.notifications.unshift({
    id: Math.random().toString(36).slice(2,9),
    read: false, icon: "ti-info-circle", color: "var(--blue)",
    text: message, time: "Just now"
  });
  renderNotifications();
  setTimeout(() => { if(notifPanel) notifPanel.classList.remove("is-open"); }, 3000);
}

// ──── Search ─────────────────────────────────────────────────────────────────────────
function setupSearch() {
  const globalSearch = $("#global-search"); if (!globalSearch) return;
  globalSearch.addEventListener("input", e => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) return;
    // Basic console log - could be enhanced with search overlay
    console.log("Searching:", query);
  });
}

// ──── Expose globals ──────────────────────────────────────────────────────────────────
window.openLeadDrawer = openLeadDrawer;
window.composeEmail = composeEmail;
window.openBookingDrawer = openBookingDrawer;
window.openClientDrawer = openClientDrawer;
window.toggleTrigger = toggleTrigger;
window.toggleNotifSetting = toggleNotifSetting;
window.sendMessage = sendMessage;
window.closeComposeModal = closeComposeModal;
window.updateLeadStage = updateLeadStage;
