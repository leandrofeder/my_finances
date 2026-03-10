/* RENDERIZAÇÃO PRINCIPAL */

function renderMain() {
  const main = document.getElementById('main');
  if (chart) { chart.destroy(); chart = null; }

  if (!S.files.length) { main.innerHTML = renderEmpty(); setupDZ(); return; }
  if      (S.tab === 'dashboard') { main.innerHTML = renderDash();        setupChart(); }
  else if (S.tab === 'patients')  { main.innerHTML = renderPatients();    setupPE();   }
  else if (S.tab === 'schedule')    main.innerHTML = renderSched();
  else if (S.tab === 'insights')    main.innerHTML = renderInsightsTab();
  else if (S.tab === 'settings')    main.innerHTML = renderSettings();
}

/* TELA VAZIA (sem arquivos) */
function renderEmpty() {
  return `<div class="empty"><div class="dz2" id="dz">
    <div class="di" style="margin-bottom:16px;color:var(--muted)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </div>    <div class="dtit">Importe arquivos de agenda</div>
    <div class="dsub2">Arraste arquivos .csv ou clique em "Importar CSV / TXT"</div>
    <div class="dhint">Múltiplos arquivos · Cache automático</div>
  </div></div>`;
}

function setupDZ() {
  const dz = document.getElementById('dz');
  if (!dz) return;
  dz.addEventListener('click',     () => document.getElementById('fi').click());
  dz.addEventListener('dragover',  e  => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop',      e  => { e.preventDefault(); dz.classList.remove('drag'); handleF(e.dataTransfer.files); });
}
