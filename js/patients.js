/* PACIENTES */

function sortPatients(col) {
  if (!S.patSort) S.patSort = { col: 'revenue', dir: 'desc' };
  if (S.patSort.col === col) S.patSort.dir = S.patSort.dir === 'asc' ? 'desc' : 'asc';
  else { S.patSort.col = col; S.patSort.dir = 'desc'; }
  renderMain();
}

function renderPatients() {
  if (!S.patSort) S.patSort = { col: 'revenue', dir: 'desc' };
  const ap = filtA(), st = stats(ap), pl = patList(ap);
  const q   = S.search.toLowerCase();
  let vis   = q ? pl.filter(p => p.name.toLowerCase().includes(q) || (p.code || '').includes(q)) : pl;

  const { col, dir } = S.patSort;
  const mult = dir === 'asc' ? 1 : -1;
  vis = [...vis].sort((a, b) => {
    let av, bv;
    if (col === 'name')          { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); return mult * (av < bv ? -1 : av > bv ? 1 : 0); }
    if (col === 'presF')         { av = a.presF;              bv = b.presF;              }
    else if (col === 'progress') { av = a.curSession || 0;    bv = b.curSession || 0;    }
    else if (col === 'price')    { av = a.price;              bv = b.price;              }
    else if (col === 'revenue')  { av = a.revenue;            bv = b.revenue;            }
    else if (col === 'lastDate') { av = a.lastDate || ''; bv = b.lastDate || ''; return mult * (av < bv ? -1 : av > bv ? 1 : 0); }
    else { av = a.count; bv = b.count; }
    return mult * (av - bv);
  });

  const rows = vis.map(p => {
    const hc      = !!S.prices.patients[p.key];
    const safeKey = ea(p.key);
    const showPend = p.pendingCount > 0 && S.confFilter === 'all';
    const statusBadge = p.hasAnyStatus
      ? `<div class="pa-counts">
          ${p.presF > 0 ? `<span class="pa-badge pa-p">✓ ${p.presF}</span>` : ''}
          ${p.absNF > 0 ? `<span class="pa-badge pa-a">✗ ${p.absNF}</span>` : ''}
          ${p.absFJ > 0 ? `<span class="pa-badge pa-fj">⚡ ${p.absFJ}</span>` : ''}
          ${showPend ? `<span class="pa-badge pa-pending">◌ ${p.pendingCount}</span>` : ''}
        </div>`
      : `<div class="pa-counts">
          <span style="color:var(--muted);font-size:12px">${p.count} sessão${p.count !== 1 ? 'ões' : 'ão'}</span>
          ${showPend ? `<span class="pa-badge pa-pending">◌ ${p.pendingCount} pend.</span>` : ''}
        </div>`;

    const hasSessions = p.sessions && p.sessions.length > 0;

    return `<tr>
      <td>
        <div style="font-weight:500">${esc(p.name)}</div>
        ${p.code ? `<div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:2px">${p.code}</div>` : ''}
      </td>
      <td>${statusBadge}</td>
      <td>${p.curSession && p.totalSess
        ? `<div style="font-size:11px;color:var(--muted);margin-bottom:4px">${p.curSession}/${p.totalSess}</div>
           <div class="pw"><div class="pb" style="width:${Math.min(100, p.curSession / p.totalSess * 100)}%"></div></div>`
        : '<span style="color:var(--border)">—</span>'}</td>
      <td>
        <div class="pcell">
          <div class="pdisplay" id="pd_${safeKey}" onclick="showPE('${safeKey}')">
            <span class="amt">${moneyEl(p.price)}</span>
            ${hc ? '<span class="cbadge">custom</span>' : ''}
            <span class="ehint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              editar
            </span>
          </div>
          <div class="peditor" id="pe_${safeKey}">
            <div class="piwrap">
              <span>R$</span>
              <input type="number" min="0" step="0.01" value="${p.price}" id="pi_${safeKey}"
                onkeydown="pkd(event,'${safeKey}')" onblur="hidePE('${safeKey}')">
            </div>
            <button class="psave" onmousedown="event.preventDefault()" onclick="saveP2('${safeKey}')">Salvar</button>
            <button class="pcancel" onmousedown="event.preventDefault()" onclick="cancelPE('${safeKey}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      </td>
      <td style="font-weight:700;font-family:var(--mono);color:var(--green)">${moneyEl(p.revenue)}</td>
      <td style="color:var(--muted);font-size:12px">${p.lastDate ? fDate(p.lastDate) : '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          ${hasSessions ? `<button class="sh-tog" onclick="togglePatSessions('${safeKey}')">horários</button>` : ''}
          ${hc ? `<button onclick="resetP('${safeKey}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;font-family:var(--font)">resetar</button>` : ''}
          <button class="btn-del-pat" title="Remover paciente da lista" onclick="hidePat('${safeKey}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
    <tr class="sh-row" id="sh_${safeKey}" style="display:none">
      <td colspan="7">
        <div class="sh-inner">
          ${(p.sessions || []).map(s => {
            const pending = isPending(s);
            const sc = pending      ? 'sf sf-pending'
              : s.status === 'F'    ? 'sf sf-f'
              : s.status === 'NF'   ? 'sf sf-nf'
              : s.status === 'FJ'   ? 'sf sf-fj'
              : 'sf sf-null';
            const sl = pending      ? 'pend.'
              : s.status === 'F'    ? 'F'
              : s.status === 'NF'   ? 'NF'
              : s.status === 'FJ'   ? 'FJ'
              : '—';

            const confTag = s.confirmation !== undefined
              ? s.confirmation === 'V'
                ? `<span class="conf-badge conf-v" title="Confirmado">✓</span>`
                : s.confirmation === 'X'
                  ? `<span class="conf-badge conf-x" title="Cancelado">✗</span>`
                  : `<span class="conf-badge conf-none" title="Sem resposta">—</span>`
              : '';

            return `<div class="sh-item">
              <span class="sh-date">${fDate(s.date)}</span>
              ${s.startTime ? `<span class="sh-time">${s.startTime}${s.endTime ? ' – ' + s.endTime : ''}</span>` : ''}
              <span class="${sc}">${sl}</span>
              ${confTag}
            </div>`;
          }).join('')}
        </div>
      </td>
    </tr>`;
  }).join('');

  const hidCount = S.hiddenPatients.length;

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap">
      <div class="pt">Pacientes <span style="font-size:14px;font-weight:400;color:var(--muted)">(${pl.length})</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        ${renderConfToggle()}
        <div class="sbar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="si" placeholder="Buscar por nome ou código…" value="${esc(S.search)}" oninput="doSearch(this.value)">
          ${S.search ? `<button class="sclr" onclick="doSearch('')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
        </div>
        ${hidCount > 0 ? `<button onclick="setTab('settings')" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:7px;padding:5px 10px;color:var(--red);font-size:11px;cursor:pointer;font-family:var(--font)">${hidCount} oculto${hidCount !== 1 ? 's' : ''}</button>` : ''}
      </div>
    </div>
    <div class="revs">
      <div class="ri"><div class="rl">Faturamento (somente presenças)</div><div class="rv" style="color:var(--green)">${moneyEl(st.revenue)}</div></div>
      <div class="rdiv"></div>
      <div class="ri"><div class="rl">Pacientes</div><div class="rv">${st.patients}</div></div>
      <div class="rdiv"></div>
      <div class="ri"><div class="rl">Presenças</div><div class="rv" style="color:#22C55E">${st.total}</div></div>
      <div class="rdiv"></div>
      <div class="ri"><div class="rl">Ausências</div><div class="rv" style="color:#F59E0B">${st.absent}</div></div>
      ${st.pending > 0 && S.confFilter === 'all' ? `<div class="rdiv"></div>
      <div class="ri"><div class="rl">Pendentes</div><div class="rv" style="color:var(--sub)">${st.pending}</div></div>` : ''}
      <div class="rsp"></div>
      <div style="font-size:11px;color:var(--muted)">Padrão: <strong style="color:var(--green)">${moneyEl(S.prices.default)}</strong>
        <button onclick="setTab('settings')" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:11px;margin-left:4px;font-family:var(--font)">alterar</button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:5px"><span class="pa-badge pa-p">✓ N</span> Presenças (F)</div>
      <div style="display:flex;align-items:center;gap:5px"><span class="pa-badge pa-a">✗ N</span> Ausências (NF)</div>
      <div style="display:flex;align-items:center;gap:5px"><span class="pa-badge pa-fj">⚡ N</span> FJ</div>
      <div style="display:flex;align-items:center;gap:5px"><span class="pa-badge pa-pending">◌ N</span> Pendente</div>
      <div style="display:flex;align-items:center;gap:8px;margin-left:4px;padding-left:8px;border-left:1px solid var(--border)">
        <span class="conf-badge conf-v">✓</span> Confirmado
        <span class="conf-badge conf-x">✗</span> Cancelado
        <span class="conf-badge conf-none">—</span> Sem resp.
      </div>
    </div>
    <div class="tw"><table>
      <thead><tr>
        ${[
          ['name',     'Paciente'],
          ['presF',    'Presenças / Faltas'],
          ['progress', 'Progresso'],
          ['price',    'Valor / Sessão'],
          ['revenue',  'Faturamento'],
          ['lastDate', 'Última sessão'],
        ].map(([c, l]) => {
          const active = S.patSort.col === c;
          const icon   = active ? (S.patSort.dir === 'asc' ? '▲' : '▼') : '⇅';
          return `<th class="sortable${active ? ' sorted' : ''}" onclick="sortPatients('${c}')">${l} <i class="sort-icon">${icon}</i></th>`;
        }).join('')}
        <th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:28px">Nenhum paciente encontrado</td></tr>'}</tbody>
    </table></div>`;
}

/* Inline price editor */
function setupPE() { /* wired inline */ }

function showPE(key) {
  const pd = document.getElementById('pd_' + key);
  const pe = document.getElementById('pe_' + key);
  const pi = document.getElementById('pi_' + key);
  if (!pd || !pe) return;
  pd.style.display = 'none';
  pe.classList.add('vis');
  if (pi) { pi.focus(); pi.select(); }
}

function hidePE(key) {
  setTimeout(() => {
    const pd = document.getElementById('pd_' + key);
    const pe = document.getElementById('pe_' + key);
    if (!pd || !pe) return;
    if (!pe.contains(document.activeElement)) { pd.style.display = ''; pe.classList.remove('vis'); }
  }, 150);
}

function cancelPE(key) {
  const pd = document.getElementById('pd_' + key);
  const pe = document.getElementById('pe_' + key);
  const pi = document.getElementById('pi_' + key);
  if (!pd || !pe) return;
  const cur = S.prices.patients[key] ?? S.prices.default;
  if (pi) pi.value = cur;
  pd.style.display = '';
  pe.classList.remove('vis');
}

function pkd(e, key) {
  if (e.key === 'Enter')  { e.preventDefault(); saveP2(key); }
  if (e.key === 'Escape') { e.preventDefault(); cancelPE(key); }
}

function saveP2(key) {
  const pi = document.getElementById('pi_' + key);
  if (!pi) return;
  const v = parseFloat(pi.value);
  if (!isNaN(v) && v >= 0) { S.prices.patients[key] = v; saveP(); }
  renderMain();
}

function resetP(key) {
  delete S.prices.patients[key];
  saveP();
  renderMain();
}

function doSearch(v) {
  S.search = v;
  renderMain();
  const i = document.getElementById('si');
  if (i) { i.focus(); i.selectionStart = i.selectionEnd = v.length; }
}

async function hidePat(key) {
  const ok = await showConfirm(
    'Remover paciente',
    'Remover este paciente da lista? Ele pode ser restaurado em Configurações.',
    { confirmLabel: 'Remover', confirmStyle: 'danger', type: 'warning' }
  );
  if (!ok) return;
  if (!S.hiddenPatients) S.hiddenPatients = [];
  if (!S.hiddenPatients.includes(key)) S.hiddenPatients.push(key);
  saveH();
  renderMain();
}

function restorePat(key) {
  S.hiddenPatients = (S.hiddenPatients || []).filter(k => k !== key);
  saveH();
  renderMain();
}

function togglePatSessions(safeKey) {
  const row = document.getElementById('sh_' + safeKey);
  if (!row) return;
  row.style.display = row.style.display === 'none' ? '' : 'none';
}
