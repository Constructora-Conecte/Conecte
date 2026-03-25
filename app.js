// ═══════════════════════════════════════════════════════
//  CONSTRUCTORA CONECTE — App Core
// ═══════════════════════════════════════════════════════

// ── STATE ───────────────────────────────────────────────
const State = {
  user: null,
  view: 'dashboard',
  notifications: [],
  unreadCount: 0,
  cotizacion: { conceptos: [] },
  data: {},  // local cache of loaded data
};

// ── TOAST ───────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'i' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-weight:700">${icons[type]}</span> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── LOADING ──────────────────────────────────────────────
function setLoading(tableId, cols, show) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  if (show) {
    tbody.innerHTML = `<tr class="loading-row"><td colspan="${cols}"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
  }
}

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  const correo = document.getElementById('login-email').value.trim();
  const pass   = document.getElementById('login-pass').value;
  const err    = document.getElementById('login-err');
  const btn    = document.getElementById('login-btn');

  if (!correo || !pass) { showErr(err, 'Completa todos los campos'); return; }

  btn.innerHTML = '<div class="spinner" style="margin:0 auto;border-top-color:#fff"></div>';
  btn.disabled = true;
  err.classList.remove('show');

  try {
    const user = await SheetsDB.login(correo, pass);
    if (!user) { showErr(err, 'Correo o contraseña incorrectos'); return; }
    State.user = user;
    localStorage.setItem('conecte_user', JSON.stringify(user));
    initApp();
  } catch(ex) {
    showErr(err, 'Error de conexión. Verifica el Spreadsheet ID.');
  } finally {
    btn.innerHTML = 'Ingresar';
    btn.disabled = false;
  }
}

function showErr(el, msg) { el.textContent = msg; el.classList.add('show'); }

function handleLogout() {
  State.user = null;
  localStorage.removeItem('conecte_user');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').classList.remove('hidden');
  SheetsDB.Cache.clearAll();
}

// ══════════════════════════════════════════════════════
//  INIT APP
// ══════════════════════════════════════════════════════
function initApp() {
  document.getElementById('login-screen').classList.add('hidden');
  const app = document.getElementById('app');
  app.classList.add('visible');

  const u = State.user;
  const role = u.AREA || 'Operativo';

  // Avatar color by role
  const avatarColors = { Patron: '#e8a020', Administrativo: '#c8102e', Operativo: '#3b82f6' };
  const aColor = avatarColors[role] || '#888';
  const initial = (u.NOMBRE_CREADOR || 'U').charAt(0).toUpperCase();

  // Sidebar user info
  document.getElementById('sb-avatar').style.background = aColor;
  document.getElementById('sb-avatar').textContent = initial;
  document.getElementById('sb-uname').textContent = u.NOMBRE_CREADOR || correo;
  const badge = document.getElementById('sb-role-badge');
  badge.textContent = role;
  badge.className = `sb-role role-${role.toLowerCase()}`;

  // Build nav based on role
  buildNav(role);

  // Load notifications
  loadNotifications();
  setInterval(loadNotifications, 30000);

  // Navigate to default view
  navigateTo('dashboard');
}

// ══════════════════════════════════════════════════════
//  NAV BUILDER
// ══════════════════════════════════════════════════════
const NAV_ITEMS = {
  Patron: [
    { id: 'dashboard',    icon: icons.grid,    label: 'Dashboard',       section: 'General' },
    { id: 'cotizaciones', icon: icons.doc,     label: 'Cotizaciones',    section: 'General' },
    { id: 'facturas',     icon: icons.receipt, label: 'Facturas',        section: 'General' },
    { id: 'oc-clientes',  icon: icons.bag,     label: 'OC Clientes',     section: 'General' },
    { id: 'ordenes',      icon: icons.wrench,  label: 'Órdenes Trabajo', section: 'Operativo' },
    { id: 'tickets',      icon: icons.ticket,  label: 'Tickets',         section: 'Operativo' },
    { id: 'inventario',   icon: icons.box,     label: 'Inventario',      section: 'Operativo' },
    { id: 'nomina',       icon: icons.money,   label: 'Nómina',          section: 'RRHH' },
    { id: 'empleados',    icon: icons.users,   label: 'Empleados',       section: 'RRHH' },
    { id: 'vehiculos',    icon: icons.car,     label: 'Vehículos',       section: 'RRHH' },
    { id: 'tareas',       icon: icons.check,   label: 'Asignar Tareas',  section: 'Admin' },
    { id: 'contrasenas',  icon: icons.lock,    label: 'Contraseñas',     section: 'Admin' },
    { id: 'aires',        icon: icons.wind,    label: 'Inf. Aires',      section: 'Técnico' },
  ],
  Administrativo: [
    { id: 'cotizaciones', icon: icons.doc,     label: 'Cotizaciones',    section: 'General' },
    { id: 'facturas',     icon: icons.receipt, label: 'Facturas',        section: 'General' },
    { id: 'oc-clientes',  icon: icons.bag,     label: 'OC Clientes',     section: 'General' },
    { id: 'ordenes',      icon: icons.wrench,  label: 'Órdenes Trabajo', section: 'Operativo' },
    { id: 'tickets',      icon: icons.ticket,  label: 'Tickets',         section: 'Operativo' },
    { id: 'inventario',   icon: icons.box,     label: 'Inventario',      section: 'Operativo' },
    { id: 'empleados',    icon: icons.users,   label: 'Empleados',       section: 'RRHH' },
    { id: 'vehiculos',    icon: icons.car,     label: 'Vehículos',       section: 'RRHH' },
  ],
  Operativo: [
    { id: 'ordenes',    icon: icons.wrench, label: 'Órdenes Trabajo', section: 'Trabajo' },
    { id: 'inventario', icon: icons.box,    label: 'Inventario',      section: 'Trabajo' },
    { id: 'vehiculos',  icon: icons.car,    label: 'Vehículos',       section: 'Trabajo' },
    { id: 'aires',      icon: icons.wind,   label: 'Inf. Aires',      section: 'Técnico' },
  ],
};

function buildNav(role) {
  const items = NAV_ITEMS[role] || NAV_ITEMS.Operativo;
  const nav = document.getElementById('sb-nav');
  let currentSection = '';
  let html = '';

  items.forEach(item => {
    if (item.section !== currentSection) {
      currentSection = item.section;
      html += `<div class="sb-section">
        <div class="sb-section-lbl">${item.section}</div>`;
    }
    html += `<div class="nav-item" data-view="${item.id}" onclick="navigateTo('${item.id}')">
      <span class="nav-ico">${item.icon}</span>
      <span class="nav-lbl">${item.label}</span>
    </div>`;
  });
  html += '</div>';
  nav.innerHTML = html;
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
const VIEW_LOADERS = {
  dashboard:    loadDashboard,
  cotizaciones: loadCotizaciones,
  facturas:     loadFacturas,
  'oc-clientes':loadOCClientes,
  ordenes:      loadOrdenes,
  tickets:      loadTickets,
  inventario:   loadInventario,
  nomina:       loadNomina,
  empleados:    loadEmpleados,
  vehiculos:    loadVehiculos,
  tareas:       loadTareas,
  contrasenas:  loadContrasenas,
  aires:        loadAires,
};

function navigateTo(viewId) {
  State.view = viewId;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewId);
  });

  // Update topbar title
  const allItems = Object.values(NAV_ITEMS).flat();
  const item = allItems.find(i => i.id === viewId);
  document.getElementById('topbar-title').textContent = item?.label || 'Panel';

  // Show correct view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewEl = document.getElementById(`view-${viewId}`);
  if (viewEl) viewEl.classList.add('active');

  // Load data
  const loader = VIEW_LOADERS[viewId];
  if (loader) loader();
}

// ══════════════════════════════════════════════════════
//  NOTIFICATIONS (Tiempo Real)
// ══════════════════════════════════════════════════════
async function loadNotifications() {
  // Notificaciones almacenadas en localStorage por ahora
  // Con OAuth se migraría a un webhook en tiempo real
  const stored = JSON.parse(localStorage.getItem('conecte_notifs') || '[]');
  const myNotifs = stored.filter(n =>
    n.to === State.user?.CORREO_CREADOR ||
    n.to === State.user?.ID_USUARIO_CREADOR
  );
  State.notifications = myNotifs;
  State.unreadCount = myNotifs.filter(n => !n.read).length;

  // Update badge
  const badge = document.getElementById('notif-badge');
  if (State.unreadCount > 0) {
    badge.textContent = State.unreadCount > 9 ? '9+' : State.unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  renderNotifList();
}

function renderNotifList() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!State.notifications.length) {
    list.innerHTML = `<div class="empty-state"><p>Sin notificaciones</p></div>`;
    return;
  }
  list.innerHTML = State.notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
      <div class="ni-title">${n.title}</div>
      <div class="ni-body">${n.body}</div>
      <div class="ni-time">${formatDate(n.ts)}</div>
    </div>
  `).join('');
}

function markNotifRead(id) {
  const stored = JSON.parse(localStorage.getItem('conecte_notifs') || '[]');
  const idx = stored.findIndex(n => n.id === id);
  if (idx !== -1) { stored[idx].read = true; localStorage.setItem('conecte_notifs', JSON.stringify(stored)); }
  loadNotifications();
}

function markAllRead() {
  const stored = JSON.parse(localStorage.getItem('conecte_notifs') || '[]');
  stored.forEach(n => { if (n.to === State.user?.CORREO_CREADOR) n.read = true; });
  localStorage.setItem('conecte_notifs', JSON.stringify(stored));
  loadNotifications();
}

function sendNotification(toUserId, title, body) {
  const stored = JSON.parse(localStorage.getItem('conecte_notifs') || '[]');
  stored.push({ id: SheetsDB.genId(), to: toUserId, title, body, ts: new Date().toISOString(), read: false });
  localStorage.setItem('conecte_notifs', JSON.stringify(stored));
}

function toggleNotifPanel() {
  document.getElementById('notif-panel').classList.toggle('open');
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
async function loadDashboard() {
  const view = document.getElementById('view-dashboard');

  try {
    const [facturas, tickets, cotizaciones, ordenes] = await Promise.all([
      SheetsDB.read('FACTURAS'),
      SheetsDB.read('CXP'),
      SheetsDB.read('COTIZACIONES'),
      SheetsDB.read('ORDENES_TRABAJO'),
    ]);

    const totalIngresos = facturas.filter(f => f.Estatus === 'Pagado')
      .reduce((s, f) => s + (parseFloat(f.Monto_total) || 0), 0);
    const totalEgresos = tickets.filter(t => t.Estado === 'Pagado')
      .reduce((s, t) => s + (parseFloat(t.MONTO) || 0), 0);
    const cotActivas = cotizaciones.filter(c => c.ESTATUS_COT !== 'Cancelado').length;
    const ordenesAbiertas = ordenes.filter(o => o.ESTATUS !== 'Cerrada' && o.ESTATUS !== 'Cancelada').length;

    view.innerHTML = `
      <div class="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general · ${new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
      </div>

      <div class="stats-grid stats-grid-4" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-ico" style="background:var(--green-soft)">${icons.arrow_up_circle('var(--green)')}</div>
          <div class="stat-label">Ingresos totales</div>
          <div class="stat-value" style="color:var(--green)">${fmt(totalIngresos)}</div>
          <div class="stat-sub">Facturas pagadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico" style="background:var(--accent-soft)">${icons.arrow_down_circle('var(--accent)')}</div>
          <div class="stat-label">Egresos</div>
          <div class="stat-value" style="color:var(--accent)">${fmt(totalEgresos)}</div>
          <div class="stat-sub">Cuentas por pagar pagadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico" style="background:var(--gold-soft)">${icons.doc_circle('var(--gold)')}</div>
          <div class="stat-label">Balance</div>
          <div class="stat-value" style="color:${totalIngresos - totalEgresos >= 0 ? 'var(--green)' : 'var(--accent)'}">${fmt(totalIngresos - totalEgresos)}</div>
          <div class="stat-sub">Ingresos − Egresos</div>
        </div>
        <div class="stat-card">
          <div class="stat-ico" style="background:var(--blue-soft)">${icons.wrench_circle('var(--blue)')}</div>
          <div class="stat-label">Órdenes abiertas</div>
          <div class="stat-value" style="color:var(--blue)">${ordenesAbiertas}</div>
          <div class="stat-sub">${cotActivas} cotizaciones activas</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        ${renderRecentCotizaciones(cotizaciones.slice(-5).reverse())}
        ${renderRecentFacturas(facturas.slice(-5).reverse())}
      </div>
    `;
  } catch(e) {
    view.innerHTML = `<div class="page-header"><h2>Dashboard</h2></div>
      <div class="card"><p style="color:var(--text2)">Configura los Spreadsheet IDs en sheets.js para ver los datos.</p></div>`;
  }
}

function renderRecentCotizaciones(items) {
  return `
    <div class="tbl-wrap">
      <div class="tbl-header"><h3>Cotizaciones recientes</h3><button class="btn btn-ghost btn-sm" onclick="navigateTo('cotizaciones')">Ver todas</button></div>
      <table><thead><tr><th>Folio</th><th>Cliente</th><th>Total</th><th>Estatus</th></tr></thead>
      <tbody>${items.map(c => `
        <tr>
          <td class="primary">${c.NO_COTIZACION || c.NUMERO || '—'}</td>
          <td>${c.CLIENTE || '—'}</td>
          <td>${fmt(c.TOTAL)}</td>
          <td>${pillEstatus(c.ESTATUS_COT || c.ESTADO)}</td>
        </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Sin datos</td></tr>'}
      </tbody></table>
    </div>`;
}

function renderRecentFacturas(items) {
  return `
    <div class="tbl-wrap">
      <div class="tbl-header"><h3>Facturas recientes</h3><button class="btn btn-ghost btn-sm" onclick="navigateTo('facturas')">Ver todas</button></div>
      <table><thead><tr><th>Folio</th><th>Concepto</th><th>Monto</th><th>Estatus</th></tr></thead>
      <tbody>${items.map(f => `
        <tr>
          <td class="primary">${f.Folio || '—'}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${(f.Concepto || '').substring(0,40) || '—'}</td>
          <td>${fmt(f.Monto_total)}</td>
          <td>${pillEstatus(f.Estatus)}</td>
        </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Sin datos</td></tr>'}
      </tbody></table>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  COTIZACIONES
// ══════════════════════════════════════════════════════
async function loadCotizaciones() {
  const view = document.getElementById('view-cotizaciones');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Cotizaciones</h2><p>Gestión completa con conceptos y PDF</p></div>
      <div class="page-actions">
        <div class="search-wrap">${icons.search_ico}<input type="text" id="cot-search" placeholder="Buscar cotización..." oninput="filterCotizaciones(this.value)"></div>
        <button class="btn btn-accent" onclick="openCotizacionModal()">${icons.plus} Nueva cotización</button>
      </div>
    </div>
    <div class="tbl-wrap" id="cot-table-wrap">
      <table id="cot-table">
        <thead><tr>
          <th>Folio</th><th>ID Cotización</th><th>Fecha</th><th>Cliente</th>
          <th>Total</th><th>Estatus</th><th>Estado PDF</th><th>Acciones</th>
        </tr></thead>
        <tbody id="cot-tbody"><tr class="loading-row"><td colspan="8"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;

  try {
    const [cots, clientes] = await Promise.all([SheetsDB.read('COTIZACIONES'), SheetsDB.read('CLIENTES')]);
    State.data.cotizaciones = cots;
    State.data.clientes = clientes;
    renderCotizacionesTable(cots);
  } catch(e) { toast('Error cargando cotizaciones', 'error'); }
}

function renderCotizacionesTable(cots) {
  const tbody = document.getElementById('cot-tbody');
  if (!tbody) return;
  if (!cots.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin cotizaciones</td></tr>`;
    return;
  }
  tbody.innerHTML = cots.map((c, i) => `
    <tr>
      <td class="primary">${c.NO_COTIZACION || c.NUMERO || '—'}</td>
      <td style="font-size:11px;color:var(--text3);font-family:monospace">${(c.ID_COTIZACION || '').substring(0,24)}</td>
      <td>${formatDate(c.FECHA)}</td>
      <td>${c.CLIENTE || '—'}</td>
      <td><b>${fmt(c.TOTAL)}</b></td>
      <td>${pillEstatus(c.ESTATUS_COT || c.ESTADO)}</td>
      <td>${c.PDF ? '<span class="pill pill-green">PDF</span>' : '<span class="pill pill-gray">Pendiente</span>'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="viewCotizacion(${i})" data-tip="Ver">${icons.eye}</button>
          <button class="btn btn-ghost btn-sm" onclick="editCotizacion(${i})" data-tip="Editar">${icons.edit}</button>
          <button class="btn btn-ghost btn-sm" onclick="generatePDF(${i})" data-tip="PDF">${icons.pdf}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterCotizaciones(q) {
  const data = State.data.cotizaciones || [];
  const filtered = q ? data.filter(c =>
    (c.ID_COTIZACION||'').toLowerCase().includes(q.toLowerCase()) ||
    (c.CLIENTE||'').toLowerCase().includes(q.toLowerCase()) ||
    (c.DESCRIPCION||'').toLowerCase().includes(q.toLowerCase()) ||
    (c.NO_COTIZACION||'').toLowerCase().includes(q.toLowerCase())
  ) : data;
  renderCotizacionesTable(filtered);
}

// ── MODAL COTIZACIÓN ─────────────────────────────────
async function openCotizacionModal(cotData = null) {
  const [clientes, articulos, users] = await Promise.all([
    SheetsDB.read('CLIENTES'),
    SheetsDB.read('ARTICULOS'),
    SheetsDB.read('USERS'),
  ]);
  State.data.articulos = articulos;

  const isEdit = !!cotData;
  const conceptos = cotData?._conceptos || [];

  const clienteOpts = clientes.map(c =>
    `<option value="${c.ID_CLIENTE}" ${cotData?.CLIENTE === c.ID_CLIENTE ? 'selected' : ''}>${c.NOMBRE_CLIENTE} (${c.ID_CLIENTE})</option>`
  ).join('');

  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal modal-xl">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar' : 'Nueva'} Cotización</h3>
        <button class="btn-close" onclick="closeModal()">${icons.x}</button>
      </div>
      <div class="modal-body">
        <div class="form-grid form-grid-3" style="margin-bottom:20px">
          <div class="form-field">
            <label>Cliente *</label>
            <select id="cot-cliente">${clienteOpts}</select>
          </div>
          <div class="form-field">
            <label>Descripción / Proyecto</label>
            <input type="text" id="cot-desc" value="${cotData?.DESCRIPCION || ''}" placeholder="Descripción del proyecto">
          </div>
          <div class="form-field">
            <label>Fecha</label>
            <input type="date" id="cot-fecha" value="${cotData?.FECHA ? cotData.FECHA.substring(0,10) : new Date().toISOString().substring(0,10)}">
          </div>
          <div class="form-field">
            <label>Vigencia (días)</label>
            <input type="number" id="cot-vigencia" value="${cotData?.VIGENCIA || 20}">
          </div>
          <div class="form-field">
            <label>Retención %</label>
            <input type="number" id="cot-retencion" value="${cotData?.RETENCION || 0}" step="0.01">
          </div>
          <div class="form-field">
            <label>Notas</label>
            <input type="text" id="cot-notas" value="${cotData?.NOTAS_COTIZACION || ''}" placeholder="Notas adicionales">
          </div>
        </div>

        <!-- CONCEPTOS -->
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <h4 style="font-family:var(--font-h);font-size:14px">Conceptos</h4>
            <button class="btn btn-ghost btn-sm" onclick="addConcepto()">${icons.plus} Agregar concepto</button>
          </div>
          <div style="position:relative">
            <div id="ac-dropdown" class="autocomplete-list" style="display:none;position:absolute;z-index:300"></div>
          </div>
          <div style="overflow-x:auto">
            <table class="concept-table" id="concept-table">
              <thead><tr>
                <th style="width:140px">Código / ID</th>
                <th>Concepto</th>
                <th style="width:80px">Cant.</th>
                <th style="width:120px">P. Unitario</th>
                <th style="width:80px">IVA %</th>
                <th style="width:120px">Total</th>
                <th style="width:40px"></th>
              </tr></thead>
              <tbody id="conceptos-tbody"></tbody>
              <tfoot>
                <tr><td colspan="5" style="text-align:right;padding:10px 12px;color:var(--text2);font-size:12px">Subtotal</td>
                    <td id="cot-subtotal" style="padding:10px 12px">$0.00</td><td></td></tr>
                <tr><td colspan="5" style="text-align:right;padding:4px 12px;color:var(--text2);font-size:12px">IVA</td>
                    <td id="cot-iva" style="padding:4px 12px">$0.00</td><td></td></tr>
                <tr><td colspan="5" style="text-align:right;padding:4px 12px;color:var(--text2);font-size:12px">Retención</td>
                    <td id="cot-ret" style="padding:4px 12px">$0.00</td><td></td></tr>
                <tr style="font-size:15px">
                  <td colspan="5" style="text-align:right;padding:10px 12px;font-family:var(--font-h);color:var(--text)">TOTAL</td>
                  <td id="cot-total" style="padding:10px 12px;font-family:var(--font-h);color:var(--accent);font-weight:700">$0.00</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-ghost" onclick="previewCotPDF()">
          ${icons.pdf} Vista previa PDF
        </button>
        <button class="btn btn-accent" onclick="saveCotizacion(${isEdit ? `'${cotData?.ID_COTIZACION}'` : 'null'})">
          ${icons.save} ${isEdit ? 'Guardar cambios' : 'Crear cotización'}
        </button>
      </div>
    </div>
  `;

  // Render existing conceptos
  State.cotizacion.conceptos = conceptos.length ? conceptos : [];
  renderConceptos();
  if (!conceptos.length) addConcepto();
}

function addConcepto() {
  const id = SheetsDB.genId();
  State.cotizacion.conceptos.push({ _id: id, articulo_id: '', nombre: '', cantidad: 1, precio: 0, iva: 0, total: 0 });
  renderConceptos();
}

function removeConcepto(id) {
  State.cotizacion.conceptos = State.cotizacion.conceptos.filter(c => c._id !== id);
  renderConceptos();
}

function renderConceptos() {
  const tbody = document.getElementById('conceptos-tbody');
  if (!tbody) return;
  tbody.innerHTML = State.cotizacion.conceptos.map(c => `
    <tr id="row-${c._id}">
      <td style="position:relative">
        <input type="text" value="${c.articulo_id}" placeholder="Código..."
          oninput="onCodigoInput(this,'${c._id}')"
          onfocus="showAC('${c._id}',this)"
          style="width:100%">
      </td>
      <td>
        <input type="text" id="nombre-${c._id}" value="${c.nombre}" placeholder="Descripción del concepto..."
          oninput="updateConcepto('${c._id}','nombre',this.value)" style="width:100%">
      </td>
      <td>
        <input type="number" value="${c.cantidad}" min="0.01" step="any"
          oninput="updateConcepto('${c._id}','cantidad',this.value)" style="width:70px">
      </td>
      <td>
        <input type="number" id="precio-${c._id}" value="${c.precio}" min="0" step="any"
          oninput="updateConcepto('${c._id}','precio',this.value)" style="width:110px">
      </td>
      <td>
        <input type="number" id="iva-${c._id}" value="${c.iva}" min="0" max="100"
          oninput="updateConcepto('${c._id}','iva',this.value)" style="width:60px">
      </td>
      <td id="total-${c._id}" style="color:var(--text);font-weight:500">${fmt(c.total)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removeConcepto('${c._id}')" style="padding:4px 8px">${icons.trash}</button>
      </td>
    </tr>
  `).join('');
  calcTotals();
}

function updateConcepto(id, field, value) {
  const c = State.cotizacion.conceptos.find(x => x._id === id);
  if (!c) return;
  c[field] = field === 'nombre' ? value : parseFloat(value) || 0;
  c.total = c.cantidad * c.precio;
  const totalEl = document.getElementById(`total-${id}`);
  if (totalEl) totalEl.textContent = fmt(c.total);
  calcTotals();
}

function calcTotals() {
  const ret = parseFloat(document.getElementById('cot-retencion')?.value) || 0;
  const subtotal = State.cotizacion.conceptos.reduce((s, c) => s + c.total, 0);
  const iva = State.cotizacion.conceptos.reduce((s, c) => s + (c.total * c.iva / 100), 0);
  const retention = subtotal * ret / 100;
  const total = subtotal + iva - retention;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
  set('cot-subtotal', subtotal);
  set('cot-iva', iva);
  set('cot-ret', retention);
  set('cot-total', total);
}

// Autocomplete articulos
function onCodigoInput(input, rowId) {
  const q = input.value.toLowerCase();
  const arts = State.data.articulos || [];
  const matches = arts.filter(a =>
    (a.ID_ARTICULO || '').toLowerCase().includes(q) ||
    (a.NOMBRE_ARTICULO || '').toLowerCase().includes(q)
  ).slice(0, 8);

  const dd = document.getElementById('ac-dropdown');
  if (!matches.length || !q) { dd.style.display = 'none'; return; }

  // Position near the input
  const rect = input.getBoundingClientRect();
  const modalRect = document.querySelector('.modal-xl')?.getBoundingClientRect();
  dd.style.display = 'block';
  dd.style.top = (rect.bottom - (modalRect?.top || 0) + 8) + 'px';
  dd.style.left = (rect.left - (modalRect?.left || 0)) + 'px';
  dd.style.width = '420px';
  dd.style.position = 'absolute';

  dd.innerHTML = matches.map(a => `
    <div class="ac-item" onclick="selectArticulo('${rowId}','${a.ID_ARTICULO}')">
      <span class="ac-code">${a.ID_ARTICULO}</span>
      <span class="ac-name">${a.NOMBRE_ARTICULO}</span>
      <span class="ac-price">${fmt(a.PRECIO_ARTICULO)}</span>
    </div>
  `).join('');
}

function showAC(rowId, input) { onCodigoInput(input, rowId); }

function selectArticulo(rowId, artId) {
  const art = (State.data.articulos || []).find(a => a.ID_ARTICULO === artId);
  if (!art) return;
  const c = State.cotizacion.conceptos.find(x => x._id === rowId);
  if (!c) return;

  c.articulo_id = art.ID_ARTICULO;
  c.nombre = `${art.NOMBRE_ARTICULO}${art.DESCRIPCION_ARTICULO ? '\n' + art.DESCRIPCION_ARTICULO : ''}`;
  c.precio = parseFloat(art.PRECIO_ARTICULO) || 0;
  c.iva = parseFloat(art.IMPUESTO_ARTICULO) || 0;
  c.total = c.cantidad * c.precio;

  document.getElementById('ac-dropdown').style.display = 'none';
  renderConceptos();
}

document.addEventListener('click', e => {
  if (!e.target.closest('#ac-dropdown') && !e.target.matches('input[oninput*="onCodigoInput"]')) {
    const dd = document.getElementById('ac-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

// ── SAVE COTIZACIÓN ──────────────────────────────────
async function saveCotizacion(existingId) {
  const clienteEl  = document.getElementById('cot-cliente');
  const descEl     = document.getElementById('cot-desc');
  const fechaEl    = document.getElementById('cot-fecha');
  const vigEl      = document.getElementById('cot-vigencia');
  const retEl      = document.getElementById('cot-retencion');
  const notasEl    = document.getElementById('cot-notas');

  if (!clienteEl?.value) { toast('Selecciona un cliente', 'error'); return; }
  if (!State.cotizacion.conceptos.length) { toast('Agrega al menos un concepto', 'error'); return; }

  const ret       = parseFloat(retEl?.value) || 0;
  const subtotal  = State.cotizacion.conceptos.reduce((s, c) => s + c.total, 0);
  const iva       = State.cotizacion.conceptos.reduce((s, c) => s + (c.total * c.iva / 100), 0);
  const retention = subtotal * ret / 100;
  const total     = subtotal + iva - retention;

  const id = existingId || `${clienteEl.value}-${new Date().toISOString().substring(2,8).replace(/-/g,'')}-${SheetsDB.genId()}`;
  const now = new Date().toISOString();

  const row = {
    NUMERO: '',
    NO_COTIZACION: '',
    ID_COTIZACION: id,
    FECHA: fechaEl?.value || now.substring(0,10),
    CLIENTE: clienteEl.value,
    SUBTOTAL: subtotal.toFixed(2),
    IMPUESTO1: iva.toFixed(2),
    IMPUESTO2: '',
    RETENCION: retention.toFixed(2),
    TOTAL: total.toFixed(2),
    ESTADO: 'Si',
    PDF: '',
    DESCRIPCION: descEl?.value || '',
    NOTAS_COTIZACION: notasEl?.value || '',
    HORA: now.substring(11,19),
    TOTAL_LETRAS: numberToWords(total),
    CREADO: now,
    ACTUALIZACION: now,
    USER_SYSTEM: State.user?.ID_USUARIO_CREADOR || '',
    CONTACTO: '',
    VIGENCIA: vigEl?.value || '20',
    FECHA_VIGENCIA: '',
    F_V_D: '',
    ESTATUS_COT: 'Pendiente',
    OC_RELACION: '',
  };

  try {
    if (existingId) {
      const idx = (State.data.cotizaciones || []).findIndex(c => c.ID_COTIZACION === existingId);
      if (idx >= 0) await SheetsDB.update('COTIZACIONES', idx, row);
    } else {
      await SheetsDB.append('COTIZACIONES', row);
    }

    // Also save estatus
    await SheetsDB.append('ESTATUS', {
      Estatus_id: SheetsDB.genId(),
      ID_COTIZACION: id,
      Precio_prov: '',
      Fecha_envi: now.substring(0,10),
      Estado: 'Creado',
      Responsable: State.user?.ID_USUARIO_CREADOR || '',
      Proyecto: descEl?.value || '',
    });

    toast(existingId ? 'Cotización actualizada' : 'Cotización creada', 'success');
    closeModal();
    SheetsDB.Cache.clear('COTIZACIONES');
    await loadCotizaciones();
  } catch(e) {
    toast('Error guardando cotización: ' + e.message, 'error');
  }
}

// ── GENERATE PDF ─────────────────────────────────────
async function generatePDF(idx) {
  const cot = (State.data.cotizaciones || [])[idx];
  if (!cot) return;

  const cliente = (State.data.clientes || []).find(c => c.ID_CLIENTE === cot.CLIENTE);

  const win = window.open('', '_blank');
  win.document.write(buildCotizacionPDF(cot, cliente, []));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function previewCotPDF() {
  const clienteId = document.getElementById('cot-cliente')?.value;
  const cliente = (State.data.clientes || []).find(c => c.ID_CLIENTE === clienteId);
  const ret = parseFloat(document.getElementById('cot-retencion')?.value) || 0;
  const subtotal = State.cotizacion.conceptos.reduce((s,c) => s + c.total, 0);
  const iva = State.cotizacion.conceptos.reduce((s,c) => s + c.total * c.iva/100, 0);
  const retention = subtotal * ret / 100;
  const total = subtotal + iva - retention;

  const fakeCot = {
    ID_COTIZACION: `PREVIEW-${SheetsDB.genId()}`,
    FECHA: document.getElementById('cot-fecha')?.value || '',
    DESCRIPCION: document.getElementById('cot-desc')?.value || '',
    SUBTOTAL: subtotal, IMPUESTO1: iva, RETENCION: retention, TOTAL: total,
    VIGENCIA: document.getElementById('cot-vigencia')?.value || 20,
    NOTAS_COTIZACION: document.getElementById('cot-notas')?.value || '',
  };

  const win = window.open('', '_blank');
  win.document.write(buildCotizacionPDF(fakeCot, cliente, State.cotizacion.conceptos));
  win.document.close();
}

function buildCotizacionPDF(cot, cliente, conceptos) {
  const rows = conceptos.map(c => `
    <tr>
      <td>${c.articulo_id || ''}</td>
      <td>${(c.nombre || '').replace(/\n/g,'<br>')}</td>
      <td style="text-align:center">${c.cantidad}</td>
      <td style="text-align:right">${fmtNum(c.precio)}</td>
      <td style="text-align:center">${c.iva}%</td>
      <td style="text-align:right;font-weight:600">${fmtNum(c.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Cotización ${cot.ID_COTIZACION}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #c8102e}
    .logo-area img{height:52px;object-fit:contain}
    .logo-area .brand{font-family:sans-serif;font-size:22px;font-weight:800;color:#c8102e;letter-spacing:0.1em}
    .logo-area .sub{font-size:10px;color:#666;letter-spacing:0.12em;text-transform:uppercase;margin-top:3px}
    .cot-info{text-align:right}
    .cot-id{font-size:11px;color:#888;margin-bottom:4px;font-family:monospace}
    .cot-fecha{font-size:12px;color:#444;margin-bottom:6px}
    .cot-title{font-size:20px;font-weight:700;color:#c8102e}
    .section{margin-bottom:24px}
    .section-title{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#888;margin-bottom:8px;font-weight:600}
    .client-box{background:#f7f7f7;border-radius:8px;padding:14px 18px;display:flex;gap:40px}
    .client-field{display:flex;flex-direction:column;gap:2px}
    .client-field label{font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#888}
    .client-field span{font-size:13px;font-weight:500;color:#111}
    table{width:100%;border-collapse:collapse;margin-bottom:0}
    thead th{background:#c8102e;color:#fff;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em}
    tbody tr{border-bottom:1px solid #eee}
    tbody tr:nth-child(even){background:#fafafa}
    tbody td{padding:10px 12px;font-size:13px;vertical-align:top}
    .totals{margin-top:16px;display:flex;justify-content:flex-end}
    .totals-table{width:280px}
    .totals-table td{padding:6px 12px;font-size:13px}
    .totals-table tr:last-child td{font-size:16px;font-weight:700;color:#c8102e;border-top:2px solid #c8102e;padding-top:10px}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#888}
    .sign-area{text-align:center;margin-top:60px}
    .sign-line{width:220px;border-top:1px solid #333;margin:0 auto 6px}
    .sign-name{font-size:12px;color:#333}
    .notas{background:#fff8e1;border-left:3px solid #e8a020;padding:10px 14px;font-size:12px;color:#555;margin-top:16px;border-radius:0 6px 6px 0}
    @media print{body{padding:20px}@page{margin:1cm}}
  </style></head>
  <body>
    <div class="header">
      <div class="logo-area">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="Imagenes/Logo.png" onerror="this.style.display='none'">
          <div>
            <div class="brand">CONECTE</div>
            <div class="sub">Constructora Conecte</div>
          </div>
        </div>
      </div>
      <div class="cot-info">
        <div class="cot-id">${cot.ID_COTIZACION}</div>
        <div class="cot-fecha">Fecha: ${formatDate(cot.FECHA)}</div>
        <div class="cot-title">COTIZACIÓN</div>
        ${cot.VIGENCIA ? `<div style="font-size:11px;color:#888;margin-top:4px">Vigencia: ${cot.VIGENCIA} días</div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Datos del cliente</div>
      <div class="client-box">
        <div class="client-field"><label>Empresa</label><span>${cliente?.NOMBRE_CLIENTE || cot.CLIENTE || '—'}</span></div>
        <div class="client-field"><label>RFC</label><span>${cot.CLIENTE || '—'}</span></div>
        <div class="client-field"><label>Contacto</label><span>${cliente?.CONTACTO || '—'}</span></div>
        <div class="client-field"><label>Dirección</label><span>${cliente?.DIRECCION || '—'}</span></div>
      </div>
    </div>

    ${cot.DESCRIPCION ? `<div class="section"><div class="section-title">Descripción del proyecto</div>
      <p style="font-size:13px;color:#333;line-height:1.6">${cot.DESCRIPCION}</p></div>` : ''}

    <div class="section">
      <div class="section-title">Conceptos</div>
      <table>
        <thead><tr>
          <th style="width:100px">Código</th><th>Descripción</th>
          <th style="width:60px;text-align:center">Cant.</th>
          <th style="width:110px;text-align:right">P. Unit.</th>
          <th style="width:60px;text-align:center">IVA</th>
          <th style="width:110px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#888">Sin conceptos</td></tr>'}</tbody>
      </table>
    </div>

    <div class="totals">
      <table class="totals-table">
        <tr><td>Subtotal</td><td style="text-align:right">${fmtNum(cot.SUBTOTAL)}</td></tr>
        <tr><td>IVA</td><td style="text-align:right">${fmtNum(cot.IMPUESTO1)}</td></tr>
        <tr><td>Retención</td><td style="text-align:right">${fmtNum(cot.RETENCION)}</td></tr>
        <tr><td>TOTAL</td><td style="text-align:right">${fmtNum(cot.TOTAL)}</td></tr>
      </table>
    </div>

    ${cot.NOTAS_COTIZACION ? `<div class="notas">📝 ${cot.NOTAS_COTIZACION}</div>` : ''}

    <div class="sign-area" style="display:flex;justify-content:space-around;margin-top:60px">
      <div><div class="sign-line"></div><div class="sign-name">Autorizado por</div></div>
      <div><div class="sign-line"></div><div class="sign-name">Aceptado por el cliente</div></div>
    </div>

    <div class="footer">
      <span>Constructora Conecte · Mérida, Yucatán</span>
      <span>Generado: ${new Date().toLocaleString('es-MX')}</span>
    </div>
  </body></html>`;
}

// ══════════════════════════════════════════════════════
//  FACTURAS
// ══════════════════════════════════════════════════════
async function loadFacturas() {
  const view = document.getElementById('view-facturas');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Facturas</h2><p>Ingresos y cuentas por cobrar</p></div>
      <div class="page-actions">
        <div class="search-wrap">${icons.search_ico}<input type="text" placeholder="Buscar..." oninput="filterTable('fact-tbody', this.value, [0,1,2,4])"></div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Folio</th><th>Cliente (RFC)</th><th>Fecha</th><th>Concepto</th>
        <th>Monto</th><th>Método pago</th><th>Estatus</th><th>Acciones</th>
      </tr></thead>
      <tbody id="fact-tbody"><tr class="loading-row"><td colspan="8"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;

  const rows = await SheetsDB.read('FACTURAS');
  const tbody = document.getElementById('fact-tbody');
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin facturas</td></tr>`; return; }
  tbody.innerHTML = rows.map(f => `
    <tr>
      <td class="primary">${f.Folio || '—'}</td>
      <td>${f.Cliente || '—'}</td>
      <td>${formatDate(f.Fecha_creación)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${(f.Concepto || '').substring(0,50)}</td>
      <td>${fmt(f.Monto_total)}</td>
      <td>${f.Método_pago || '—'}</td>
      <td>${pillEstatus(f.Estatus)}</td>
      <td>
        <select class="btn btn-ghost btn-sm" onchange="updateFacturaEstatus('${f.ID_Factura}',this.value)" style="padding:5px 8px;border:1px solid var(--border2);background:var(--surface2)">
          <option ${f.Estatus==='Pendiente'?'selected':''}>Pendiente</option>
          <option ${f.Estatus==='Pagado'?'selected':''}>Pagado</option>
          <option ${f.Estatus==='Cancelado'?'selected':''}>Cancelado</option>
          <option value="PPP" ${f.Estatus==='PPP'?'selected':''}>PPP</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateFacturaEstatus(id, status) {
  const rows = await SheetsDB.read('FACTURAS');
  const idx = rows.findIndex(r => r.ID_Factura === id);
  if (idx < 0) return;
  rows[idx].Estatus = status;
  await SheetsDB.update('FACTURAS', idx, rows[idx]);
  toast('Estatus actualizado', 'success');
}

// ══════════════════════════════════════════════════════
//  OC CLIENTES
// ══════════════════════════════════════════════════════
async function loadOCClientes() {
  const view = document.getElementById('view-oc-clientes');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Órdenes de Compra — Clientes</h2><p>OC recibidas de clientes</p></div>
      <div class="page-actions">
        <button class="btn btn-accent" onclick="openOCModal()">${icons.plus} Nueva OC</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Folio OC</th><th>Cliente (RFC)</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estatus</th><th>Archivo</th>
      </tr></thead>
      <tbody id="oc-tbody"><tr class="loading-row"><td colspan="7"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;
  const rows = await SheetsDB.read('OC_CLIENTES');
  const tbody = document.getElementById('oc-tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="primary">${r.OC_folio || '—'}</td>
      <td>${r.Cliente || '—'}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${(r.Concepto||'').substring(0,60)}</td>
      <td>${fmt(r.Costo)}</td>
      <td>${formatDate(r.Fecha_recib)}</td>
      <td>${pillEstatus(r.Estatus_oc)}</td>
      <td>${r.Archivo ? `<a href="${r.Archivo}" target="_blank" style="color:var(--accent)">${icons.pdf}</a>` : '—'}</td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3)">Sin registros</td></tr>`;
}

// ══════════════════════════════════════════════════════
//  ÓRDENES TRABAJO
// ══════════════════════════════════════════════════════
async function loadOrdenes() {
  const view = document.getElementById('view-ordenes');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Órdenes de Trabajo</h2><p>Gestión y seguimiento</p></div>
      <div class="page-actions">
        <div class="search-wrap">${icons.search_ico}<input type="text" placeholder="Buscar..." oninput="filterTable('ot-tbody',this.value,[1,3,6,14])"></div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Folio</th><th>Solicitado por</th><th>Fecha inicio</th><th>Responsable</th>
        <th>Lugar</th><th>Costo final</th><th>Importancia</th><th>Estatus</th>
      </tr></thead>
      <tbody id="ot-tbody"><tr class="loading-row"><td colspan="8"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;

  const [rows, users] = await Promise.all([SheetsDB.read('ORDENES_TRABAJO'), SheetsDB.read('USERS')]);
  const userMap = Object.fromEntries(users.map(u => [u.ID_USUARIO_CREADOR, u.NOMBRE_CREADOR]));

  const tbody = document.getElementById('ot-tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="primary">${r.FOLIO_OT_NAME || r.FOLIO_OT || '—'}</td>
      <td>${userMap[r.SOLICITADO_POR] || r.SOLICITADO_POR || '—'}</td>
      <td>${formatDate(r.FECHA_INICIO)}</td>
      <td>${userMap[r.RESPONSABLE] || r.RESPONSABLE || '—'}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis">${r['LUGAR DE TRABAJO'] || '—'}</td>
      <td>${r.COSTO_FINAL ? fmt(r.COSTO_FINAL) : '—'}</td>
      <td><span class="pill ${r.IMPORTANCIA === 'Alta' ? 'pill-red' : r.IMPORTANCIA === 'Media' ? 'pill-gold' : 'pill-gray'}">${r.IMPORTANCIA || '—'}</span></td>
      <td>${pillEstatus(r.ESTATUS)}</td>
    </tr>
  `).join('') || `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin órdenes</td></tr>`;
}

// ══════════════════════════════════════════════════════
//  TICKETS (Gastos)
// ══════════════════════════════════════════════════════
async function loadTickets() {
  const view = document.getElementById('view-tickets');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Tickets / Gastos</h2><p>Registro de egresos</p></div>
      <div class="page-actions">
        <button class="btn btn-accent" onclick="openTicketModal()">${icons.plus} Nuevo ticket</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Folio/RFC</th><th>Empresa</th><th>Concepto</th><th>Monto</th>
        <th>Fecha</th><th>Tipo</th><th>Estado</th>
      </tr></thead>
      <tbody id="tkt-tbody"><tr class="loading-row"><td colspan="7"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;

  const rows = await SheetsDB.read('CXP');
  const tbody = document.getElementById('tkt-tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="primary">${r['FACTURA/FOLIO'] || '—'}</td>
      <td>${r.EMPRESA || '—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${(r.CONCEPTO||'').substring(0,50)}</td>
      <td>${fmt(r.MONTO)}</td>
      <td>${formatDate(r['FECHA DE EMISIÓN'])}</td>
      <td>${r.TIEMPO || '—'}</td>
      <td>${pillEstatus(r.Estado)}</td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3)">Sin tickets</td></tr>`;
}

// ══════════════════════════════════════════════════════
//  INVENTARIO
// ══════════════════════════════════════════════════════
async function loadInventario() {
  const view = document.getElementById('view-inventario');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Inventario</h2><p>Productos y stock</p></div>
      <div class="page-actions">
        <div class="search-wrap">${icons.search_ico}<input type="text" placeholder="Buscar producto..." oninput="filterTable('inv-tbody',this.value,[1,2,3])"></div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th></th><th>Código</th><th>Producto</th><th>Stock</th><th>Stock mín.</th>
        <th>Precio costo</th><th>Precio venta</th><th>Tipo</th><th>Estado</th>
      </tr></thead>
      <tbody id="inv-tbody"><tr class="loading-row"><td colspan="9"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;

  const rows = await SheetsDB.read('PRODUCTOS');
  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = rows.map(r => {
    const stock = parseFloat(r.Stokc_Disponible || r.Stock_Disponible) || 0;
    const min   = parseFloat(r.Stock_Min) || 0;
    const low   = stock <= min;
    return `<tr>
      <td style="width:40px;padding:8px">
        ${r.Imagen_producto
          ? `<img src="${r.Imagen_producto}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`
          : `<div style="width:32px;height:32px;border-radius:6px;background:var(--surface3);border:1px solid var(--border)"></div>`}
      </td>
      <td class="primary" style="font-family:monospace;font-size:11px">${r.Codigo_producto || '—'}</td>
      <td>${r.Producto_name || '—'}</td>
      <td style="color:${low ? 'var(--accent)' : 'var(--green)'};font-weight:600">${stock}</td>
      <td style="color:var(--text3)">${min}</td>
      <td>${fmt(r.Precio_producto)}</td>
      <td>${fmt(r.Precio_Venta)}</td>
      <td><span class="pill pill-gray">${r.Tipo || '—'}</span></td>
      <td>${low ? '<span class="pill pill-red">Stock bajo</span>' : '<span class="pill pill-green">OK</span>'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3)">Sin productos</td></tr>`;
}

// ══════════════════════════════════════════════════════
//  NÓMINA
// ══════════════════════════════════════════════════════
async function loadNomina() {
  const view = document.getElementById('view-nomina');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Nómina</h2><p>Recibos de pago</p></div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Empleado</th><th>Periodo</th><th>Salario base</th><th>Gratificación</th>
        <th>Vales despensa</th><th>Total percibido</th><th>Deducciones</th><th>PDF</th>
      </tr></thead>
      <tbody id="nom-tbody"><tr class="loading-row"><td colspan="8"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;

  const [rows, users] = await Promise.all([SheetsDB.read('NOMINA'), SheetsDB.read('USERS')]);
  const userMap = Object.fromEntries(users.map(u => [u.ID_USUARIO_CREADOR, u.NOMBRE_CREADOR]));
  const tbody = document.getElementById('nom-tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="primary">${userMap[r.NOMBRE] || r.NOMBRE || '—'}</td>
      <td>${formatDate(r.FECHA_INICIAL)} — ${formatDate(r.FECHA_FINAL)}</td>
      <td>${fmt(r.SALARIO_BASE)}</td>
      <td>${fmt(r.GRATIFIC_SEM)}</td>
      <td>${fmt(r.VALESDEPENSA)}</td>
      <td style="color:var(--green);font-weight:600">${fmt(r.DEPOSITO_PERSIVIDO)}</td>
      <td style="color:var(--accent)">${fmt(r.DESC_ISR)}</td>
      <td>${r.PDF_RECIBO ? `<a href="${r.PDF_RECIBO}" target="_blank" class="btn btn-ghost btn-sm">${icons.pdf}</a>` : '—'}</td>
    </tr>
  `).join('') || `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3)">Sin registros</td></tr>`;
}

// ══════════════════════════════════════════════════════
//  EMPLEADOS
// ══════════════════════════════════════════════════════
async function loadEmpleados() {
  const view = document.getElementById('view-empleados');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Empleados</h2><p>Directorio del equipo</p></div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Nombre</th><th>Correo</th><th>Área</th><th>Estado</th>
        <th>CURP</th><th>RFC</th><th>NSS</th><th>Antigüedad</th>
      </tr></thead>
      <tbody id="emp-tbody"><tr class="loading-row"><td colspan="8"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;
  const rows = await SheetsDB.read('USERS');
  const realRows = rows.filter(r => r.NOMBRE_CREADOR && r.NOMBRE_CREADOR !== 'TOTAL');
  document.getElementById('emp-tbody').innerHTML = realRows.map(r => `
    <tr>
      <td class="primary">${r.NOMBRE_CREADOR}</td>
      <td>${r.CORREO_CREADOR || '—'}</td>
      <td><span class="pill ${r.AREA === 'Patron' ? 'pill-gold' : r.AREA === 'Administrativo' ? 'pill-red' : 'pill-blue'}">${r.AREA || '—'}</span></td>
      <td>${r.ESTADO === 'Activo' ? '<span class="pill pill-green">Activo</span>' : '<span class="pill pill-gray">Inactivo</span>'}</td>
      <td style="font-family:monospace;font-size:11px">${r.CURP || '—'}</td>
      <td style="font-family:monospace;font-size:11px">${r.RFC || '—'}</td>
      <td style="font-family:monospace;font-size:11px">${r.NSS || '—'}</td>
      <td>${formatDate(r.FECHA_ANTIGUEDAD)}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════════════════
//  VEHÍCULOS
// ══════════════════════════════════════════════════════
async function loadVehiculos() {
  const view = document.getElementById('view-vehiculos');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Vehículos</h2><p>Flota de la empresa</p></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px" id="vehiculos-grid">
      <div style="display:flex;align-items:center;justify-content:center;height:200px;grid-column:1/-1">
        <div class="spinner"></div>
      </div>
    </div>
  `;
  const rows = await SheetsDB.read('VEHICULOS');
  const grid = document.getElementById('vehiculos-grid');
  grid.innerHTML = rows.map(v => `
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      ${v.Foto
        ? `<img src="${v.Foto}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">`
        : `<div style="width:100%;height:140px;background:var(--surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text3)">Sin foto</div>`}
      <div>
        <div style="font-family:var(--font-h);font-size:15px;font-weight:700">${v.Marca} ${v.Modelo} ${v.Año || ''}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">${v.Color || ''}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="pill pill-blue">${v['Placas de matrícula'] || '—'}</span>
        <span style="font-size:11px;color:var(--text3);font-family:monospace">${v.VIN || '—'}</span>
      </div>
    </div>
  `).join('') || `<div style="text-align:center;padding:40px;color:var(--text3)">Sin vehículos registrados</div>`;
}

// ══════════════════════════════════════════════════════
//  TAREAS (Asignación con notificaciones)
// ══════════════════════════════════════════════════════
async function loadTareas() {
  const view = document.getElementById('view-tareas');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Asignar Tareas</h2><p>El admin asignado recibirá notificación inmediata</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <h3 style="font-family:var(--font-h);font-size:15px;margin-bottom:20px">Nueva tarea</h3>
        <div class="form-grid" style="gap:16px">
          <div class="form-field">
            <label>Asignar a</label>
            <select id="tarea-user"><option value="">Cargando...</option></select>
          </div>
          <div class="form-field">
            <label>Título de la tarea</label>
            <input type="text" id="tarea-titulo" placeholder="Ej: Revisar cotización CONE-123">
          </div>
          <div class="form-field">
            <label>Descripción</label>
            <textarea id="tarea-desc" rows="4" placeholder="Detalle de la tarea..."></textarea>
          </div>
          <div class="form-field">
            <label>Prioridad</label>
            <select id="tarea-prior">
              <option>Normal</option><option>Alta</option><option>Urgente</option>
            </select>
          </div>
        </div>
        <div style="margin-top:20px">
          <button class="btn btn-accent" onclick="enviarTarea()">${icons.send} Asignar y notificar</button>
        </div>
      </div>
      <div class="card">
        <h3 style="font-family:var(--font-h);font-size:15px;margin-bottom:16px">Tareas enviadas</h3>
        <div id="tareas-enviadas" style="display:flex;flex-direction:column;gap:8px">
          <p style="color:var(--text3);font-size:13px">Sin tareas asignadas aún.</p>
        </div>
      </div>
    </div>
  `;

  const users = await SheetsDB.read('USERS');
  const admins = users.filter(u => u.AREA === 'Administrativo' && u.ESTADO === 'Activo' && u.NOMBRE_CREADOR !== 'TOTAL');
  const sel = document.getElementById('tarea-user');
  sel.innerHTML = `<option value="">Seleccionar admin...</option>` +
    admins.map(u => `<option value="${u.ID_USUARIO_CREADOR}">${u.NOMBRE_CREADOR}</option>`).join('');

  // Show sent tasks
  const sent = JSON.parse(localStorage.getItem('conecte_tareas_sent') || '[]')
    .filter(t => t.from === State.user?.ID_USUARIO_CREADOR).slice(-10).reverse();
  const container = document.getElementById('tareas-enviadas');
  if (sent.length) {
    container.innerHTML = sent.map(t => `
      <div class="card-sm" style="padding:12px 14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:13px;font-weight:500">${t.titulo}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Para: ${t.toName} · ${formatDate(t.ts)}</div>
          </div>
          <span class="pill ${t.prioridad === 'Urgente' ? 'pill-red' : t.prioridad === 'Alta' ? 'pill-gold' : 'pill-gray'}">${t.prioridad}</span>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:6px">${t.desc}</div>
      </div>
    `).join('');
  }
}

async function enviarTarea() {
  const userId = document.getElementById('tarea-user').value;
  const titulo = document.getElementById('tarea-titulo').value.trim();
  const desc   = document.getElementById('tarea-desc').value.trim();
  const prior  = document.getElementById('tarea-prior').value;

  if (!userId || !titulo) { toast('Selecciona un usuario y escribe un título', 'error'); return; }

  const users = await SheetsDB.read('USERS');
  const toUser = users.find(u => u.ID_USUARIO_CREADOR === userId);

  sendNotification(userId, `📋 Nueva tarea: ${titulo}`,
    `${prior === 'Urgente' ? '🔴 URGENTE · ' : prior === 'Alta' ? '🟡 Alta prioridad · ' : ''}${desc || 'Sin descripción adicional.'} · Asignado por: ${State.user?.NOMBRE_CREADOR}`
  );

  // Save to sent
  const sent = JSON.parse(localStorage.getItem('conecte_tareas_sent') || '[]');
  sent.push({ from: State.user?.ID_USUARIO_CREADOR, to: userId, toName: toUser?.NOMBRE_CREADOR || userId, titulo, desc, prioridad: prior, ts: new Date().toISOString() });
  localStorage.setItem('conecte_tareas_sent', JSON.stringify(sent));

  toast(`Tarea enviada a ${toUser?.NOMBRE_CREADOR}`, 'success');
  document.getElementById('tarea-titulo').value = '';
  document.getElementById('tarea-desc').value = '';
  loadTareas();
}

// ══════════════════════════════════════════════════════
//  CONTRASEÑAS
// ══════════════════════════════════════════════════════
async function loadContrasenas() {
  const view = document.getElementById('view-contrasenas');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Contraseñas</h2><p>Accesos y credenciales del sistema</p></div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Servicio</th><th>Usuario</th><th>Contraseña</th><th>Tipo</th><th>Enlace</th>
      </tr></thead>
      <tbody id="pass-tbody"><tr class="loading-row"><td colspan="5"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;
  const rows = await SheetsDB.read('PASSWORDS');
  document.getElementById('pass-tbody').innerHTML = rows.map(r => `
    <tr>
      <td class="primary">${r.NOMBRE || '—'}</td>
      <td>${r.USUARIO || '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span id="pw-${r.ID}" style="font-family:monospace;letter-spacing:0.1em">••••••••</span>
          <button class="btn btn-ghost btn-sm" onclick="togglePW('${r.ID}','${r.CONTRASEÑA}')" style="padding:3px 7px;font-size:11px">Ver</button>
        </div>
      </td>
      <td><span class="pill pill-gray">${r.TIPO || '—'}</span></td>
      <td>${r.ENLACE ? `<a href="${r.ENLACE}" target="_blank" class="btn btn-ghost btn-sm" style="font-size:11px">${icons.link} Abrir</a>` : '—'}</td>
    </tr>
  `).join('');
}

function togglePW(id, pw) {
  const el = document.getElementById(`pw-${id}`);
  if (!el) return;
  el.textContent = el.textContent === '••••••••' ? pw : '••••••••';
}

// ══════════════════════════════════════════════════════
//  AIRES ACONDICIONADOS
// ══════════════════════════════════════════════════════
async function loadAires() {
  const view = document.getElementById('view-aires');
  view.innerHTML = `
    <div class="page-header">
      <div><h2>Informes Técnicos — Aires</h2><p>Registros de mantenimiento</p></div>
    </div>
    <div class="tbl-wrap">
      <table><thead><tr>
        <th>Fecha</th><th>Cliente</th><th>Área</th><th>Tipo Mantto</th>
        <th>Equipo</th><th>Técnico</th><th>Fallas reportadas</th><th>Cotizado</th>
      </tr></thead>
      <tbody id="aires-tbody"><tr class="loading-row"><td colspan="8"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
  `;
  const [rows, users] = await Promise.all([SheetsDB.read('INFORME_AIRES'), SheetsDB.read('USERS')]);
  const umap = Object.fromEntries(users.map(u => [u.ID_USUARIO_CREADOR, u.NOMBRE_CREADOR]));
  document.getElementById('aires-tbody').innerHTML = rows.map(r => `
    <tr>
      <td>${formatDate(r.FECHA)}</td>
      <td class="primary">${r.CLIENTE || '—'}</td>
      <td>${r.AREA || '—'}</td>
      <td><span class="pill pill-blue">${(r.TYPE_MANTTO||'').substring(0,20)}</span></td>
      <td>${r.TIPO_EQUIPO || '—'} ${r.CAPACIDAD || ''}</td>
      <td>${umap[r.TECNICO] || r.TECNICO || '—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:var(--accent)">${r.REPORTE_FALLOS || '—'}</td>
      <td>${r.COTIZADO === 'TRUE' || r.COTIZADO === true ? '<span class="pill pill-green">Sí</span>' : '<span class="pill pill-gray">No</span>'}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════
function closeModal() {
  const m = document.getElementById('modal-overlay');
  if (m) { m.classList.add('hidden'); m.innerHTML = ''; }
}

function fmt(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
function fmtNum(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d)) return v;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return v; }
}

function pillEstatus(s) {
  const map = {
    'Pagado': 'pill-green', 'Pagada': 'pill-green', 'Cerrada': 'pill-green', 'Aceptado': 'pill-green', 'Activo': 'pill-green',
    'Pendiente': 'pill-gold', 'Enviado': 'pill-blue', 'Seguimiento 2': 'pill-blue', 'En proceso': 'pill-blue',
    'Cancelado': 'pill-red', 'Cancelada': 'pill-red',
    'Facturado': 'pill-green', 'PPP': 'pill-orange',
    'Alta': 'pill-red', 'Media': 'pill-gold', 'Baja': 'pill-gray',
  };
  const cls = map[s] || 'pill-gray';
  return `<span class="pill ${cls}">${s || '—'}</span>`;
}

function filterTable(tbodyId, q, cols) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    const text = cols.map(i => tds[i]?.textContent || '').join(' ').toLowerCase();
    tr.style.display = (!q || text.includes(q.toLowerCase())) ? '' : 'none';
  });
}

function numberToWords(n) {
  // Basic implementation
  const num = Math.floor(n);
  const cents = Math.round((n - num) * 100);
  return `${num.toLocaleString('es-MX')} PESOS ${cents.toString().padStart(2,'0')}/100 M.N.`;
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('collapsed');
}

// ── ICONS ─────────────────────────────────────────────
const icons = {
  grid:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  doc:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  receipt: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/></svg>`,
  bag:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  wrench:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  ticket:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6v2a3 3 0 000 6H2a3 3 0 000-6V9z"/></svg>`,
  box:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  money:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
  users:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  car:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  check:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>`,
  lock:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  wind:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/></svg>`,
  plus:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  x:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  eye:     `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  pdf:     `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  save:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>`,
  trash:   `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  send:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>`,
  link:    `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  bell:    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  menu:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  logout:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  search_ico: `<svg class="search-ico" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  arrow_up_circle: (c) => `<svg width="20" height="20" fill="none" stroke="${c}" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="16,12 12,8 8,12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>`,
  arrow_down_circle: (c) => `<svg width="20" height="20" fill="none" stroke="${c}" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="8,12 12,16 16,12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`,
  doc_circle: (c) => `<svg width="20" height="20" fill="none" stroke="${c}" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>`,
  wrench_circle: (c) => `<svg width="20" height="20" fill="none" stroke="${c}" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l1-1a4 4 0 01-5.66 5.66l-4.2 4.2a1.5 1.5 0 01-2.1-2.1l4.2-4.2a4 4 0 015.66-5.66l-1 1z"/></svg>`,
};

// ══════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Try auto-login from localStorage
  const saved = localStorage.getItem('conecte_user');
  if (saved) {
    try {
      State.user = JSON.parse(saved);
      initApp();
      return;
    } catch {}
  }

  // Setup login form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
});
