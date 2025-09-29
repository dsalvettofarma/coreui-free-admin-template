// modulos/config-alertas/config-alertas.js - Módulo de configuración de reglas de alertas

// Variables para gestión de reglas
let reglasConfiguracion = [];
let palabrasActivadoras = [];
let palabrasExcluyentes = [];
let activeEventListeners = [];

// Elementos del DOM
let configModalElement, modalConfigTituloElement, modalConfigCerrarBtnElement;
let ayudaModalElement, modalAyudaCerrarBtnElement;
let listaReglasActivasElement, listaReglasInactivasElement;
let loadingActivasElement, loadingInactivasElement;
let noActivasElement, noInactivasElement;
let errorActivasElement, errorInactivasElement;

// --- Helper para añadir y rastrear Event Listeners ---
function _addManagedEventListener(element, type, handler, options = false) {
    if (element) {
        element.addEventListener(type, handler, options);
        activeEventListeners.push({ element, type, handler, options });
    } else {
        console.warn(`CONFIG-ALERTAS: Intento de añadir listener a elemento nulo (tipo: ${type})`);
    }
}

// --- API Gateway Request Function ---
async function apiGatewayRequest(action, params = {}) {
    console.log(`CONFIG-ALERTAS: Enviando solicitud a API Gateway - Acción: ${action}`, params);
    
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
        console.log(`CONFIG-ALERTAS: Respuesta exitosa para "${action}":`, data);
        
        if (data.success === false) {
            throw new Error(data.error || data.message || 'Error del servidor');
        }
        
        return data;
    } catch (error) {
        console.error(`CONFIG-ALERTAS: Error en API Gateway para acción "${action}":`, error);
        throw error;
    }
}

// --- Inicialización del Módulo ---
async function initConfigAlertas() {
    console.log("CONFIG-ALERTAS: Inicializando módulo de configuración...");
    
    // Obtener referencias a los elementos del DOM
    configModalElement = document.getElementById('configReglaModal');
    modalConfigTituloElement = document.getElementById('modalConfigTitulo');
    modalConfigCerrarBtnElement = document.getElementById('modalConfigCerrarBtn');
    
    ayudaModalElement = document.getElementById('ayudaConfigModal');
    modalAyudaCerrarBtnElement = document.getElementById('modalAyudaCerrarBtn');
    
    listaReglasActivasElement = document.getElementById('lista-reglas-activas');
    listaReglasInactivasElement = document.getElementById('lista-reglas-inactivas');
    
    loadingActivasElement = document.getElementById('loading-reglas-activas');
    loadingInactivasElement = document.getElementById('loading-reglas-inactivas');
    
    noActivasElement = document.getElementById('no-reglas-activas');
    noInactivasElement = document.getElementById('no-reglas-inactivas');
    
    errorActivasElement = document.getElementById('error-reglas-activas');
    errorInactivasElement = document.getElementById('error-reglas-inactivas');

    // Verificar que los elementos principales existan
    if (!listaReglasActivasElement || !listaReglasInactivasElement || !configModalElement) {
        console.error("CONFIG-ALERTAS: Faltan elementos cruciales del DOM.");
        return;
    }

    // Inicializar componentes
    _inicializarBotones();
    _inicializarModales();
    await _cargarConfiguracion(); // Carga inicial de datos
    
    console.log("CONFIG-ALERTAS: Módulo inicializado correctamente");
}

// --- Inicializar Botones ---
function _inicializarBotones() {
    const btnNuevaRegla = document.getElementById('btn-nueva-regla');
    const btnRefrescarConfig = document.getElementById('btn-refrescar-config');
    const btnAyudaConfig = document.getElementById('btn-ayuda-config');
    
    if (btnNuevaRegla) {
        _addManagedEventListener(btnNuevaRegla, 'click', () => {
            console.log('CONFIG-ALERTAS: Abriendo modal para nueva regla...');
            _abrirModalConfiguracion();
        });
    }
    
    if (btnRefrescarConfig) {
        _addManagedEventListener(btnRefrescarConfig, 'click', async () => {
            console.log('CONFIG-ALERTAS: Refrescando configuración...');
            await _cargarConfiguracion();
        });
    }
    
    if (btnAyudaConfig) {
        _addManagedEventListener(btnAyudaConfig, 'click', (e) => {
            e.preventDefault();
            console.log('CONFIG-ALERTAS: Mostrando ayuda...');
            _mostrarAyudaConfiguracion();
        });
    }
}

// --- Inicializar Modales ---
function _inicializarModales() {
    // Modal de configuración
    if (modalConfigCerrarBtnElement) {
        _addManagedEventListener(modalConfigCerrarBtnElement, 'click', _cerrarModalConfiguracion);
    }
    
    if (configModalElement) {
        _addManagedEventListener(configModalElement, 'click', (e) => {
            if (e.target === configModalElement) _cerrarModalConfiguracion();
        });
    }
    
    // Modal de ayuda
    if (modalAyudaCerrarBtnElement) {
        _addManagedEventListener(modalAyudaCerrarBtnElement, 'click', () => {
            _cerrarAyudaConfiguracion();
        });
    }
    
    if (ayudaModalElement) {
        _addManagedEventListener(ayudaModalElement, 'click', (e) => {
            if (e.target === ayudaModalElement) _cerrarAyudaConfiguracion();
        });
    }
    
    // Inicializar formulario
    _inicializarFormulario();
}

// --- Inicializar Formulario ---
function _inicializarFormulario() {
    const form = document.getElementById('formConfigRegla');
    const btnCancelar = document.getElementById('btnCancelarConfig');
    const selectTipo = document.getElementById('reglaTipoCondicion');
    const btnInfo = document.getElementById('btnInfoCondicion');
    
    if (form) {
        _addManagedEventListener(form, 'submit', _guardarReglaConfiguracion);
    }
    
    if (btnCancelar) {
        _addManagedEventListener(btnCancelar, 'click', _cerrarModalConfiguracion);
    }
    
    if (selectTipo) {
        _addManagedEventListener(selectTipo, 'change', _manejarCambioTipoCondicion);
    }
    
    if (btnInfo) {
        _addManagedEventListener(btnInfo, 'click', (e) => {
            e.preventDefault();
            _mostrarAyudaConfiguracion();
        });
    }
    
    // Inicializar botones de keywords
    _inicializarBotonesKeywords();
}

// --- Cargar Configuración de Reglas ---
async function _cargarConfiguracion() {
    console.log('CONFIG-ALERTAS: Cargando configuración de reglas...');
    
    // Mostrar indicadores de carga
    if (loadingActivasElement) loadingActivasElement.classList.remove('hidden');
    if (loadingInactivasElement) loadingInactivasElement.classList.remove('hidden');
    if (noActivasElement) noActivasElement.classList.add('hidden');
    if (noInactivasElement) noInactivasElement.classList.add('hidden');
    if (errorActivasElement) errorActivasElement.classList.add('hidden');
    if (errorInactivasElement) errorInactivasElement.classList.add('hidden');
    
    // Limpiar contenido anterior
    _limpiarListasReglas();

    try {
        console.log('CONFIG-ALERTAS: Solicitando datos de configuración...');
        const response = await apiGatewayRequest('searchInSheet', {
            sheetName: 'ConfiguracionAlertas',
            searchTerm: '',
            maxResults: 1000
        });
        
        if (response && response.success && response.data && Array.isArray(response.data)) {
            reglasConfiguracion = response.data;
            console.log('CONFIG-ALERTAS: Reglas cargadas:', reglasConfiguracion.length);
            
            // Separar reglas activas e inactivas
            const reglasActivas = reglasConfiguracion.filter(r => 
                r.Activa === 'Sí' || r.activa === 'Sí' || r.Estado === 'Activa'
            );
            const reglasInactivas = reglasConfiguracion.filter(r => 
                r.Activa === 'No' || r.activa === 'No' || r.Estado === 'Inactiva'
            );
            
            console.log('CONFIG-ALERTAS: Reglas activas:', reglasActivas.length, 'Inactivas:', reglasInactivas.length);
            
            // Renderizar reglas
            _renderizarReglas(reglasActivas, listaReglasActivasElement, true);
            _renderizarReglas(reglasInactivas, listaReglasInactivasElement, false);
            
            // Mostrar mensajes apropiados
            if (reglasActivas.length === 0 && noActivasElement) {
                noActivasElement.classList.remove('hidden');
            }
            if (reglasInactivas.length === 0 && noInactivasElement) {
                noInactivasElement.classList.remove('hidden');
            }
        } else {
            throw new Error('Formato de datos incorrecto o respuesta vacía');
        }
    } catch (error) {
        console.error('CONFIG-ALERTAS: Error al cargar configuración:', error);
        
        if (errorActivasElement) {
            errorActivasElement.textContent = `Error: ${error.message}`;
            errorActivasElement.classList.remove('hidden');
        }
        if (errorInactivasElement) {
            errorInactivasElement.textContent = `Error: ${error.message}`;
            errorInactivasElement.classList.remove('hidden');
        }
    } finally {
        // Ocultar indicadores de carga
        if (loadingActivasElement) loadingActivasElement.classList.add('hidden');
        if (loadingInactivasElement) loadingInactivasElement.classList.add('hidden');
    }
}

// --- Limpiar Listas de Reglas ---
function _limpiarListasReglas() {
    if (listaReglasActivasElement) {
        const reglasExistentes = listaReglasActivasElement.querySelectorAll('.regla-item');
        reglasExistentes.forEach(item => item.remove());
    }
    
    if (listaReglasInactivasElement) {
        const reglasExistentes = listaReglasInactivasElement.querySelectorAll('.regla-item');
        reglasExistentes.forEach(item => item.remove());
    }
}

// --- Renderizar Lista de Reglas ---
function _renderizarReglas(reglas, container, esActiva) {
    if (!container || !Array.isArray(reglas)) return;
    
    reglas.forEach((regla, index) => {
        const reglaDiv = document.createElement('div');
        reglaDiv.className = `regla-item ${esActiva ? 'activa' : 'inactiva'}`;
        
        const descripcion = regla.Descripcion || regla.descripcion || regla.Notas || 'Sin descripción';
        const asunto = regla.Asunto || regla.asunto || 'No especificado';
        const tipoCondicion = regla.TipoCondicion || regla.tipoCondicion || 'SiemprePositivo';
        const valorCondicion = regla.ValorCondicion || regla.valorCondicion || '';
        
        reglaDiv.innerHTML = `
            <div class="regla-header">
                <div class="regla-info">
                    <h5 class="regla-titulo">${descripcion}</h5>
                    <p class="regla-asunto">Asunto: "${asunto}"</p>
                </div>
                <div class="regla-actions">
                    <button class="btn btn-sm btn-outline-primary btn-editar-regla" data-index="${index}" data-activa="${esActiva}" title="Editar regla">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-eliminar-regla" data-index="${index}" data-activa="${esActiva}" title="Eliminar regla">
                        <i class="ti ti-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-toggle-regla" data-index="${index}" data-activa="${esActiva}" title="${esActiva ? 'Desactivar' : 'Activar'} regla">
                        <i class="ti ti-${esActiva ? 'toggle-right' : 'toggle-left'}"></i>
                    </button>
                </div>
            </div>
            <div class="regla-details">
                <span class="regla-tipo">${tipoCondicion}</span>
                ${valorCondicion ? `<div class="regla-valor"><strong>Configuración:</strong> ${valorCondicion.substring(0, 50)}${valorCondicion.length > 50 ? '...' : ''}</div>` : ''}
            </div>
        `;
        
        container.appendChild(reglaDiv);
    });
    
    // Agregar event listeners a los botones
    _agregarListenersReglas(container, reglas, esActiva);
}

// --- Agregar Listeners a Botones de Reglas ---
function _agregarListenersReglas(container, reglas, esActiva) {
    const botonesEditar = container.querySelectorAll('.btn-editar-regla');
    const botonesEliminar = container.querySelectorAll('.btn-eliminar-regla');
    const botonesToggle = container.querySelectorAll('.btn-toggle-regla');
    
    botonesEditar.forEach(btn => {
        _addManagedEventListener(btn, 'click', () => {
            const index = parseInt(btn.dataset.index);
            _editarRegla(reglas[index]);
        });
    });
    
    botonesEliminar.forEach(btn => {
        _addManagedEventListener(btn, 'click', () => {
            const index = parseInt(btn.dataset.index);
            _eliminarRegla(reglas[index]);
        });
    });
    
    botonesToggle.forEach(btn => {
        _addManagedEventListener(btn, 'click', () => {
            const index = parseInt(btn.dataset.index);
            _toggleRegla(reglas[index]);
        });
    });
}

// --- Gestión de Modales ---
function _abrirModalConfiguracion(regla = null) {
    if (!configModalElement || !modalConfigTituloElement) return;
    
    // Limpiar formulario
    _limpiarFormularioConfiguracion();
    
    if (regla) {
        modalConfigTituloElement.textContent = 'Editar Regla de Alerta';
        _cargarDatosReglaEnFormulario(regla);
    } else {
        modalConfigTituloElement.textContent = 'Nueva Regla de Alerta';
    }
    
    configModalElement.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function _cerrarModalConfiguracion() {
    if (configModalElement) {
        configModalElement.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function _mostrarAyudaConfiguracion() {
    if (ayudaModalElement) {
        ayudaModalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function _cerrarAyudaConfiguracion() {
    if (ayudaModalElement) {
        ayudaModalElement.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// --- Funciones de Formulario (Simplificadas) ---
function _limpiarFormularioConfiguracion() {
    const form = document.getElementById('formConfigRegla');
    const descripcion = document.getElementById('reglaDescripcion');
    const asunto = document.getElementById('reglaAsunto');
    const tipo = document.getElementById('reglaTipoCondicion');
    const estado = document.getElementById('reglaEstado');
    
    // Clear editing UID
    if (form && form.dataset.editingUid) {
        delete form.dataset.editingUid;
    }
    
    if (descripcion) descripcion.value = '';
    if (asunto) asunto.value = '';
    if (tipo) tipo.value = 'SiemprePositivo';
    if (estado) estado.value = 'Sí';
    
    _manejarCambioTipoCondicion();
}

function _manejarCambioTipoCondicion() {
    console.log('CONFIG-ALERTAS: Cambio en tipo de condición - funcionalidad básica implementada');
    // Aquí se puede expandir la lógica para mostrar/ocultar campos según el tipo
}

function _inicializarBotonesKeywords() {
    console.log('CONFIG-ALERTAS: Inicializando botones de keywords - funcionalidad básica');
    // Implementar lógica para agregar/remover keywords en condiciones multi-condicionales
}

function _cargarDatosReglaEnFormulario(regla) {
    console.log('CONFIG-ALERTAS: Cargando datos de regla en formulario:', regla);
    
    const form = document.getElementById('formConfigRegla');
    const descripcion = document.getElementById('reglaDescripcion');
    const asunto = document.getElementById('reglaAsunto');
    const tipo = document.getElementById('reglaTipoCondicion');
    const estado = document.getElementById('reglaEstado');
    
    // Store UID for editing
    if (regla.UID || regla.uid) {
        form.dataset.editingUid = regla.UID || regla.uid;
    }
    
    if (descripcion) descripcion.value = regla.Descripcion || regla.descripcion || '';
    if (asunto) asunto.value = regla.Asunto || regla.asunto || '';
    if (tipo) tipo.value = regla.TipoCondicion || regla.tipoCondicion || 'SiemprePositivo';
    if (estado) estado.value = regla.Activa || regla.activa || 'Sí';
}

// --- Acciones de Reglas ---
function _editarRegla(regla) {
    console.log('CONFIG-ALERTAS: Editando regla:', regla);
    _abrirModalConfiguracion(regla);
}

async function _eliminarRegla(regla) {
    const descripcion = regla.Descripcion || regla.descripcion || 'esta regla';
    const uid = regla.UID || regla.uid;
    
    if (!uid) {
        alert('Error: No se puede eliminar la regla sin UID');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar "${descripcion}"?`)) {
        console.log('CONFIG-ALERTAS: Eliminando regla:', regla);
        
        try {
            await apiGatewayRequest('deleteConfigRule', { uid });
            console.log('CONFIG-ALERTAS: Regla eliminada exitosamente');
            alert('Regla eliminada correctamente');
            await _cargarConfiguracion(); // Recargar lista
        } catch (error) {
            console.error('CONFIG-ALERTAS: Error al eliminar regla:', error);
            alert(`Error al eliminar regla: ${error.message}`);
        }
    }
}

async function _toggleRegla(regla) {
    const descripcion = regla.Descripcion || regla.descripcion || 'esta regla';
    const estadoActual = regla.Activa || regla.activa || 'Sí';
    const uid = regla.UID || regla.uid;
    const nuevoEstado = estadoActual === 'Sí' ? 'No' : 'Sí';
    const accion = nuevoEstado === 'Sí' ? 'activar' : 'desactivar';
    
    if (!uid) {
        alert('Error: No se puede cambiar el estado de la regla sin UID');
        return;
    }
    
    if (confirm(`¿Quieres ${accion} "${descripcion}"?`)) {
        console.log(`CONFIG-ALERTAS: ${accion} regla:`, regla);
        
        try {
            const response = await apiGatewayRequest('toggleConfigRule', { uid });
            console.log(`CONFIG-ALERTAS: Estado cambiado exitosamente:`, response);
            alert(`Regla ${accion}da correctamente`);
            await _cargarConfiguracion(); // Recargar lista
        } catch (error) {
            console.error(`CONFIG-ALERTAS: Error al ${accion} regla:`, error);
            alert(`Error al ${accion} regla: ${error.message}`);
        }
    }
}

async function _guardarReglaConfiguracion(e) {
    e.preventDefault();
    console.log('CONFIG-ALERTAS: Guardando regla de configuración...');
    
    const descripcion = document.getElementById('reglaDescripcion').value.trim();
    const asunto = document.getElementById('reglaAsunto').value.trim();
    const tipo = document.getElementById('reglaTipoCondicion').value;
    const estado = document.getElementById('reglaEstado').value;
    
    if (!descripcion || !asunto) {
        alert('Por favor completa la descripción y el asunto de la regla');
        return;
    }
    
    // Check if we're editing an existing rule
    const form = document.getElementById('formConfigRegla');
    const uidExistente = form.dataset.editingUid;
    
    const reglaData = {
        descripcion: descripcion,
        asunto: asunto,
        tipoCondicion: tipo,
        valorCondicion: '', // TODO: Implement based on condition type
        estado: estado
    };
    
    console.log('CONFIG-ALERTAS: Datos de regla a guardar:', reglaData);
    
    try {
        let response;
        if (uidExistente) {
            // Update existing rule
            reglaData.uid = uidExistente;
            response = await apiGatewayRequest('updateConfigRule', reglaData);
            console.log('CONFIG-ALERTAS: Regla actualizada exitosamente');
            alert('Regla actualizada correctamente');
        } else {
            // Create new rule
            response = await apiGatewayRequest('addConfigRule', reglaData);
            console.log('CONFIG-ALERTAS: Regla creada exitosamente');
            alert('Regla creada correctamente');
        }
        
        _cerrarModalConfiguracion();
        await _cargarConfiguracion(); // Recargar lista después de guardar
    } catch (error) {
        console.error('CONFIG-ALERTAS: Error al guardar regla:', error);
        alert(`Error al guardar regla: ${error.message}`);
    }
}

// --- Cleanup Function ---
function cleanupConfigAlertas() {
    console.log('CONFIG-ALERTAS: Limpiando recursos...');
    
    // Remover todos los event listeners
    activeEventListeners.forEach(({ element, type, handler, options }) => {
        element.removeEventListener(type, handler, options);
    });
    activeEventListeners = [];
}

// --- Exportar funciones globalmente ---
window.initConfigAlertas = initConfigAlertas;
window.cleanupConfigAlertas = cleanupConfigAlertas;
window._cargarConfiguracion = _cargarConfiguracion;

console.log('CONFIG-ALERTAS: Módulo cargado y listo para inicializar');