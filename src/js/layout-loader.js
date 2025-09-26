// layout-loader.js - Sistema universal de carga de layout
function loadLayout(config = {}) {
  const {
    activeMenuItem = '',
    breadcrumbs = [{ name: 'Home', url: 'index.html' }],
    pageTitle = 'Dashboard'
  } = config;

  // Cargar layout dinámicamente
  fetch('layout.html')
    .then(r => r.text())
    .then(html => {
      // Insertar la estructura completa del layout
      document.getElementById('layout-container').innerHTML = html;
      
      // Obtener el contenido específico de la página
      const pageContent = document.getElementById('page-content');
      
      // Inyectar el contenido en el body del layout
      const mainBody = document.getElementById('main-body');
      if (mainBody && pageContent) {
        // Crear contenedor con padding similar al index
        const container = document.createElement('div');
        container.className = 'container-lg px-4';
        container.innerHTML = pageContent.innerHTML;
        mainBody.appendChild(container);
        
        // Mostrar el contenido
        pageContent.style.display = 'none'; // Mantener oculto el original
      }
      
      // Post-procesamiento del layout
      setupLayout(activeMenuItem, breadcrumbs, pageTitle);
    })
    .catch(error => {
      console.error('Error cargando layout:', error);
      // Mostrar contenido aunque falle el layout
      const pageContent = document.getElementById('page-content');
      if (pageContent) {
        pageContent.style.display = 'block';
      }
    });
}

function setupLayout(activeMenuItem, breadcrumbs, pageTitle) {
  // 1. Marcar elemento activo en el menú
  if (activeMenuItem) {
    const activeLink = document.querySelector(`a[href="${activeMenuItem}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
  
  // 2. Configurar breadcrumbs
  setupBreadcrumbs(breadcrumbs);
  
  // 3. Configurar título
  if (pageTitle && pageTitle !== 'Dashboard') {
    document.title = `${pageTitle} - Dashboard`;
  }
  
  // 4. Inicializar CoreUI Sidebar
  if (window.coreui && document.getElementById('sidebar')) {
    new coreui.Sidebar(document.getElementById('sidebar'));
  }
  
  // 5. Configurar tema
  setupTheme();
  
  // 6. Configurar scroll del header
  setupHeaderScroll();
}

function setupBreadcrumbs(breadcrumbs) {
  const breadcrumbContainer = document.querySelector('.breadcrumb');
  if (breadcrumbContainer && breadcrumbs.length > 0) {
    breadcrumbContainer.innerHTML = '';
    
    breadcrumbs.forEach((crumb, index) => {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';
      
      if (index === breadcrumbs.length - 1) {
        // Último elemento (activo)
        li.classList.add('active');
        li.innerHTML = `<span>${crumb.name}</span>`;
      } else {
        // Elementos con enlace
        li.innerHTML = `<a href="${crumb.url}">${crumb.name}</a>`;
      }
      
      breadcrumbContainer.appendChild(li);
    });
  }
}

function setupTheme() {
  // Script para cambiar el tema desde el header
  document.querySelectorAll('[data-coreui-theme-value]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var theme = btn.getAttribute('data-coreui-theme-value');
      document.documentElement.setAttribute('data-coreui-theme', theme);
      localStorage.setItem('coreui-theme', theme);
      
      // Marcar activo
      document.querySelectorAll('[data-coreui-theme-value]').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
    });
  });
  
  // Al cargar, aplicar preferencia guardada
  var savedTheme = localStorage.getItem('coreui-theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-coreui-theme', savedTheme);
    document.querySelectorAll('[data-coreui-theme-value]').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-coreui-theme-value') === savedTheme);
    });
  }
}

function setupHeaderScroll() {
  const header = document.querySelector('header.header');
  
  document.addEventListener('scroll', () => {
    if (header) {
      header.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0);
    }
  });
}

// Exportar para uso en otros scripts
window.loadLayout = loadLayout;