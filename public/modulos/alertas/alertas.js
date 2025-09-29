// modulos/alertas/alertas.js - Versión adaptada para CoreUI y API Gateway

// Elementos del DOM para el modal de detalle
let alertaModalElement, modalDetalleTituloElement, modalDetalleCuerpoElement, modalDetalleCerrarBtnElement;

// Elementos del DOM para la lista de alertas positivas
let listaAlertasContentElement, loadingAlertasElement, noAlertasElement, errorAlertasElement;

// Elementos del DOM para la tabla de historial
let cuerpoTablaHistorialElement, loadingHistorialRowElement, noHistorialRowElement, errorHistorialRowElement;

// Array para rastrear event listeners activos
let activeEventListeners = [];

// Configuración del auto-verificador
let intervaloVerificacionCambios = null;
let ultimoResumenAlertas = null;

// --- Helper para añadir y rastrear Event Listeners ---
function _addManagedEventListener(element, type, handler, options = false) {
    if (element) {
        element.addEventListener(type, handler, options);
        activeEventListeners.push({ element, type, handler, options });
    } else {
        console.warn(`ALERTAS: Intento de añadir listener a elemento nulo (tipo: ${type})`);
    }
}

// --- API Gateway Request Function ---
async function apiGatewayRequest(action, params = {}) {
    console.log(`ALERTAS: Enviando solicitud a API Gateway - Acción: ${action}`, params);
    
    try {
        const response = await fetch('/api/gateway', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                ...params
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`ALERTAS: Respuesta exitosa para "${action}":`, data);
        
        if (data.success === false) {
            throw new Error(data.error || data.message || 'Error del servidor');
        }
        
        return data;
    } catch (error) {
        console.error(`ALERTAS: Error en API Gateway para acción "${action}":`, error);
        throw error;
    }
}

// --- Inicialización del Módulo ---
async function initAlertas() {
    console.log("ALERTAS: Inicializando módulo...");
    
    // Obtener referencias a los elementos del DOM
    alertaModalElement = document.getElementById('alertaDetalleModal');
    modalDetalleTituloElement = document.getElementById('modalDetalleTitulo');
    modalDetalleCuerpoElement = document.getElementById('modalDetalleCuerpo');
    modalDetalleCerrarBtnElement = document.getElementById('modalDetalleCerrarBtn');

    listaAlertasContentElement = document.getElementById('lista-alertas-content');
    loadingAlertasElement = document.getElementById('loading-alertas');
    noAlertasElement = document.getElementById('no-alertas');
    errorAlertasElement = document.getElementById('error-alertas');

    cuerpoTablaHistorialElement = document.getElementById('cuerpo-tabla-historial');
    loadingHistorialRowElement = document.getElementById('loading-historial-row');
    noHistorialRowElement = document.getElementById('no-historial-row');
    errorHistorialRowElement = document.getElementById('error-historial-row');

    // Verificar si los elementos principales existen
    if (!listaAlertasContentElement || !cuerpoTablaHistorialElement || !alertaModalElement) {
        console.error("ALERTAS: Faltan elementos cruciales del DOM. La sección no puede inicializarse correctamente.");
        return;
    }

    // Inicializar componentes
    _inicializarModalDetalle();
    _inicializarBotones();
    await _cargarYFiltrarAlertas(); // Carga inicial de datos
    _iniciarAutoVerificacionAlertas(); // Auto-verificación cada 60s
    
    console.log("ALERTAS: Módulo inicializado correctamente");
}

// --- Inicializar Modal de Detalle ---
function _inicializarModalDetalle() {
    if (!alertaModalElement || !modalDetalleCerrarBtnElement) {
        console.error("ALERTAS: Elementos del modal de detalle no están disponibles.");
        return;
    }
    
    _addManagedEventListener(modalDetalleCerrarBtnElement, 'click', _cerrarModalDetalle);
    _addManagedEventListener(alertaModalElement, 'click', (event) => {
        if (event.target === alertaModalElement) {
            _cerrarModalDetalle();
        }
    });
    
    // Listener para la tecla ESC
    _addManagedEventListener(document, 'keydown', _escKeyHandlerModal);
}

// --- Inicializar Botones ---
function _inicializarBotones() {
    const btnRecargarAlertas = document.getElementById('btn-recargar-alertas');
    const btnRecargarHistorial = document.getElementById('btn-recargar-historial');
    const btnConfiguracion = document.getElementById('btn-configuracion');
    
    if (btnRecargarAlertas) {
        _addManagedEventListener(btnRecargarAlertas, 'click', async () => {
            console.log('ALERTAS: Recargando alertas...');
            await _cargarYFiltrarAlertas();
        });
    }
    
    if (btnRecargarHistorial) {
        _addManagedEventListener(btnRecargarHistorial, 'click', async () => {
            console.log('ALERTAS: Recargando historial...');
            await _cargarYFiltrarAlertas();
        });
    }
    
    if (btnConfiguracion) {
        _addManagedEventListener(btnConfiguracion, 'click', () => {
            console.log('ALERTAS: Toggling configuración...');
            // Bootstrap collapse se maneja automáticamente por data-bs-toggle
            // Pero podemos cargar la configuración cuando se abra
            setTimeout(() => {
                const configSection = document.getElementById('configuracion-section');
                if (configSection && configSection.classList.contains('show')) {
                    _cargarConfiguracion();
                }
            }, 300);
        });
    }
    
    // Inicializar botones de configuración
    _inicializarBotonesConfiguracion();
}

// --- Handler para tecla ESC ---
function _escKeyHandlerModal(event) {
    if (event.key === 'Escape' && alertaModalElement && !alertaModalElement.classList.contains('hidden')) {
        _cerrarModalDetalle();
    }
}

// --- Abrir Modal de Detalle ---
function _abrirModalDetalle(titulo, cuerpoEmail, motivoDisparo = '', alerta = {}) {
    if (!alertaModalElement || !modalDetalleTituloElement || !modalDetalleCuerpoElement) return;

    modalDetalleTituloElement.textContent = titulo || "Detalle de Alerta";

    // Box para motivo de disparo (si existe)
    let motivoHtml = '';
    if (motivoDisparo) {
        motivoHtml = `<div class="motivo-alerta-modal" style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #fd7e14;">
            <i class="ti ti-info-circle" style="color: #fd7e14;"></i> <strong>Motivo:</strong> ${motivoDisparo}
        </div>`;
    }

    // Box para datos parseados (si existen)
    let datosParseadosHtml = '';
    if (alerta["Datos Parseados"] || alerta["Descripción"]) {
        datosParseadosHtml = `
          <div class="datos-parseados" style="background-color: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong>Datos detectados:</strong><br>
            <pre style="white-space: pre-wrap; font-size: 0.9rem;">${alerta["Datos Parseados"] || alerta["Descripción"]}</pre>
          </div>
          <hr style="margin: 15px 0;">
        `;
    }

    // Limpieza y procesamiento del cuerpo del email
    let contenidoHtmlProcesado = cuerpoEmail || "Cuerpo del email no disponible.";

    // Filtros para limpiar contenido no deseado
    const bloquesAOcultar = [ 
        /(?:\[Farmashop]\s*)?Diego Salvetto[\s\S]*?https:\/\/tienda\.farmashop\.com\.uy\/skin-club/gi,
        /\[https:\/\/www\.farmashop\.com\.uy\/signatures\/_data\/ad-1\.gif\]<\S+>/gi,
        /AVISO DE CONFIDENCIALIDAD:[\s\S]*?El contenido del presente mensaje es privado[\s\S]*?En consecuencia, de haberlo recibido por error[\s\S]*?gran impacto\./gi,
        /\[Farmashop\]\s*<< Antes >> de imprimir este mensaje[\s\S]*?gran impacto\./gi,
        /_{10,}\s*$/gm,
        /De: Farmashop <ecommerce@farmashop\.com\.uy>[\s\S]*?<ktettamanti@farmashop\.(?:com\.uy|uy)>/gi,
        /Para: [\s\S]*? E-commerce interno [\s\S]*? ; [\s\S]*? Karina Tettamanti [\s\S]*?  /gi,
    ];
    
    bloquesAOcultar.forEach((regex) => {
        contenidoHtmlProcesado = contenidoHtmlProcesado.replace(regex, "");
    });
    
    contenidoHtmlProcesado = contenidoHtmlProcesado.replace(/\n\s*\n{2,}/g, '\n\n').trim();

    // Resaltar textos importantes
    const textosAResaltar = ["documento", "usuario", "Información de envío", "Tarjeta:", "Método de envío", "Perfume", "Total general"];
    textosAResaltar.forEach(texto => {
        if (texto && typeof texto === 'string' && texto.trim() !== '') {
            const textoEscapado = texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regexResaltar = new RegExp(`(${textoEscapado})`, 'gi');
            contenidoHtmlProcesado = contenidoHtmlProcesado.replace(regexResaltar, '<span style="background-color: #fff3cd; padding: 2px 4px; border-radius: 3px;">$1</span>');
        }
    });

    // Establecer el contenido del modal
    modalDetalleCuerpoElement.innerHTML = motivoHtml + datosParseadosHtml + `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; max-height: 400px; overflow-y: auto;"><pre style="white-space: pre-wrap; font-size: 0.9rem; margin: 0;">${contenidoHtmlProcesado}</pre></div>`;

    alertaModalElement.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// --- Cerrar Modal de Detalle ---
function _cerrarModalDetalle() {
    if (!alertaModalElement) return;
    alertaModalElement.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// --- Marcar Alerta como Revisada ---
async function marcarAlertaComoRevisada(uid) {
    console.log(`ALERTAS: Marcando alerta como revisada - UID: ${uid}`);
    
    try {
        const response = await apiGatewayRequest('markAsReviewed', {
            uid: uid,
            sheetName: 'ALERTAS'
        });
        
        if (response && response.success) {
            console.log('ALERTAS: Alerta marcada como revisada exitosamente');
            return response;
        } else {
            throw new Error(response.error || response.message || "La operación no fue exitosa");
        }
    } catch (error) {
        console.error('ALERTAS: Error al marcar como revisada:', error);
        throw error;
    }
}

// --- Crear Elemento de Alerta ---
function _crearElementoAlerta(alerta, headers, headerMap) {
    const alertaDiv = document.createElement('div');
    alertaDiv.className = 'alerta-item';
    alertaDiv.style.cssText = `
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
    `;

    const getVal = (keyNormalizada) => {
        const headerReal = headerMap[keyNormalizada.toLowerCase().trim()];
        return (headerReal && alerta[headerReal] !== undefined && alerta[headerReal] !== null) ? alerta[headerReal] : '';
    };

    const uid = getVal('UID');
    if (!uid) {
        console.warn("ALERTAS: Alerta sin UID, no se puede crear elemento:", alerta);
        return null;
    }
    alertaDiv.dataset.uid = uid;

    let asunto = getVal('Asunto') || 'Asunto no disponible';
    asunto = asunto.replace(/^(rv: ?|re: ?|fw: ?|fwd: ?)/i, '').trim();

    const fechaOriginal = getVal('Timestamp');
    const fechaFormateada = fechaOriginal ?
        new Date(fechaOriginal).toLocaleString('es-UY', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : 'Fecha desconocida';

    let revisado = getVal('Revisado');
    revisado = revisado ? String(revisado).toLowerCase() === 'sí' : false;
    const estadoAlerta = String(getVal('Estado')).toLowerCase();
    const cuerpoEmail = getVal('Cuerpo');

    alertaDiv.innerHTML = `
        <div class="alerta-contenido" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; cursor: pointer;">
                <p style="margin: 0 0 5px 0; font-weight: 600; color: #2d3748; font-size: 1rem;" title="${asunto}">${asunto}</p>
                <p style="margin: 0; color: #6c757d; font-size: 0.9rem;"><i class="ti ti-clock" style="margin-right: 5px;"></i>${fechaFormateada}</p>
            </div>
            <div class="alerta-acciones" style="margin-left: 15px;">
                ${(!revisado && estadoAlerta === 'positivo' && uid) ? 
                    `<button class="btn-marcar-revisado" data-uid="${uid}" style="background-color: #198754; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s ease;" title="Marcar como Revisado">
                        <i class="ti ti-check"></i> Marcar como Revisado
                      </button>` :
                    (revisado ? '<span style="color: #198754; font-weight: 500;"><i class="ti ti-check-circle"></i> Revisado</span>' : '')}
            </div>
        </div>`;

    const contenidoDiv = alertaDiv.querySelector('.alerta-contenido > div');
    if (contenidoDiv) {
        _addManagedEventListener(contenidoDiv, 'click', () => {
            _abrirModalDetalle(asunto, cuerpoEmail, alerta.Detalles_Disparo || '', alerta);
        });
    }

    const btnMarcar = alertaDiv.querySelector('.btn-marcar-revisado');
    if (btnMarcar) {
        _addManagedEventListener(btnMarcar, 'click', async (event) => {
            event.stopPropagation();
            const uidParaMarcar = btnMarcar.dataset.uid;
            
            // Guardar estado original del botón
            const originalHTML = btnMarcar.innerHTML;
            const originalDisabled = btnMarcar.disabled;
            
            try {
                btnMarcar.innerHTML = '<i class="ti ti-loader ti-spin"></i> Marcando...';
                btnMarcar.disabled = true;
                
                const resultado = await marcarAlertaComoRevisada(uidParaMarcar);
                
                if (resultado && resultado.success) {
                    alertaDiv.style.opacity = '0.5';
                    alertaDiv.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        alertaDiv.remove();
                        if (listaAlertasContentElement && !listaAlertasContentElement.querySelector('.alerta-item')) {
                            if (noAlertasElement) noAlertasElement.classList.remove('hidden');
                        }
                        _cargarYFiltrarAlertas(); // Recargar datos
                    }, 500);
                } else {
                    throw new Error(resultado.error || resultado.message || "La operación no fue exitosa");
                }
            } catch (error) {
                console.error('Error al marcar como revisado:', error);
                btnMarcar.innerHTML = originalHTML;
                btnMarcar.disabled = originalDisabled;
                alert(`Error al marcar la alerta: ${error.message}`);
            }
        });
        
        // Agregar hover effect
        _addManagedEventListener(btnMarcar, 'mouseenter', () => {
            btnMarcar.style.backgroundColor = '#157347';
            btnMarcar.style.transform = 'translateY(-1px)';
        });
        _addManagedEventListener(btnMarcar, 'mouseleave', () => {
            btnMarcar.style.backgroundColor = '#198754';
            btnMarcar.style.transform = 'translateY(0)';
        });
    }

    return alertaDiv;
}

// --- Cargar y Filtrar Alertas ---
async function _cargarYFiltrarAlertas() {
    if (!listaAlertasContentElement || !loadingAlertasElement || !noAlertasElement || !errorAlertasElement ||
        !cuerpoTablaHistorialElement || !loadingHistorialRowElement || !noHistorialRowElement || !errorHistorialRowElement) {
        console.error("ALERTAS: Faltan elementos del DOM para cargar y filtrar alertas.");
        return;
    }

    // Mostrar indicadores de carga
    loadingAlertasElement.classList.remove('hidden');
    noAlertasElement.classList.add('hidden');
    errorAlertasElement.classList.add('hidden');
    
    loadingHistorialRowElement.classList.remove('hidden');
    noHistorialRowElement.classList.add('hidden');
    errorHistorialRowElement.classList.add('hidden');
    
    // Limpiar contenido anterior
    const alertasExistentes = listaAlertasContentElement.querySelectorAll('.alerta-item');
    alertasExistentes.forEach(item => item.remove());
    
    cuerpoTablaHistorialElement.querySelectorAll('tr:not(#loading-historial-row):not(#no-historial-row):not(#error-historial-row)').forEach(row => row.remove());

    try {
        console.log('ALERTAS: Solicitando datos de alertas...');
        const response = await apiGatewayRequest('searchInSheet', {
            sheetName: 'ALERTAS',
            searchTerm: '',
            maxResults: 1000
        });
        
        // Ocultar indicadores de carga
        loadingAlertasElement.classList.add('hidden');
        loadingHistorialRowElement.classList.add('hidden');

        if (response && response.success && response.data && Array.isArray(response.data) && response.headers && Array.isArray(response.headers)) {
            const todasLasAlertas = response.data;
            const headers = response.headers;
            const headerMap = {};
            headers.forEach(h => { 
                if (typeof h === 'string') { 
                    headerMap[h.toLowerCase().trim()] = h; 
                } 
            });

            console.log('ALERTAS: Datos recibidos:', todasLasAlertas.length, 'alertas');
            console.log('ALERTAS: Headers:', headers);

            // Verificar columnas esenciales
            const ESTADO_KEY_NORMALIZED = 'estado';
            const REVISADO_KEY_NORMALIZED = 'revisado';
            const TIMESTAMP_KEY_NORMALIZED = 'timestamp';
            const ASUNTO_KEY_NORMALIZED = 'asunto';
            
            const essentialNormalizedKeys = [ESTADO_KEY_NORMALIZED, REVISADO_KEY_NORMALIZED, TIMESTAMP_KEY_NORMALIZED, 'uid', 'cuerpo', ASUNTO_KEY_NORMALIZED];
            const missingKeys = essentialNormalizedKeys.filter(k => !headerMap[k]);
            
            if (missingKeys.length > 0) {
                throw new Error(`Columnas esenciales no encontradas: ${missingKeys.join(', ')}. Headers disponibles: ${JSON.stringify(headers)}`);
            }

            const ESTADO_KEY = headerMap[ESTADO_KEY_NORMALIZED];
            const REVISADO_KEY = headerMap[REVISADO_KEY_NORMALIZED];
            const TIMESTAMP_KEY = headerMap[TIMESTAMP_KEY_NORMALIZED];

            // Filtrar alertas positivas no revisadas
            const alertasPositivasNoRevisadas = todasLasAlertas.filter(alerta => {
                const estadoActual = alerta[ESTADO_KEY] ? String(alerta[ESTADO_KEY]).toLowerCase() : "";
                const revisadoActual = alerta[REVISADO_KEY] ? String(alerta[REVISADO_KEY]).toLowerCase() : "";
                return estadoActual === 'positivo' && revisadoActual !== 'sí';
            }).sort((a, b) => (new Date(b[TIMESTAMP_KEY]) || 0) - (new Date(a[TIMESTAMP_KEY]) || 0));

            console.log('ALERTAS: Alertas positivas no revisadas:', alertasPositivasNoRevisadas.length);

            // Mostrar alertas positivas no revisadas
            if (alertasPositivasNoRevisadas.length > 0) {
                alertasPositivasNoRevisadas.forEach(alertaF => {
                    const el = _crearElementoAlerta(alertaF, headers, headerMap);
                    if (el) listaAlertasContentElement.appendChild(el);
                });
            } else {
                noAlertasElement.classList.remove('hidden');
            }

            // Mostrar historial completo ordenado por fecha
            const historialOrdenado = [...todasLasAlertas].sort((a, b) => (new Date(b[TIMESTAMP_KEY]) || 0) - (new Date(a[TIMESTAMP_KEY]) || 0));
            
            if (historialOrdenado.length > 0) {
                historialOrdenado.forEach((item, index) => {
                    const fila = cuerpoTablaHistorialElement.insertRow();
                    const getValHist = (kNorm) => headerMap[kNorm.toLowerCase().trim()] && item[headerMap[kNorm.toLowerCase().trim()]] !== undefined ? item[headerMap[kNorm.toLowerCase().trim()]] : 'N/A';
                    
                    const estadoHistClase = String(getValHist(ESTADO_KEY_NORMALIZED)).toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'desconocido';
                    const revisadoHistClase = String(getValHist(REVISADO_KEY_NORMALIZED)).toLowerCase() === 'sí' ? 'si' : 'no';
                    const asuntoCompleto = item.Asunto || '';
                    
                    const estadoTitle = item.Estado === 'Positivo' ? 'La alerta coincidió con una regla y requiere atención.' : 'El email fue procesado pero no cumplió las condiciones.';
                    const detallesDisparo = item.Detalles_Disparo || 'No hay detalles disponibles.';
                    
                    fila.insertCell().innerHTML = `<div class="col-index">${index + 1}</div>`;
                    fila.insertCell().innerHTML = `<div class="col-timestamp">${item.Timestamp ? new Date(item.Timestamp).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'medium' }) : 'N/A'}</div>`;
                    fila.insertCell().innerHTML = `<div class="col-asunto" title="${asuntoCompleto}">${String(asuntoCompleto).substring(0, 50)}${String(asuntoCompleto).length > 50 ? '...' : ''}</div>`;
                    fila.insertCell().innerHTML = `<div class="col-condicion"><span class="estado-tag ${estadoHistClase}" title="${estadoTitle}">${item.Estado || 'N/A'}</span></div>`;
                    fila.insertCell().innerHTML = `<div class="col-revisado"><span class="revisado-${revisadoHistClase}">${item.Revisado || 'No'}</span></div>`;
                    fila.insertCell().innerHTML = `
                        <div class="col-razon" title="${detallesDisparo}">
                            <i class="ti ti-info-circle info-disparo-icon" tabindex="0" aria-label="Ver motivo de disparo" style="color: #0dcaf0; cursor: help;"></i> 
                            <span class="texto-motivo" style="font-size: 0.85rem;">${detallesDisparo.substring(0, 30)}${detallesDisparo.length > 30 ? '...' : ''}</span>
                        </div>
                    `;
                });
            } else {
                noHistorialRowElement.classList.remove('hidden');
            }

        } else {
            const errorMsg = (response && response.error) || 'Formato de datos incorrecto o fallo del servidor.';
            console.warn('ALERTAS: Respuesta sin formato esperado:', response);
            
            noAlertasElement.classList.remove('hidden');
            noHistorialRowElement.classList.remove('hidden');
            errorAlertasElement.textContent = `Error: ${errorMsg}`;
            errorAlertasElement.classList.remove('hidden');
            
            const errHistCell = errorHistorialRowElement ? errorHistorialRowElement.querySelector('td') : null;
            if (errHistCell) errHistCell.textContent = `Error: ${errorMsg}`;
            errorHistorialRowElement.classList.remove('hidden');
        }
    } catch (error) {
        console.error('ALERTAS: Error al cargar alertas:', error);
        
        loadingAlertasElement.classList.add('hidden');
        errorAlertasElement.textContent = `Error: ${error.message}`;
        errorAlertasElement.classList.remove('hidden');
        
        loadingHistorialRowElement.classList.add('hidden');
        const errHistCell = errorHistorialRowElement ? errorHistorialRowElement.querySelector('td') : null;
        if (errHistCell) errHistCell.textContent = `Error: ${error.message}`;
        errorHistorialRowElement.classList.remove('hidden');
    }
}

// --- Auto-verificación de Alertas ---
function estadoResumenAlertas(alertas) {
    if (!Array.isArray(alertas)) return '';
    return alertas.map(a => `${a.UID || a.uid || ''}-${(a.Revisado || a.revisado || '').toLowerCase()}`).join(';');
}

function _iniciarAutoVerificacionAlertas() {
    console.log('ALERTAS: Iniciando auto-verificación de alertas...');
    
    intervaloVerificacionCambios = setInterval(async () => {
        try {
            console.log('ALERTAS: Verificando cambios en alertas...');
            
            const response = await apiGatewayRequest('searchInSheet', {
                sheetName: 'ALERTAS',
                searchTerm: '',
                maxResults: 1000
            });
            
            if (!response || !response.data) return;
            
            const resumenActual = estadoResumenAlertas(response.data);
            
            if (ultimoResumenAlertas === null) {
                ultimoResumenAlertas = resumenActual;
                console.log('ALERTAS: Resumen inicial establecido');
            } else if (resumenActual !== ultimoResumenAlertas) {
                console.log('ALERTAS: Cambio detectado en alertas. Refrescando...');
                ultimoResumenAlertas = resumenActual;
                await _cargarYFiltrarAlertas();
            }
        } catch (error) {
            console.warn('ALERTAS: Error en auto-verificación:', error);
        }
    }, 60000); // cada 60 segundos
}

function _detenerAutoVerificacionAlertas() {
    if (intervaloVerificacionCambios) {
        clearInterval(intervaloVerificacionCambios);
        intervaloVerificacionCambios = null;
        console.log('ALERTAS: Auto-verificación detenida');
    }
}

// --- Cleanup Function ---
function cleanupAlertas() {
    console.log('ALERTAS: Limpiando recursos...');
    
    _detenerAutoVerificacionAlertas();
    
    // Remover todos los event listeners
    activeEventListeners.forEach(({ element, type, handler, options }) => {
        element.removeEventListener(type, handler, options);
    });
    activeEventListeners = [];
}

// === FUNCIONALIDAD DE CONFIGURACIÓN DE ALERTAS ===

// Variables para configuración
let reglasConfiguracion = [];
let palabrasActivadoras = [];
let palabrasExcluyentes = [];

// --- Inicializar Botones de Configuración ---
function _inicializarBotonesConfiguracion() {
    const btnNuevaRegla = document.getElementById('btn-nueva-regla');
    const btnRefrescarConfig = document.getElementById('btn-refrescar-config');
    const btnAyudaConfig = document.getElementById('btn-ayuda-config');
    
    if (btnNuevaRegla) {
        _addManagedEventListener(btnNuevaRegla, 'click', () => {
            _abrirModalConfiguracion();
        });
    }
    
    if (btnRefrescarConfig) {
        _addManagedEventListener(btnRefrescarConfig, 'click', () => {
            _cargarConfiguracion();
        });
    }
    
    if (btnAyudaConfig) {
        _addManagedEventListener(btnAyudaConfig, 'click', (e) => {
            e.preventDefault();
            _mostrarAyudaConfiguracion();
        });
    }
    
    // Inicializar modal de configuración
    _inicializarModalConfiguracion();
}

// --- Cargar Configuración de Reglas ---
async function _cargarConfiguracion() {
    console.log('ALERTAS: Cargando configuración de reglas...');
    
    const loadingActivasElement = document.getElementById('loading-reglas-activas');
    const loadingInactivasElement = document.getElementById('loading-reglas-inactivas');
    const noActivasElement = document.getElementById('no-reglas-activas');
    const noInactivasElement = document.getElementById('no-reglas-inactivas');
    const errorActivasElement = document.getElementById('error-reglas-activas');
    const errorInactivasElement = document.getElementById('error-reglas-inactivas');
    const listaActivasElement = document.getElementById('lista-reglas-activas');
    const listaInactivasElement = document.getElementById('lista-reglas-inactivas');
    
    // Mostrar loading
    if (loadingActivasElement) loadingActivasElement.classList.remove('hidden');
    if (loadingInactivasElement) loadingInactivasElement.classList.remove('hidden');
    if (noActivasElement) noActivasElement.classList.add('hidden');
    if (noInactivasElement) noInactivasElement.classList.add('hidden');
    if (errorActivasElement) errorActivasElement.classList.add('hidden');
    if (errorInactivasElement) errorInactivasElement.classList.add('hidden');
    
    try {
        // Simular carga de reglas (en producción usar API Gateway)
        const response = await apiGatewayRequest('searchInSheet', {
            sheetName: 'ConfiguracionAlertas',
            searchTerm: '',
            maxResults: 1000
        });
        
        if (response && response.success && response.data) {
            reglasConfiguracion = response.data;
            
            // Separar reglas activas e inactivas
            const reglasActivas = reglasConfiguracion.filter(r => r.Activa === 'Sí');
            const reglasInactivas = reglasConfiguracion.filter(r => r.Activa === 'No');
            
            console.log('ALERTAS: Reglas cargadas - Activas:', reglasActivas.length, 'Inactivas:', reglasInactivas.length);
            
            // Renderizar reglas activas
            if (listaActivasElement) {
                _renderizarReglas(reglasActivas, listaActivasElement, true);
            }
            
            // Renderizar reglas inactivas
            if (listaInactivasElement) {
                _renderizarReglas(reglasInactivas, listaInactivasElement, false);
            }
            
            // Mostrar mensajes apropiados
            if (reglasActivas.length === 0 && noActivasElement) {
                noActivasElement.classList.remove('hidden');
            }
            if (reglasInactivas.length === 0 && noInactivasElement) {
                noInactivasElement.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('ALERTAS: Error al cargar configuración:', error);
        if (errorActivasElement) {
            errorActivasElement.textContent = `Error: ${error.message}`;
            errorActivasElement.classList.remove('hidden');
        }
        if (errorInactivasElement) {
            errorInactivasElement.textContent = `Error: ${error.message}`;
            errorInactivasElement.classList.remove('hidden');
        }
    } finally {
        // Ocultar loading
        if (loadingActivasElement) loadingActivasElement.classList.add('hidden');
        if (loadingInactivasElement) loadingInactivasElement.classList.add('hidden');
    }
}

// --- Renderizar Lista de Reglas ---
function _renderizarReglas(reglas, container, esActiva) {
    if (!container) return;
    
    // Limpiar contenido anterior
    const reglasExistentes = container.querySelectorAll('.regla-item');
    reglasExistentes.forEach(item => item.remove());
    
    reglas.forEach((regla, index) => {
        const reglaDiv = document.createElement('div');
        reglaDiv.className = `regla-item ${esActiva ? 'activa' : 'inactiva'}`;
        
        const tipoCondicion = regla.TipoCondicion || 'SiemprePositivo';
        const valorCondicion = regla.ValorCondicion || '';
        
        reglaDiv.innerHTML = `
            <div class="regla-header">
                <div class="regla-info">
                    <h5 class="regla-titulo">${regla.Descripcion || 'Sin descripción'}</h5>
                    <p class="regla-asunto">Asunto: "${regla.Asunto || 'No especificado'}"</p>
                </div>
                <div class="regla-actions">
                    <button class="btn btn-sm btn-outline-primary btn-editar-regla" data-index="${index}" data-activa="${esActiva}">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-eliminar-regla" data-index="${index}" data-activa="${esActiva}">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </div>
            <div class="regla-details">
                <span class="regla-tipo">${tipoCondicion}</span>
                ${valorCondicion ? `<div class="regla-valor"><strong>Valor:</strong> ${valorCondicion}</div>` : ''}
            </div>
        `;
        
        container.appendChild(reglaDiv);
    });
    
    // Agregar event listeners a los botones
    const botonesEditar = container.querySelectorAll('.btn-editar-regla');
    const botonesEliminar = container.querySelectorAll('.btn-eliminar-regla');
    
    botonesEditar.forEach(btn => {
        _addManagedEventListener(btn, 'click', () => {
            const index = parseInt(btn.dataset.index);
            const esActiva = btn.dataset.activa === 'true';
            const reglas = esActiva ? reglasConfiguracion.filter(r => r.Activa === 'Sí') : reglasConfiguracion.filter(r => r.Activa === 'No');
            _editarRegla(reglas[index]);
        });
    });
    
    botonesEliminar.forEach(btn => {
        _addManagedEventListener(btn, 'click', () => {
            const index = parseInt(btn.dataset.index);
            const esActiva = btn.dataset.activa === 'true';
            const reglas = esActiva ? reglasConfiguracion.filter(r => r.Activa === 'Sí') : reglasConfiguracion.filter(r => r.Activa === 'No');
            _eliminarRegla(reglas[index]);
        });
    });
}

// --- Modal de Configuración ---
function _inicializarModalConfiguracion() {
    const modal = document.getElementById('configReglaModal');
    const btnCerrar = document.getElementById('modalConfigCerrarBtn');
    const btnCancelar = document.getElementById('btnCancelarConfig');
    const form = document.getElementById('formConfigRegla');
    const selectTipo = document.getElementById('reglaTipoCondicion');
    
    if (btnCerrar) {
        _addManagedEventListener(btnCerrar, 'click', _cerrarModalConfiguracion);
    }
    
    if (btnCancelar) {
        _addManagedEventListener(btnCancelar, 'click', _cerrarModalConfiguracion);
    }
    
    if (modal) {
        _addManagedEventListener(modal, 'click', (e) => {
            if (e.target === modal) _cerrarModalConfiguracion();
        });
    }
    
    if (selectTipo) {
        _addManagedEventListener(selectTipo, 'change', _manejarCambioTipoCondicion);
    }
    
    if (form) {
        _addManagedEventListener(form, 'submit', _guardarReglaConfiguracion);
    }
    
    // Inicializar botones de keywords
    _inicializarBotonesKeywords();
}

function _abrirModalConfiguracion(regla = null) {
    const modal = document.getElementById('configReglaModal');
    const titulo = document.getElementById('modalConfigTitulo');
    
    if (!modal) return;
    
    // Limpiar formulario
    _limpiarFormularioConfiguracion();
    
    if (regla) {
        titulo.textContent = 'Editar Regla de Alerta';
        _cargarDatosReglaEnFormulario(regla);
    } else {
        titulo.textContent = 'Nueva Regla de Alerta';
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function _cerrarModalConfiguracion() {
    const modal = document.getElementById('configReglaModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function _mostrarAyudaConfiguracion() {
    const modal = document.getElementById('ayudaConfigModal');
    const btnCerrar = document.getElementById('modalAyudaCerrarBtn');
    
    if (!modal) return;
    
    if (btnCerrar && !btnCerrar.hasAttribute('data-listener')) {
        _addManagedEventListener(btnCerrar, 'click', () => {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
        btnCerrar.setAttribute('data-listener', 'true');
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Funciones auxiliares para configuración (simplificadas)
function _limpiarFormularioConfiguracion() {
    document.getElementById('reglaDescripcion').value = '';
    document.getElementById('reglaAsunto').value = '';
    document.getElementById('reglaTipoCondicion').value = 'SiemprePositivo';
    document.getElementById('reglaEstado').value = 'Sí';
    _manejarCambioTipoCondicion();
}

function _manejarCambioTipoCondicion() {
    console.log('ALERTAS: Cambio en tipo de condición - funcionalidad básica');
}

function _inicializarBotonesKeywords() {
    console.log('ALERTAS: Inicializando botones de keywords - funcionalidad básica');
}

function _cargarDatosReglaEnFormulario(regla) {
    console.log('ALERTAS: Cargando datos de regla en formulario:', regla);
}

function _editarRegla(regla) {
    console.log('ALERTAS: Editando regla:', regla);
    _abrirModalConfiguracion(regla);
}

function _eliminarRegla(regla) {
    if (confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
        console.log('ALERTAS: Eliminando regla:', regla);
        // Aquí implementar eliminación via API Gateway
    }
}

async function _guardarReglaConfiguracion(e) {
    e.preventDefault();
    console.log('ALERTAS: Guardando regla de configuración...');
    
    // Implementar guardado via API Gateway
    _cerrarModalConfiguracion();
    await _cargarConfiguracion(); // Recargar lista
}

// --- Exportar funciones globalmente ---
window.initAlertas = initAlertas;
window.cleanupAlertas = cleanupAlertas;
window._cargarYFiltrarAlertas = _cargarYFiltrarAlertas;
window._recargarAlertas = _cargarYFiltrarAlertas; // Alias para compatibilidad
window._cargarConfiguracion = _cargarConfiguracion; // Para uso externo

console.log('ALERTAS: Módulo cargado y listo para inicializar');