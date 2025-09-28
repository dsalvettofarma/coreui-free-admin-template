// ES Module para Registro de Fraudes
// import { requireSession } from '../shared/authService.js'; // Temporalmente deshabilitado
// import { loadLayout } from '../shared/layout.js'; // Comentado - layout se maneja en fraudes.html
// import { getFraudes, addFraude } from '../shared/apiService.js'; // Temporalmente deshabilitado

// Validar sesión antes de cualquier lógica
// requireSession(['admin']); // Temporalmente deshabilitado

// ⚠️ SESIÓN TEMPORAL PARA TESTING (REMOVER EN PRODUCCIÓN)
if (!localStorage.getItem('session')) {
    const fakeSession = {
        tmpToken: '550e8400-e29b-41d4-a716-446655440000', // UUID format para que se vea más realista
        email: 'dsalvetto@farmashop.com.uy', // Email más realista del dominio
        status: 'ok',
        rol: 'admin'
    };
    localStorage.setItem('session', JSON.stringify(fakeSession));
    localStorage.setItem('sessionTimestamp', Date.now().toString());
}

function formatFechaUTC3(fechaIso) {
  if (!fechaIso) return '-';
  
  try {
    let date;
    
    // Intentar diferentes formatos de fecha
    if (fechaIso.includes('/')) {
      // Formato DD/MM/YYYY o MM/DD/YYYY - intentar parsear
      const parts = fechaIso.split(/[\/\s:]+/);
      if (parts.length >= 3) {
        // Asumir DD/MM/YYYY HH:MM
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-indexados
        const year = parseInt(parts[2]);
        const hour = parts[3] ? parseInt(parts[3]) : 0;
        const minute = parts[4] ? parseInt(parts[4]) : 0;
        
        date = new Date(year, month, day, hour, minute);
      } else {
        date = new Date(fechaIso);
      }
    } else {
      // Formato ISO o timestamp
      date = new Date(fechaIso);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn('Fecha inválida:', fechaIso);
      return fechaIso; // Devolver el valor original si no se puede parsear
    }
    
    // Convertir a UTC-3 (Uruguay/Brasil - Zona horaria de América/Montevideo)
    // UTC-3 significa 3 horas detrás de UTC
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const utcMinus3 = new Date(utcTime + (-3 * 3600000)); // -3 horas en milisegundos
    
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(utcMinus3.getDate())}/${pad(utcMinus3.getMonth() + 1)}/${utcMinus3.getFullYear()} ${pad(utcMinus3.getHours())}:${pad(utcMinus3.getMinutes())}`;
  } catch (error) {
    console.warn('Error parseando fecha:', fechaIso, error);
    return fechaIso;
  }
}

function renderMiniCards(data) {
  const container = document.getElementById('miniCardsContainer');
  if (!container) return;
  container.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'mini-card';
    card.innerHTML = `
      <div class="mini-card-header">
        <div class="mini-card-avatar">${(item.nombre?.[0]||'').toUpperCase()}</div>
        <div>
          <strong>${item.nombre || '-'}</strong><br>
          <span class="mini-card-mail">${item.correo || '-'}</span>
        </div>
      </div>
      <div class="mini-card-body">
        <span><b>Documento:</b> ${item.documento || '-'}</span><br>
        <span><b>Fecha de bloqueo:</b> ${formatFechaUTC3(item.fecha)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Helper para logueado
function mostrarLogueado(item) {
  if (item.documento && (item.documento+"").toLowerCase() === "no logueado") return '<span style="color:#f4a236;font-weight:500;">No</span>';
  if (item.logueado === "Sí" || item.logueado === true) return "Sí";
  if (item.logueado === "No" || item.logueado === false) return "No";
  return '-';
}


function filtrarMiniCards(data, filtro) {
  filtro = (filtro || '').trim().toLowerCase();
  if (!filtro) return data;
  return data.filter(item =>
    String(item.documento || '').toLowerCase().includes(filtro) ||
  String(item.nombre || '').toLowerCase().includes(filtro) ||
    String(item.correo || '').toLowerCase().includes(filtro)
  );
}

/**
 * Parsea una fecha en diferentes formatos y devuelve un objeto Date válido
 * Maneja formatos: DD/MM/YYYY HH:MM, D/MM/YYYY HH:MM:SS, etc.
 */
function parseFecha(fechaStr) {
  if (!fechaStr) return new Date(0); // Fecha muy antigua para ordenamiento
  
  try {
    // Si es formato DD/MM/YYYY o D/MM/YYYY (con o sin hora)
    if (fechaStr.includes('/')) {
      const parts = fechaStr.split(/[\/\s:]+/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JavaScript usa meses 0-indexados
        const year = parseInt(parts[2]);
        const hour = parts[3] ? parseInt(parts[3]) : 0;
        const minute = parts[4] ? parseInt(parts[4]) : 0;
        const second = parts[5] ? parseInt(parts[5]) : 0;
        
        // Validar que los valores sean válidos
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
          const date = new Date(year, month, day, hour, minute, second);
          return isNaN(date.getTime()) ? new Date(0) : date;
        }
      }
    }
    
    // Formato ISO o otros
    const date = new Date(fechaStr);
    return isNaN(date.getTime()) ? new Date(0) : date;
  } catch {
    return new Date(0);
  }
}

function ordenarMiniCards(data, orden) {
  if (orden === 'fecha-asc') {
    return [...data].sort((a, b) => {
      const dateA = parseFecha(a.fecha);
      const dateB = parseFecha(b.fecha);
      return dateA - dateB;
    });
  } else if (orden === 'fecha-desc') {
    return [...data].sort((a, b) => {
      const dateA = parseFecha(a.fecha);
      const dateB = parseFecha(b.fecha);
      
      // Debug: veamos las fechas que se están comparando
      console.log(`Comparando: "${a.fecha}" (${dateA.toISOString()}) vs "${b.fecha}" (${dateB.toISOString()})`);
      
      return dateB - dateA;
    });
  } else if (orden === 'az') {
    return [...data].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
  } else if (orden === 'za') {
    return [...data].sort((a, b) => (b.nombre || '').localeCompare(a.nombre || '', 'es', { sensitivity: 'base' }));
  }
  return data;
}

// Obtener datos reales desde Apps Script (temporalmente restaurado)
async function fetchPersonas() {
  try {
    // Build query URL and log for debugging
    const params = new URLSearchParams({ module: 'fraudes', action: 'list' });
    const url = `/api/gateway?${params.toString()}`;
    console.log('fetchPersonas - calling API:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener datos');
    }
    
    const arrayData = data.data || [];
    if (arrayData.length === 0) return [];
    // Primera fila: headers, siguientes filas: datos
    // Nuevo orden: documento, correo, nombre, comentarios, fecha, logueado
    const personas = arrayData.slice(1).map(row => ({
      documento: row[0] || '',
      correo: row[1] || '',
      nombre: row[2] || '',
      comentarios: row[3] || '',
      fecha: row[4] || '',
      logueado: row[5] || ''
    }));
    
    // Debug: Mostrar las primeras 5 fechas para verificar formato
    console.log('📅 Fechas recibidas del API:', personas.slice(0, 5).map(p => ({ 
  nombre: p.nombre, 
      fecha: p.fecha 
    })));
    
    return personas;
  } catch (e) {
    console.error('No se pudieron obtener los datos reales:', e);
    return [];
  }
}
// --- PANEL DE ESTADÍSTICAS DE BLOQUEADOS (solo cantidades) ---
function renderBloqueadosStats(data) {
  const resumenDiv = document.getElementById('bloqueados-resumen-cards');
  const porMesDiv = document.getElementById('bloqueados-por-mes');
  if (!resumenDiv || !porMesDiv) return;

  let total = data.length;
  let logueados = 0, noLogueados = 0;
  const bloqueadosPorMes = {};

  data.forEach(item => {
    let esNoLogueado = (String(item.documento || '').trim().toLowerCase() === 'no logueado' || !item.documento || !/^\d+$/g.test(item.documento));
    if (esNoLogueado) {
      noLogueados++;
    } else {
      logueados++;
    }
    // Agrupar por mes
    const d = item.fecha ? parseFecha(item.fecha) : null;
    if (d && !isNaN(d.getTime())) {
      const mesKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      bloqueadosPorMes[mesKey] = (bloqueadosPorMes[mesKey] || 0) + 1;
    }
  });

  resumenDiv.innerHTML = `
    <div class="bloqueados-resumen-card">
      <div class="bloqueados-total">${total}</div>
      <div class="bloqueados-label">Total bloqueados</div>
    </div>
    <div class="bloqueados-resumen-card">
      <div class="bloqueados-total">${logueados}</div>
      <div class="bloqueados-label">Logueados (con documento)</div>
    </div>
    <div class="bloqueados-resumen-card">
      <div class="bloqueados-total">${noLogueados}</div>
      <div class="bloqueados-label">No logueados</div>
    </div>
  `;

  // Ordenar meses (descendente), solo mostrar 4 y luego "Ver más"
  const mesesOrdenados = Object.keys(bloqueadosPorMes).sort((a, b) => b.localeCompare(a));
  let mostrarTodosMeses = false;
  let htmlMeses = '';
  mesesOrdenados.forEach((mesKey, idx) => {
    if (!mostrarTodosMeses && idx >= 4) return;
    htmlMeses += renderBloqueadosMesSimple(mesKey, bloqueadosPorMes[mesKey]);
  });
  if (mesesOrdenados.length > 4) {
    htmlMeses += `<div class="bloqueados-mes-vermas"><button type="button" id="btn-ver-mas-bloqueados">Ver más</button></div>`;
  }
  porMesDiv.innerHTML = htmlMeses;

  const btnVerMas = document.getElementById('btn-ver-mas-bloqueados');
  if (btnVerMas) {
    btnVerMas.onclick = () => {
      porMesDiv.innerHTML = mesesOrdenados.map(mesKey => renderBloqueadosMesSimple(mesKey, bloqueadosPorMes[mesKey])).join('');
    };
  }
}

function renderBloqueadosMesSimple(mesKey, cantidad) {
  const [anio, mes] = mesKey.split('-');
  const labelMes = `${mes}/${anio}`;
  return `
    <div class="bloqueados-mes-block">
      <div class="bloqueados-mes-titulo">${labelMes}</div>
      <div class="bloqueados-cantidad">Cantidad: <b>${cantidad}</b></div>
    </div>
  `;
}

async function onEnter() {
  loadLayout();
  const form = document.getElementById('fraude-form');
  const mensaje = document.getElementById('mensaje');
  const btn = form.querySelector('.btn-primario');
  const btnText = btn.querySelector('.btn-text');
  const btnSpinner = btn.querySelector('.btn-spinner');
  const noLogueadoCheckbox = document.getElementById('no_logueado');
  const documentoInput = document.getElementById('documento');

  // Obtener referencias ANTES de definir funciones que las usan
  const ordenarSelect = document.getElementById('ordenarMiniCards');
  const buscador = document.getElementById('buscadorFraude');

  // Lógica para autocompletar documento cuando marca "No logueado"
  if (noLogueadoCheckbox && documentoInput) {
    function updateDocumentoField() {
      if (noLogueadoCheckbox.checked) {
        documentoInput.value = 'No logueado';
        documentoInput.readOnly = true;
        documentoInput.classList.add('readonly-doc');
      } else {
        documentoInput.value = '';
        documentoInput.readOnly = false;
        documentoInput.classList.remove('readonly-doc');
      }
    }
    noLogueadoCheckbox.addEventListener('change', updateDocumentoField);
    updateDocumentoField(); // Inicializar
  }

  // Obtener datos reales
  let personas = await fetchPersonas();
  renderBloqueadosStats(personas);

  let ordenActual = 'fecha-desc';
  function renderFiltradoYOrdenado() {
    const filtro = buscador ? buscador.value : '';
    const filtradas = filtrarMiniCards(personas, filtro);
    renderMiniCards(ordenarMiniCards(filtradas, ordenActual));
  }
  renderFiltradoYOrdenado();
  if (ordenarSelect) {
    ordenarSelect.value = ordenActual;
    ordenarSelect.addEventListener('change', () => {
      ordenActual = ordenarSelect.value;
      renderFiltradoYOrdenado();
    });
  }
  if (buscador) {
    buscador.addEventListener('input', renderFiltradoYOrdenado);
  }

  // Envío del formulario
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    btn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    // Validar duplicados
    const doc = String(form.documento.value || '').trim().toLowerCase();
    const correo = String(form.correo.value || '').trim().toLowerCase();
    let existe = false;
    if (doc === 'no logueado') {
      // Solo validar duplicado por correo
      existe = personas.some(p => p.correo && String(p.correo).toLowerCase() === correo);
    } else {
      // Validar duplicado por documento o correo
      existe = personas.some(p =>
        (p.documento && String(p.documento).toLowerCase() === doc) ||
        (p.correo && String(p.correo).toLowerCase() === correo)
      );
    }
    if (existe) {
      mensaje.textContent = '❌ El documento o correo ya existe. No se agregó.';
      mensaje.style.color = '#ff5555';
      mensaje.style.display = 'block';
      setTimeout(() => {
        mensaje.style.display = 'none';
        mensaje.textContent = '✅ ¡Reporte enviado con éxito!';
        mensaje.style.color = '#00cc99';
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }, 3000);
      return;
    }

    try {
      // Verificar que el formulario y sus campos existan
      if (!form) {
        throw new Error('Formulario no encontrado');
      }
      
      // Verificar campos específicos
      const requiredFields = ['documento', 'correo', 'nombre', 'comentarios', 'no_logueado'];
      for (const fieldName of requiredFields) {
        if (!form[fieldName]) {
          console.error(`Campo faltante: ${fieldName}`);
          throw new Error(`Campo del formulario no encontrado: ${fieldName}`);
        }
      }
      
      // Prepare POST URL and payload
      const postUrl = '/api/gateway';
      const payload = { module: 'fraudes', action: 'add', documento: formData.documento, correo: formData.correo, nombre: formData.nombre, comentarios: formData.comentarios, logueado: formData.logueado };
      console.log('submitFraude - POST to', postUrl, 'payload:', payload);
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Error al enviar datos');
      }

      // Éxito
      mensaje.textContent = '✅ ¡Reporte enviado con éxito!';
      mensaje.style.color = '#00cc99';
      mensaje.style.display = 'block';
      form.reset();
      
      // Refrescar datos después de enviar
      personas = await fetchPersonas();
      renderBloqueadosStats(personas);
      renderFiltradoYOrdenado();
      
      setTimeout(() => {
        mensaje.style.display = 'none';
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }, 3000);
      
    } catch (error) {
      console.error('Error enviando fraude:', error);
      mensaje.textContent = '❌ Error: ' + error.message;
      mensaje.style.color = '#ff5555';
      mensaje.style.display = 'block';
      
      setTimeout(() => {
        mensaje.style.display = 'none';
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }, 3000);
    }
  });
}

// Permite pegar un bloque de texto y autocompletar los campos del formulario
function autocompletarDesdeTexto(texto) {
  // Extraer campos usando regex y heurísticas
  const getCampo = (label, multiLine = false) => {
    const regex = new RegExp(label + ": ?([\s\S]*?)(?:\n|$)", "i");
    const match = texto.match(regex);
    if (!match) return "";
    let val = match[1].trim();
    if (multiLine && val.includes('\n')) val = val.split('\n')[0].trim();
    return val;
  };

  // Nombre completo
  const nombre = getCampo("Nombre");
  // Documento: primer número válido
  let documento = getCampo("Cedula");
  let docMatch = documento.match(/\d+/g);
  documento = (docMatch && docMatch.length > 0) ? docMatch[0] : documento;
  if (!documento || documento === "0" || documento.toLowerCase().includes("no tiene") || documento.toLowerCase().includes("sin") || documento.length < 3) {
    documento = "No logueado";
  }
  // Correo
  let correo = getCampo("Correo");
  // Comentarios: sumar dirección y otros datos
  let comentarios = "";
  const direccion = getCampo("Dirección de envío", true);
  if (direccion) comentarios += "Dirección: " + direccion;
  // Sumar importe, pedido, etc. si quieres
  const pedido = getCampo("Nro. Pedido");
  if (pedido) comentarios += (comentarios ? " | " : "") + "Pedido: " + pedido;
  const importe = getCampo("Importe");
  if (importe) comentarios += (comentarios ? " | " : "") + "Importe: " + importe;
  // Puedes sumar más campos si lo deseas

  // Completar campos en el form (asumiendo ids: documento, correo, nombre, comentarios)
  if (document.getElementById('documento')) document.getElementById('documento').value = documento;
  if (document.getElementById('correo')) document.getElementById('correo').value = correo;
  if (document.getElementById('nombre')) document.getElementById('nombre').value = nombre;
  if (document.getElementById('comentarios')) document.getElementById('comentarios').value = comentarios;

  // Aviso si falta correo
  if (!correo) alert('Falta completar el correo.');
}

// Puedes agregar un botón o evento para usar esta función:
// Ejemplo: <button onclick="autocompletarDesdeTexto(document.getElementById('pegar-texto').value)">Pegar y autocompletar</button>
// Y un textarea: <textarea id="pegar-texto"></textarea>
function onLeave() {
  // Por ahora nada, pero podés limpiar eventos o timers si agregás más lógica
}

export { onEnter, onLeave };

// Inicialización mejorada para evitar conflictos
function initFraudesModule() {
  // Verificar que estamos en la página correcta
  const mainContent = document.getElementById('main-content');
  if (!mainContent || !mainContent.classList.contains('fraude-main-root')) {
    console.log('Módulo de fraudes: No se detectó la página de fraudes, omitiendo inicialización');
    return;
  }

  // Verificar que no se haya inicializado ya
  if (window.__fraudesModuleInitialized) {
    console.log('Módulo de fraudes: Ya inicializado, omitiendo');
    return;
  }

  console.log('Módulo de fraudes: Inicializando...');
  onEnter();
  window.__fraudesModuleInitialized = true;
}

// Inicialización inteligente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFraudesModule);
} else {
  // Pequeño delay para asegurar que el layout se haya cargado
  setTimeout(initFraudesModule, 100);
}
