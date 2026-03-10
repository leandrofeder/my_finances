/* ─── UI CUSTOMIZADA: Toast + Modal ─── */

/* ── TOAST (notificações rápidas, sem interação) ── */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="toast-bar"></div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-in'));

  const bar = toast.querySelector('.toast-bar');
  bar.style.transition = `width ${duration}ms linear`;
  requestAnimationFrame(() => { bar.style.width = '0%'; });

  const dismiss = () => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  const timer = setTimeout(dismiss, duration);
  toast.addEventListener('click', e => {
    if (e.target.closest('.toast-close')) return;
    clearTimeout(timer);
    dismiss();
  });
}

/* ── MODAL BUILDER INTERNO ── */
function _buildModal({ id, icon, title, message, body, type = 'info', buttons = [] }) {
  document.getElementById(id)?.remove();

  const colorMap = {
    success: 'var(--green)',
    error:   'var(--red)',
    warning: 'var(--yellow, #f59e0b)',
    info:    'var(--accent)',
  };
  const color = colorMap[type] || colorMap.info;

  const iconSVG = icon || {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  }[type];

  const buttonsHTML = buttons.map(b =>
    `<button class="modal-btn modal-btn-${b.style || 'secondary'}" data-action="${b.action}">${b.label}</button>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = id;
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="modal-header" style="--modal-color:${color}">
        <span class="modal-icon">${iconSVG}</span>
        <h3 class="modal-title" id="${id}-title">${title}</h3>
      </div>
      <div class="modal-body">
        ${message ? `<p class="modal-msg">${message}</p>` : ''}
        ${body || ''}
      </div>
      ${buttons.length ? `<div class="modal-footer">${buttonsHTML}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-in'));

  setTimeout(() => {
    const primary = overlay.querySelector('.modal-btn-primary') || overlay.querySelector('.modal-btn');
    primary?.focus();
  }, 80);

  return overlay;
}

/* ── ALERT (substitui alert()) ── */
function showAlert(title, message, type = 'info') {
  return new Promise(resolve => {
    const id = 'modal-alert-' + Date.now();
    const overlay = _buildModal({
      id, title, message, type,
      buttons: [{ label: 'OK', style: 'primary', action: 'ok' }]
    });

    const close = () => {
      overlay.classList.remove('modal-in');
      overlay.classList.add('modal-out');
      overlay.addEventListener('animationend', () => { overlay.remove(); resolve(); }, { once: true });
    };

    overlay.querySelector('[data-action="ok"]').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(); }
    });
  });
}

/* ── CONFIRM (substitui confirm()) → Promise<boolean> ── */
function showConfirm(title, message, opts = {}) {
  return new Promise(resolve => {
    const id = 'modal-confirm-' + Date.now();
    const {
      type         = 'warning',
      confirmLabel = 'Confirmar',
      cancelLabel  = 'Cancelar',
      confirmStyle = 'danger',
    } = opts;

    const overlay = _buildModal({
      id, title, message, type,
      buttons: [
        { label: cancelLabel,  style: 'secondary', action: 'cancel'  },
        { label: confirmLabel, style: confirmStyle, action: 'confirm' },
      ]
    });

    const resolve_ = val => {
      overlay.classList.remove('modal-in');
      overlay.classList.add('modal-out');
      overlay.addEventListener('animationend', () => { overlay.remove(); resolve(val); }, { once: true });
    };

    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => resolve_(true));
    overlay.querySelector('[data-action="cancel"]').addEventListener('click',  () => resolve_(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) resolve_(false); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', esc); resolve_(false); }
    });
  });
}

/* ── SHOW LIST (alerta com lista de itens) ── */
function showList(title, message, items = [], type = 'warning') {
  const listHTML = items.length
    ? `<ul class="modal-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>`
    : '';

  return new Promise(resolve => {
    const id = 'modal-list-' + Date.now();
    const overlay = _buildModal({
      id, title, message, type,
      body: listHTML,
      buttons: [{ label: 'OK', style: 'primary', action: 'ok' }]
    });

    const close = () => {
      overlay.classList.remove('modal-in');
      overlay.classList.add('modal-out');
      overlay.addEventListener('animationend', () => { overlay.remove(); resolve(); }, { once: true });
    };

    overlay.querySelector('[data-action="ok"]').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(); }
    });
  });
}
