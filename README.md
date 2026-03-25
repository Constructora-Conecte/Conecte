# Constructora Conecte — Sistema Web

## Archivos del proyecto

```
conecte/
├── index.html            ← Sitio público (inicio + catálogo)
├── admin_conecte.html    ← Portal administrativo (login + todos los módulos)
├── styles.css            ← Estilos globales del sistema
├── app.js                ← Lógica del admin (vistas, CRUD, PDF, notificaciones)
├── sheets.js             ← Capa de datos — Google Sheets API
└── Imagenes/
    └── Logo.png          ← Tu logo (ya configurado como ícono y marca)
```

---

## ⚙️ Configuración antes de usar

### 1. Agrega tu Logo
Copia tu logo en: `Imagenes/Logo.png`

### 2. Configura los Spreadsheet IDs en `sheets.js`
Abre `sheets.js` y reemplaza los IDs en el objeto `SHEETS`:

```js
SHEETS: {
  INICIO:        'TU_SPREADSHEET_ID_INICIO',   // ← la hoja con COTIZACIONES, CLIENTES, etc.
  PRODUCTOS:     'TU_SPREADSHEET_ID_PRODUCTOS',
  ORDENES:       'TU_SPREADSHEET_ID_ORDENES',
  FACTURAS:      'TU_SPREADSHEET_ID_FACTURAS',
  NOMINA:        'TU_SPREADSHEET_ID_NOMINA',
  INSPECCION:    'TU_SPREADSHEET_ID_INSPECCION',
  INFORME_AIRES: 'TU_SPREADSHEET_ID_AIRES',
}
```

El Spreadsheet ID está en la URL de tu Google Sheet:
`https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit`

### 3. Compartir los Sheets con la API key
En Google Cloud Console:
- Habilita: **Google Sheets API**
- Tu API key ya está configurada en el código

### 4. Para escritura (append/update) — OAuth2
Sin OAuth, solo puedes **leer** datos. Para crear/editar cotizaciones y guardar en Sheets necesitas el token OAuth. Cuando lo tengas, se agrega en `sheets.js` en el header `Authorization: Bearer TOKEN`.

Por ahora, el sistema funciona completamente en **lectura** de todos los módulos, y las cotizaciones se crean localmente (se guardan en memoria hasta activar OAuth).

---

## 🔐 Acceso al sistema

Login en `admin_conecte.html`:
- **Usuario**: correo del empleado (de la hoja USERS_SYSTEM)  
- **Contraseña**: contraseña de la hoja CONTRASEÑAS (columna CONTRASEÑA donde USUARIO coincida con el correo)

### Roles y acceso:
| Rol | Acceso |
|-----|--------|
| **Patrón** | Todo: dashboard financiero, tareas, contraseñas, todos los módulos |
| **Administrativo** | Cotizaciones, facturas, OC, órdenes, inventario, empleados, vehículos |
| **Operativo** | Órdenes de trabajo, inventario, vehículos, informes aires |

---

## 📋 Módulos incluidos

### Portal Admin (`admin_conecte.html`)
- ✅ Login con roles (Patrón / Admin / Operativo)
- ✅ Dashboard financiero (ingresos, egresos, balance)
- ✅ **Cotizaciones** — CRUD completo + autocompletado de artículos + generación PDF
- ✅ Facturas — tabla con cambio de estatus (Pagado / PPP / Cancelado)
- ✅ Órdenes de compra de clientes
- ✅ Órdenes de trabajo
- ✅ Tickets / Gastos (Cuentas x Pagar)
- ✅ Inventario con semáforo de stock
- ✅ Nómina con acceso a PDFs
- ✅ Empleados (CURP, RFC, NSS)
- ✅ Vehículos con fotos
- ✅ **Tareas** — asignación con notificaciones en tiempo real
- ✅ Contraseñas (con toggle mostrar/ocultar)
- ✅ Informes técnicos de aires

### Sitio Público (`index.html`)
- ✅ Inicio con info de la empresa y servicios
- ✅ Catálogo filtrado (solo Tipo = "Tienda") con panel lateral
- ✅ Contacto con formulario de cotización

---

## 🔔 Notificaciones
El sistema de notificaciones funciona con `localStorage` para comunicación entre sesiones en el mismo dispositivo. Cuando el Patrón asigna una tarea, el Admin correspondiente verá la notificación con badge rojo en la campanita la próxima vez que abra su sesión (o en tiempo real si usa polling).

Para notificaciones en tiempo real entre dispositivos distintos, se puede integrar Firebase Realtime Database o Pusher — avisa y lo implementamos.
