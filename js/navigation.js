/* NAVEGAÇÃO E SIDEBAR */

function setTab(tab) {
  S.tab = tab;
  ['dashboard', 'patients', 'schedule', 'settings'].forEach(t => {
    const el = document.getElementById('nav-' + t);
    if (el) el.className = 'nav-item' + (t === tab ? ' on' : '');
  });
  renderMain();
}

function renderSBFiles() {
  const el = document.getElementById('sbFiles');
  if (!el) return;
  if (!S.files.length) { el.innerHTML = ''; return; }

  const open = el.dataset.open === '1';  const listHtml = S.files.map(f => {
    // Label: "23/02 → 27/02/2026" se tiver intervalo; ou só a data de início; ou nome truncado
    let label;
    if (f.fileDate && f.fileEndDate && f.fileDate !== f.fileEndDate) {
      const s = new Date(f.fileDate    + 'T12:00');
      const e = new Date(f.fileEndDate + 'T12:00');
      const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      label = `${fmt(s)} → ${fmt(e)}`;
    } else if (f.fileDate) {
      label = fDate(f.fileDate);
    } else {
      label = f.filename.slice(0, 16);
    }
    return `
    <div class="fentry" title="${esc(f.filename)}">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span>${label}</span>
      <button class="fdel" onclick="delFile('${ea(f.filename)}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');

  el.innerHTML = `
    <button class="sb-files-tog" onclick="toggleSBFiles()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span>Arquivos</span>
      <span class="sb-count">${S.files.length}</span>
      <span class="sb-chev${open ? ' op' : ''}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </button>
    <div class="sb-files-list" id="sbFilesList" style="max-height:${open ? '600px' : '0'}">${listHtml}</div>`;
}

function toggleSBFiles() {
  const el = document.getElementById('sbFiles');
  if (!el) return;
  el.dataset.open = el.dataset.open === '1' ? '0' : '1';
  renderSBFiles();
}
