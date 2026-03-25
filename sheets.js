// ═══════════════════════════════════════════════════════
//  CONECTE — Google Sheets Data Layer
// ═══════════════════════════════════════════════════════

const SHEETS_CONFIG = {
  API_KEY: 'AIzaSyA2mDnl0kGWBdltS488u_5ZaXPWJFS18Ww',
  // Spreadsheet IDs — llenar con tus IDs de Google Sheets
  SHEETS: {
    INICIO:        'TU_SPREADSHEET_ID_INICIO',
    PRODUCTOS:     'TU_SPREADSHEET_ID_PRODUCTOS',
    ORDENES:       'TU_SPREADSHEET_ID_ORDENES',
    FACTURAS:      'TU_SPREADSHEET_ID_FACTURAS',
    NOMINA:        'TU_SPREADSHEET_ID_NOMINA',
    INSPECCION:    'TU_SPREADSHEET_ID_INSPECCION',
    INFORME_AIRES: 'TU_SPREADSHEET_ID_AIRES',
  },
  BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',
};

// ── RANGOS POR TABLA ────────────────────────────────────
const RANGES = {
  COTIZACIONES:  { sheet: 'INICIO',    tab: 'COTIZACIONES',  range: 'COTIZACIONES!A:Y' },
  ARTICULOS:     { sheet: 'INICIO',    tab: 'ARTICULOS',     range: 'ARTICULOS!A:F'    },
  CLIENTES:      { sheet: 'INICIO',    tab: 'CLIENTES',      range: 'CLIENTES!A:G'     },
  CONTACTOS:     { sheet: 'INICIO',    tab: 'CONTACTOS',     range: 'CONTACTOS!A:H'    },
  ESTATUS:       { sheet: 'INICIO',    tab: 'ESTATUS',       range: 'ESTATUS!A:G'      },
  USERS:         { sheet: 'INICIO',    tab: 'USERS_SYSTEM',  range: 'USERS_SYSTEM!A:M' },
  PASSWORDS:     { sheet: 'INICIO',    tab: 'CONTRASEÑAS',   range: 'CONTRASEÑAS!A:F'  },
  OC_CLIENTES:   { sheet: 'INICIO',    tab: 'OC CLIENTES',   range: 'OC CLIENTES!A:H'  },
  ASISTENCIA:    { sheet: 'INICIO',    tab: 'ASISTENCIA',    range: 'ASISTENCIA!A:H'   },
  VACACIONES:    { sheet: 'INICIO',    tab: 'VACACIONES',    range: 'VACACIONES!A:G'   },
  PRODUCTOS:     { sheet: 'PRODUCTOS', tab: 'productos',     range: 'productos!A:N'    },
  INVENTARIO:    { sheet: 'PRODUCTOS', tab: 'inventario',    range: 'inventario!A:J'   },
  MOVIMIENTO:    { sheet: 'PRODUCTOS', tab: 'movimiento',    range: 'movimiento!A:L'   },
  SOLICITUDES:   { sheet: 'PRODUCTOS', tab: 'Solicitudes_Material', range: 'Solicitudes_Material!A:H' },
  ORDENES_TRABAJO: { sheet: 'ORDENES', tab: 'Ordenes_trabajo', range: 'Ordenes_trabajo!A:U' },
  FACTURAS:      { sheet: 'FACTURAS',  tab: 'Facturas',      range: 'Facturas!A:O'     },
  CXP:           { sheet: 'FACTURAS',  tab: 'Cuentas_x_pagar', range: 'Cuentas_x_pagar!A:L' },
  INGRESOS:      { sheet: 'FACTURAS',  tab: 'Ingresos',      range: 'Ingresos!A:I'     },
  EFACTOR:       { sheet: 'FACTURAS',  tab: 'E-Factor',      range: 'E-Factor!A:K'     },
  CTRL_FIN:      { sheet: 'FACTURAS',  tab: 'Control_Financiero_Conecte', range: 'Control_Financiero_Conecte!A:R' },
  NOMINA:        { sheet: 'NOMINA',    tab: 'NOMINA_CALCULO', range: 'NOMINA_CALCULO!A:AK' },
  VEHICULOS:     { sheet: 'INSPECCION',tab: 'Vehiculos',     range: 'Vehiculos!A:G'    },
  INSPECCION:    { sheet: 'INSPECCION',tab: 'Inspección',    range: 'Inspección!A:AP'  },
  INFORME_AIRES: { sheet: 'INFORME_AIRES', tab: 'Informe_Tecnico_Aires', range: 'Informe_Tecnico_Aires!A:X' },
};

// ── CACHE LOCAL ─────────────────────────────────────────
const Cache = {
  _store: {},
  _ttl: {},
  TTL: 60000, // 1 min
  set(key, data) { this._store[key] = data; this._ttl[key] = Date.now() + this.TTL; },
  get(key) { return (this._ttl[key] > Date.now()) ? this._store[key] : null; },
  clear(key) { delete this._store[key]; delete this._ttl[key]; },
  clearAll() { this._store = {}; this._ttl = {}; },
};

// ── UTILS ───────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).substring(2, 10);
}

function rowsToObjects(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

function objectsToRows(headers, objects) {
  return objects.map(obj => headers.map(h => obj[h] ?? ''));
}

// ── READ ─────────────────────────────────────────────────
async function sheetsRead(rangeName) {
  const cached = Cache.get(rangeName);
  if (cached) return cached;

  const cfg = RANGES[rangeName];
  if (!cfg) throw new Error(`Unknown range: ${rangeName}`);
  const sid = SHEETS_CONFIG.SHEETS[cfg.sheet];
  const url = `${SHEETS_CONFIG.BASE_URL}/${sid}/values/${encodeURIComponent(cfg.range)}?key=${SHEETS_CONFIG.API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API error ${res.status}`);
    const data = await res.json();
    const rows = rowsToObjects(data.values || []);
    Cache.set(rangeName, rows);
    return rows;
  } catch (e) {
    console.warn(`[Sheets] Read failed for ${rangeName}:`, e.message);
    return [];
  }
}

// ── APPEND ───────────────────────────────────────────────
async function sheetsAppend(rangeName, rowData) {
  const cfg = RANGES[rangeName];
  const sid = SHEETS_CONFIG.SHEETS[cfg.sheet];
  const url = `${SHEETS_CONFIG.BASE_URL}/${sid}/values/${encodeURIComponent(cfg.range)}:append?valueInputOption=USER_ENTERED&key=${SHEETS_CONFIG.API_KEY}`;

  const headers = await sheetsGetHeaders(rangeName);
  const values = [headers.map(h => rowData[h] ?? '')];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Append failed: ${res.status}`);
  Cache.clear(rangeName);
  return await res.json();
}

// ── UPDATE ROW ───────────────────────────────────────────
async function sheetsUpdate(rangeName, rowIndex, rowData) {
  const cfg = RANGES[rangeName];
  const sid = SHEETS_CONFIG.SHEETS[cfg.sheet];
  const headers = await sheetsGetHeaders(rangeName);
  const sheetTab = cfg.range.split('!')[0];
  const actualRow = rowIndex + 2; // +1 header +1 1-based
  const lastCol = String.fromCharCode(64 + headers.length);
  const range = `${sheetTab}!A${actualRow}:${lastCol}${actualRow}`;
  const url = `${SHEETS_CONFIG.BASE_URL}/${sid}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${SHEETS_CONFIG.API_KEY}`;

  const values = [headers.map(h => rowData[h] ?? '')];
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  Cache.clear(rangeName);
  return await res.json();
}

// ── GET HEADERS ──────────────────────────────────────────
async function sheetsGetHeaders(rangeName) {
  const cfg = RANGES[rangeName];
  const sid = SHEETS_CONFIG.SHEETS[cfg.sheet];
  const sheetTab = cfg.range.split('!')[0];
  const url = `${SHEETS_CONFIG.BASE_URL}/${sid}/values/${encodeURIComponent(sheetTab + '!1:1')}?key=${SHEETS_CONFIG.API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.values && data.values[0]) || [];
}

// ── FIND BY ID ───────────────────────────────────────────
async function sheetsFind(rangeName, idField, idValue) {
  const rows = await sheetsRead(rangeName);
  return rows.find(r => r[idField] === idValue) || null;
}

async function sheetsFindAll(rangeName, field, value) {
  const rows = await sheetsRead(rangeName);
  return rows.filter(r => r[field] === value);
}

// ── AUTH (usuarios desde Sheets) ─────────────────────────
async function authLogin(correo, password) {
  const users = await sheetsRead('USERS_SYSTEM'); 
  
  const user = users.find(u =>
    u.CORREO_CREADOR?.toLowerCase() === correo.toLowerCase()
  );
  
  if (!user) return null;

  // Comparamos la contraseña en la columna CONTRASEÑA
  // Usamos == para evitar problemas si el número se lee como texto
  if (user.CONTRASEÑA == password) {
    // Si el login es exitoso, devolvemos el usuario
    return user; 
  }

  // Fallback: usar el nombre como contraseña
  if (user.NOMBRE_CREADOR && password === user.NOMBRE_CREADOR) {
    return user;
  }

  return null;
}

// Exportar
window.SheetsDB = {
  read: sheetsRead,
  append: sheetsAppend,
  update: sheetsUpdate,
  find: sheetsFind,
  findAll: sheetsFindAll,
  login: authLogin,
  genId,
  config: SHEETS_CONFIG,
  Cache,
};
