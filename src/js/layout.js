// layout.js
// Layout completo CoreUI, menú lateral dinámico, con visibilidad por roles.
// TODO: Agregá roles y permisos a cada item donde corresponda. Si no usás roles, dejá show: true.

export function renderLayout({ user, content = '', breadcrumbs = [], pageTitle = '' }) {

  // --- Estructura de menú lateral, súper escalable ---
  // Podés agregar, quitar o ajustar el "show" según roles, flags, etc.
  const menuItems = [
    { type: 'item', label: 'Dashboard', href: 'index.html', icon: 'ti-dashboard', badge: { text: 'NEW', color: 'info' }, show: true },
    { type: 'title', label: 'Theme', show: true },
    { type: 'item', label: 'Colors', href: 'colors.html', icon: 'ti-palette', show: true },
    { type: 'item', label: 'Typography', href: 'typography.html', icon: 'ti-typography', show: true },
    { type: 'title', label: 'Components', show: true },
    { type: 'item', label: 'Gestión de Fraudes', href: 'fraudes.html', icon: 'ti-shield-lock', show: user.role === 'admin' || user.role === 'fraude' },
    { type: 'group', label: 'Base', icon: 'ti-box', show: user.role !== 'guest', items: [
      { label: 'Accordion', href: 'base/accordion.html' },
      { label: 'Breadcrumb', href: 'base/breadcrumb.html' },
      { label: 'Cards', href: 'base/cards.html' },
      { label: 'Carousel', href: 'base/carousel.html' },
      { label: 'Collapse', href: 'base/collapse.html' },
      { label: 'List group', href: 'base/list-group.html' },
      { label: 'Navs & Tabs', href: 'base/navs-tabs.html' },
      { label: 'Pagination', href: 'base/pagination.html' },
      { label: 'Placeholders', href: 'base/placeholders.html' },
      { label: 'Popovers', href: 'base/popovers.html' },
      { label: 'Progress', href: 'base/progress.html' },
      { label: 'Spinners', href: 'base/spinners.html' },
      { label: 'Tables', href: 'base/tables.html' },
      { label: 'Tooltips', href: 'base/tooltips.html' }
    ]},
    { type: 'group', label: 'Buttons', icon: 'ti-square-rounded', show: true, items: [
      { label: 'Buttons', href: 'buttons/buttons.html' },
      { label: 'Buttons Group', href: 'buttons/button-group.html' },
      { label: 'Dropdowns', href: 'buttons/dropdowns.html' },
      { label: 'Loading Buttons', href: 'https://coreui.io/bootstrap/docs/components/loading-buttons/', badge: { text: 'PRO', color: 'danger' }, external: true }
    ]},
    { type: 'item', label: 'Charts', href: 'charts.html', icon: 'ti-chart-bar', show: true },
    { type: 'group', label: 'Forms', icon: 'ti-forms', show: true, items: [
      { label: 'Autocomplete', href: 'https://coreui.io/bootstrap/docs/forms/autocomplete/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Checks and radios', href: 'forms/checks-radios.html' },
      { label: 'Date Picker', href: 'https://coreui.io/bootstrap/docs/forms/date-picker/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Date Range Picker', href: 'https://coreui.io/bootstrap/docs/forms/date-range-picker/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Floating labels', href: 'forms/floating-labels.html' },
      { label: 'Form Control', href: 'forms/form-control.html' },
      { label: 'Input group', href: 'forms/input-group.html' },
      { label: 'Multi Select', href: 'https://coreui.io/bootstrap/docs/forms/multi-select/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Range', href: 'forms/range.html' },
      { label: 'Range Slider', href: 'https://coreui.io/bootstrap/docs/forms/range-slider/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Rating', href: 'https://coreui.io/bootstrap/docs/forms/rating/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Select', href: 'forms/select.html' },
      { label: 'Time Picker', href: 'https://coreui.io/bootstrap/docs/forms/time-picker/', badge: { text: 'PRO', color: 'danger' }, external: true },
      { label: 'Layout', href: 'forms/layout.html' },
      { label: 'Validation', href: 'forms/validation.html' }
    ]},
    { type: 'group', label: 'Icons', icon: 'ti-icons', show: true, items: [
      { label: 'CoreUI Icons', href: 'icons/coreui-icons-free.html', badge: { text: 'Free', color: 'success' } },
      { label: 'CoreUI Icons - Brand', href: 'icons/coreui-icons-brand.html' },
      { label: 'CoreUI Icons - Flag', href: 'icons/coreui-icons-flag.html' }
    ]},
    { type: 'group', label: 'Notifications', icon: 'ti-bell', show: true, items: [
      { label: 'Alerts', href: 'notifications/alerts.html' },
      { label: 'Badge', href: 'notifications/badge.html' },
      { label: 'Modals', href: 'notifications/modals.html' },
      { label: 'Toasts', href: 'notifications/toasts.html' }
    ]},
    { type: 'item', label: 'Widgets', href: 'widgets.html', icon: 'ti-layout-grid', badge: { text: 'NEW', color: 'info' }, show: true },
    { type: 'divider', show: true },
    { type: 'title', label: 'Extras', show: true },
    { type: 'group', label: 'Pages', icon: 'ti-file', show: true, items: [
      { label: 'Login', href: 'login.html', external: false },
      { label: 'Register', href: 'register.html', external: false },
      { label: 'Error 404', href: '404.html', external: false },
      { label: 'Error 500', href: '500.html', external: false }
    ]},
    { type: 'item', label: 'Docs', href: 'https://coreui.io/bootstrap/docs/templates/installation/', icon: 'ti-file-description', external: true, show: true },
    { type: 'item', label: 'Try CoreUI PRO', href: 'https://coreui.io/product/bootstrap-dashboard-template/', icon: '', customIcon: '<img src="../assets/icons/layers.svg" alt="layers" width="24" height="24" style="vertical-align:middle;">', show: true, external: true, badge: null, classes: 'text-primary fw-semibold' }
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
                  ${item.icon ? `<i class="ti ${item.icon}" style="font-size: 20px; vertical-align: middle;"></i>` : (item.customIcon || '')}
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
                  <i class="ti ${item.icon}" style="font-size: 20px; vertical-align: middle;"></i> ${item.label}
                </a>
                <ul class="nav-group-items compact">
                  ${item.items.map(sub =>
                    `<li class="nav-item">
                      <a class="nav-link" href="${sub.href}"${sub.external ? ' target="_blank"' : ''}>
                        ${sub.customIcon || ''}
                        ${sub.label}
                        ${sub.badge ? `<span class="badge badge-sm bg-${sub.badge.color} ms-auto">${sub.badge.text}</span>` : ''}
                        ${sub.external ? '<i class="ti ti-external-link" style="font-size: 1.1rem; margin-left: 0.5em; vertical-align: middle;"></i>' : ''}
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
          <div class="avatar avatar-md"><img class="avatar-img" src="${user.avatar || '../assets/img/avatars/8.jpg'}" alt="${user.email || ''}"></div>
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
  document.body.innerHTML = `
    <!-- SIDEBAR -->
    <div class="sidebar sidebar-dark sidebar-fixed border-end" id="sidebar">
      <div class="sidebar-header border-bottom">
        <div class="sidebar-brand">
          <svg class="sidebar-brand-full" width="88" height="32" alt="CoreUI Logo">
            <use xlink:href="../assets/brand/coreui.svg#full"></use>
          </svg>
          <svg class="sidebar-brand-narrow" width="32" height="32" alt="CoreUI Logo">
            <use xlink:href="../assets/brand/coreui.svg#signet"></use>
          </svg>
        </div>
        <button class="btn-close d-lg-none" type="button" data-coreui-theme="dark" aria-label="Close" onclick="coreui.Sidebar.getInstance(document.querySelector('#sidebar')).toggle()"></button>
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
          <button class="header-toggler" type="button" onclick="coreui.Sidebar.getInstance(document.querySelector('#sidebar')).toggle()" style="margin-inline-start: -14px;">
            <i class="ti ti-menu" style="font-size: 2rem;"></i>
          </button>
          <ul class="header-nav d-none d-lg-flex">
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-users" style="font-size: 1.2rem; vertical-align: middle;"></i> Users</a></li>
            <li class="nav-item"><a class="nav-link" href="#"><i class="ti ti-settings" style="font-size: 1.2rem; vertical-align: middle;"></i> Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="#" onclick="logout()"><i class="ti ti-logout" style="font-size: 1.2rem; vertical-align: middle;"></i> Logout</a></li>
          </ul>
          <ul class="header-nav ms-auto">
            <li class="nav-item dropdown">
              <button class="btn btn-link nav-link py-2 px-2 d-flex align-items-center" type="button" aria-expanded="false" data-bs-toggle="dropdown">
                <i class="ti ti-moon" style="font-size: 1.5rem;"></i>
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
        <div><a href="https://coreui.io">CoreUI </a><a href="https://coreui.io/product/free-bootstrap-admin-template/">Bootstrap Admin Template</a> &copy; 2025 creativeLabs.</div>
        <div class="ms-auto">Powered by&nbsp;<a href="https://coreui.io/bootstrap/docs/">CoreUI UI Components</a></div>
      </footer>
    </div>
  `;
}
