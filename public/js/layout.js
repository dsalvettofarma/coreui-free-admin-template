// layout.js
// Layout completo CoreUI, menú lateral dinámico, con visibilidad por roles.
// TODO: Agregá roles y permisos a cada item donde corresponda. Si no usás roles, dejá show: true.

export function renderLayout({ user, content = '', breadcrumbs = [], pageTitle = '' }) {

  // --- Estructura de menú lateral, súper escalable ---
  // Podés agregar, quitar o ajustar el "show" según roles, flags, etc.
  const menuItems = [
    { type: 'item', label: 'Dashboard', href: 'index.html', icon: 'ti-dashboard', badge: { text: 'NEW', color: 'info' }, show: true },
    { type: 'title', label: 'Theme', show: false },
    { type: 'item', label: 'Typography', href: 'typography.html', icon: 'ti-typography', show: true },
    { type: 'title', label: 'Herramientas', show: true },
    { type: 'item', label: 'Gestión de Fraudes', href: 'fraudes.html', icon: 'ti-shield-lock', show: user.role === 'admin' || user.role === 'fraude' },
    { type: 'item', label: 'Inspector de Pagos', href: 'inspector.html', icon: 'ti-search', show: user.role === 'admin' },
    { type: 'group', label: 'Monitor de Alertas', icon: 'ti-alert-triangle', show: user.role === 'admin' || user.role === 'monitor', items: [
      { label: 'Dashboard de Alertas', href: 'alertas.html' },
      { label: 'Configuración de Reglas', href: 'config-alertas.html' }
    ]},
    { type: 'group', label: 'Buttons', icon: 'ti-square-rounded', show: true, items: [
      { label: 'Buttons', href: 'buttons/buttons.html' },
      { label: 'Buttons Group', href: 'buttons/button-group.html' },
      { label: 'Dropdowns', href: 'buttons/dropdowns.html' },
      { label: 'Loading Buttons', href: 'https://coreui.io/bootstrap/docs/components/loading-buttons/', badge: { text: 'PRO', color: 'danger' }, external: false }
    ]},
    { type: 'item', label: 'Charts', href: 'charts.html', icon: 'ti-chart-bar', show: true },
    { type: 'group', label: 'Icons', icon: 'ti-icons', show: true, items: [
      { label: 'CoreUI Icons', href: 'icons/coreui-icons-free.html', badge: { text: 'Free', color: 'success' } },
      { label: 'CoreUI Icons - Brand', href: 'icons/coreui-icons-brand.html' },
      { label: 'CoreUI Icons - Flag', href: 'icons/coreui-icons-flag.html' }
    ]},
    { type: 'item', label: 'Widgets', href: 'widgets.html', icon: 'ti-layout-grid', badge: { text: 'NEW', color: 'info' }, show: true },
    { type: 'divider', show: true },
  ];

  // Renderizar el menú lateral dinámico
  function renderSidebarMenu() {
    return `
      <ul class="sidebar-nav" data-coreui="navigation" data-simplebar>
        ${menuItems.filter(i => i.show !== false).map(item => {
          if (item.type === 'title') {
            return `<li class="nav-title">${item.label}</li>`;
          }
          if (item.type === 'divider') {
            return `<li class="nav-divider"></li>`;
          }
          if (item.type === 'item') {
            return `
              <li class="nav-item">
                <a class="nav-link ${item.classes || ''}" href="${item.href}"${item.external ? ' target="_blank"' : ''}>
                  ${item.icon ? `<i class="ti ${item.icon}" style="font-size: 2rem; vertical-align: middle;"></i>` : (item.customIcon || '')}
                  ${item.label}
                  ${item.badge ? `<span class="badge badge-sm bg-${item.badge.color} ms-auto">${item.badge.text}</span>` : ''}
                </a>
              </li>
            `;
          }
          if (item.type === 'group') {
            return `
              <li class="nav-group">
                <a class="nav-link nav-group-toggle" href="#">
                  <i class="ti ${item.icon}" style="font-size: 2rem; vertical-align: middle;"></i> ${item.label}
                </a>
                <ul class="nav-group-items compact">
                  ${item.items.map(sub =>
                    `<li class="nav-item">
                      <a class="nav-link" href="${sub.href}"${sub.external ? ' target="_blank"' : ''}>
                        ${sub.customIcon || ''}
                        ${sub.label}
                        ${sub.badge ? `<span class="badge badge-sm bg-${sub.badge.color} ms-auto">${sub.badge.text}</span>` : ''}
                        ${sub.external ? '<i class="ti ti-external-link" style="font-size: 1.8rem; margin-left: 0.5em; vertical-align: middle;"></i>' : ''}
                      </a>
                    </li>`
                  ).join('')}
                </ul>
              </li>
            `;
          }
        }).join('')}
      </ul>
    `;
  }

  // Breadcrumbs dinámicos
  function renderBreadcrumbs() {
    if (!breadcrumbs || !breadcrumbs.length) return '';
    return `
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb my-0">
          ${breadcrumbs.map((b, i) =>
            b.url
              ? `<li class="breadcrumb-item"><a href="${b.url}">${b.name}</a></li>`
              : `<li class="breadcrumb-item active"><span>${b.name}</span></li>`
          ).join('')}
        </ol>
      </nav>
    `;
  }

  // User dropdown header
  function renderUserDropdown() {
    return `
      <li class="nav-item dropdown">
        <a class="nav-link py-0 pe-0" data-coreui-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">
          <div class="avatar avatar-md bg-primary text-white d-flex align-items-center justify-content-center"><i class="ti ti-user fs-5"></i></div>
        </a>
        <div class="dropdown-menu dropdown-menu-end pt-0">
          <div class="dropdown-header bg-body-tertiary text-body-secondary fw-semibold rounded-top mb-2">Account</div>
          <a class="dropdown-item" href="#"><i class="ti ti-user" style="font-size: 24px;"></i> Profile</a>
          <a class="dropdown-item" href="#"><i class="ti ti-settings" style="font-size: 24px;"></i> Settings</a>
          <div class="dropdown-divider"></div>
          <a class="dropdown-item" href="#" onclick="logout()"><i class="ti ti-logout" style="font-size: 24px;"></i> Logout</a>
        </div>
      </li>
    `;
  }

  // Layout principal
  let app = document.getElementById('app');
  if (!app) {
    app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
  }
  app.innerHTML = `
    <!-- SIDEBAR -->
    <div class="sidebar sidebar-fixed border-end" id="sidebar">
      <div class="sidebar-header border-bottom">
        <div class="sidebar-brand">
          <svg class="sidebar-brand-full" width="88" height="32" alt="CoreUI Logo">
            <use xlink:href="../assets/brand/coreui.svg#full"></use>
          </svg>
          <svg class="sidebar-brand-narrow" width="32" height="32" alt="CoreUI Logo">
            <use xlink:href="../assets/brand/coreui.svg#signet"></use>
          </svg>
        </div>
        <button class="btn-close d-lg-none" type="button" aria-label="Close" onclick="coreui.Sidebar.getInstance(document.querySelector('#sidebar')).toggle()"></button>
      </div>
      ${renderSidebarMenu()}
      <div class="sidebar-footer border-top d-none d-md-flex">
        <button class="sidebar-toggler" type="button" data-coreui-toggle="unfoldable"></button>
      </div>
    </div>

    <!-- WRAPPER -->
    <div class="wrapper d-flex flex-column min-vh-100">
      <!-- HEADER -->
      <header class="header header-sticky p-0 mb-4" id="main-header">
        <div class="container-fluid border-bottom px-4 d-flex align-items-center">
          <button class="header-toggler" type="button" onclick="coreui.Sidebar.getInstance(document.querySelector('#sidebar')).toggle()" style="margin-inline-start: -1.4rem;">
            <i class="ti ti-menu" style="font-size: 2rem;"></i>
          </button>
          <ul class="header-nav d-none d-lg-flex">
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-users" style="font-size: 1.2rem; vertical-align: middle;"></i> Users</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-settings" style="font-size: 1.2rem; vertical-align: middle;"></i> Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="#" onclick="logout()"><i class="ti ti-logout" style="font-size: 1.2rem; vertical-align: middle;"></i> Logout</a></li>
          </ul>
          <ul class="header-nav ms-auto">
            <li class="nav-item dropdown">
              <button class="btn btn-link nav-link py-2 px-2 d-flex align-items-center" type="button" aria-expanded="false" data-bs-toggle="dropdown" id="theme-toggle-btn">
                <i id="theme-icon" class="ti ti-sun" style="font-size: 1.5rem;"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end" style="--cui-dropdown-min-width: 8rem;">
                <li><button class="dropdown-item d-flex align-items-center" type="button" data-coreui-theme-value="light"><i class="ti ti-sun me-3" style="font-size: 1.2rem;"></i>Light</button></li>
                <li><button class="dropdown-item d-flex align-items-center" type="button" data-coreui-theme-value="dark"><i class="ti ti-moon me-3" style="font-size: 1.2rem;"></i>Dark</button></li>
                <li><button class="dropdown-item d-flex align-items-center" type="button" data-coreui-theme-value="auto"><i class="ti ti-world me-3" style="font-size: 1.2rem;"></i>Auto</button></li>
              </ul>
            </li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-bell" style="font-size: 1.5rem;"></i></a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-menu" style="font-size: 1.5rem;"></i></a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-mail" style="font-size: 1.5rem;"></i></a></li>
            ${renderUserDropdown()}
          </ul>
        </div>
        <div class="container-fluid px-4">
          ${renderBreadcrumbs()}
        </div>
      </header>

      <!-- CONTENIDO PRINCIPAL -->
      <div class="body flex-grow-1" id="main-body">
        ${content}
      </div>

      <!-- FOOTER -->
      <footer class="footer px-4" id="main-footer">
        <div><!--<a href="https://coreui.io">CoreUI </a><a href="https://coreui.io/product/free-bootstrap-admin-template/">Bootstrap Admin Template</a> &copy; 2025 creativeLabs.--></div>
        <div class="ms-auto">Powered by Plataformas</div>
      </footer>
    </div>
  `;
  
  // Actualizar icono del tema después de renderizar
  setTimeout(() => {
    updateThemeIcon();
  }, 100);
}

// Función para actualizar el icono del tema
function updateThemeIcon() {
  const themeIcon = document.getElementById('theme-icon');
  if (!themeIcon) return;
  
  const currentTheme = document.documentElement.getAttribute('data-coreui-theme') || 'light';
  
  // Remover todas las clases de icono
  themeIcon.className = themeIcon.className.replace(/ti-\w+/g, '');
  
  // Añadir el icono correcto según el tema
  switch(currentTheme) {
    case 'dark':
      themeIcon.classList.add('ti', 'ti-moon');
      break;
    case 'auto':
      themeIcon.classList.add('ti', 'ti-world');
      break;
    case 'light':
    default:
      themeIcon.classList.add('ti', 'ti-sun');
      break;
  }
}

// Observer para cambios en el atributo data-coreui-theme
const themeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-coreui-theme') {
      updateThemeIcon();
    }
  });
});

// Inicializar observer cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Observar cambios en el atributo del html
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-coreui-theme']
  });

  // Agregar estilos consistentes para el sidebar
  if (!document.getElementById('layout-sidebar-styles')) {
    const sidebarStyles = document.createElement('style');
    sidebarStyles.id = 'layout-sidebar-styles';
    sidebarStyles.textContent = `
      /* Forzar que header y sidebar tengan el mismo color */
      html[data-coreui-theme="light"] .header {
        background-color: #fff !important;
      }
      
      html[data-coreui-theme="light"] .sidebar {
        background-color: #fff !important;
      }
      
      html[data-coreui-theme="dark"] .header {
        background-color: #23272b !important;
      }
      
      html[data-coreui-theme="dark"] .sidebar {
        background-color: #23272b !important;
      }
    `;
    document.head.appendChild(sidebarStyles);
  }
});

// Exportar funciones
window.renderLayout = renderLayout;
window.updateThemeIcon = updateThemeIcon;
