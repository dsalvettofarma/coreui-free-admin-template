// Debug script to check elements after layout rendering
console.log('=== INSPECTOR DEBUG ===');

// Function to debug elements
function debugElements() {
    const elements = {
        'sheet': document.getElementById('sheet'),
        'btnRefrescarHojas': document.getElementById('btnRefrescarHojas'),
        'btnPrecargar': document.getElementById('btnPrecargar'),
        'btnBuscar': document.getElementById('btnBuscar'),
        'valor': document.getElementById('valor'),
        'columna': document.getElementById('columna'),
        'tipoMatch': document.getElementById('tipoMatch'),
        'fechaDesde': document.getElementById('fechaDesde'),
        'fechaHasta': document.getElementById('fechaHasta'),
        'btnLimpiarFiltroFechas': document.getElementById('btnLimpiarFiltroFechas'),
        'btnMostrarUltimo': document.getElementById('btnMostrarUltimo'),
        'btnAnulados': document.getElementById('btnAnulados'),
        'btnRechazados': document.getElementById('btnRechazados'),
        'tablaResultados': document.getElementById('tablaResultados'),
        'estado': document.getElementById('estado'),
        'overlay-spinner': document.getElementById('overlay-spinner'),
        'overlay-text': document.getElementById('overlay-text'),
        'canalVenta': document.getElementById('canalVenta'),
        'comercio': document.getElementById('comercio')
    };
    
    console.log('Element presence:');
    Object.entries(elements).forEach(([id, element]) => {
        console.log(`  ${id}: ${element ? 'FOUND' : 'NOT FOUND'}`);
        if (element) {
            console.log(`    - Tag: ${element.tagName}`);
            console.log(`    - Classes: ${element.className}`);
            if (element.children.length > 0) {
                console.log(`    - Children: ${element.children.length}`);
            }
        }
    });
    
    // Check app div content
    const appDiv = document.getElementById('app');
    if (appDiv) {
        console.log(`App div content length: ${appDiv.innerHTML.length}`);
        console.log('App div structure preview:', appDiv.innerHTML.substring(0, 500));
    }
    
    // Check main-body content
    const mainBody = document.getElementById('main-body');
    if (mainBody) {
        console.log(`Main body content length: ${mainBody.innerHTML.length}`);
        console.log('Main body structure preview:', mainBody.innerHTML.substring(0, 500));
    }
}

// Run debug after a delay to allow layout rendering
setTimeout(debugElements, 1000);

// Also make it available globally
window.debugInspectorElements = debugElements;

console.log('Debug script loaded. Call debugInspectorElements() to check elements anytime.');