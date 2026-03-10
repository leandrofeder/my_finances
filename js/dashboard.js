/* DASHBOARD */

function renderDash() {
  const ap = filtA(), st = stats(ap), pl = patList(ap), cd = chartD(ap);

  const icons = {
    chk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    dol: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    usr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    alt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const cards = [
    { l: 'Atendimentos', v: st.total,          c: 'var(--accent)',  i: 'chk' },
    { l: 'Faturamento',  v: fBRL(st.revenue),  c: 'var(--green)',   i: 'dol' },
    { l: 'Pacientes',    v: st.patients,        c: 'var(--violet)',  i: 'usr' },
    { l: 'Ausências',    v: st.absent,          c: 'var(--amber)',   i: 'alt' },
  ];

  const top = pl.slice(0, 6).map(p => `
    <div class="tp">
      <div class="av">${esc(p.name).charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div class="tpn">${esc(p.name)}</div>
        <div class="tps" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">
          ${p.hasAnyStatus
            ? `<span class="pa-badge pa-p">✓ ${p.presF}</span>
               ${p.absNF > 0 ? `<span class="pa-badge pa-a">✗ ${p.absNF}</span>` : ''}
               ${p.absFJ > 0 ? `<span class="pa-badge pa-fj">⚡ ${p.absFJ}</span>` : ''}`
            : `<span style="color:var(--muted)">${p.count} sessão${p.count !== 1 ? 'ões' : 'ão'}</span>`
          }
          ${p.curSession && p.totalSess ? `<span style="color:var(--muted)">· ${p.curSession}/${p.totalSess}</span>` : ''}
        </div>
      </div>
      ${p.curSession && p.totalSess
        ? `<div class="pw"><div class="pb" style="width:${Math.min(100, p.curSession / p.totalSess * 100)}%"></div></div>`
        : ''}
      <div class="tpr">
        <div class="tprv">${fBRL(p.revenue)}</div>
        <div class="tpp">${fBRL(p.price)}/sessão</div>
      </div>
    </div>`).join('');

  return `
    <div class="ph"><div class="pt">Dashboard</div><div class="ps">${descRange()}</div></div>
    <div class="sgrid">${cards.map(c => `
      <div class="sc" style="border-left-color:${c.c}">
        <div class="sl" style="color:${c.c}">${c.l} <span>${icons[c.i]}</span></div>
        <div class="sv">${c.v}</div>
      </div>`).join('')}</div>
    ${cd.length ? `<div class="card"><div class="ct">Atendimentos por dia</div><div id="chartWrap"><canvas id="myChart"></canvas></div></div>` : ''}
    <div class="card"><div class="ct">Top pacientes no período</div>
      ${top || '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Nenhum atendimento no período</div>'}
      ${pl.length > 6 ? `<button class="bmore" onclick="setTab('patients')">Ver todos os ${pl.length} pacientes →</button>` : ''}
    </div>`;
}

function setupChart() {
  const c = document.getElementById('myChart');
  if (!c) return;

  const cd       = chartD(filtA());
  const isLight  = document.documentElement.classList.contains('light');
  const tickCol  = isLight ? '#94A3B8' : '#3D5270';
  const gridCol  = isLight ? '#E2E8F0' : '#1C2537';
  const tooltipBg     = isLight ? '#FFFFFF' : '#0D1120';
  const tooltipBorder = isLight ? '#DDE3EE' : '#1C2537';
  const tooltipTitle  = isLight ? '#4B6280' : '#7A93B8';
  const tooltipBody   = isLight ? '#0F172A' : '#E2EAF6';

  chart = new Chart(c.getContext('2d'), {
    type: 'bar',
    data: {
      labels:   cd.map(d => fDate(d.date).slice(0, 5)),
      datasets: [
        { label: 'Presenças', data: cd.map(d => d.at), backgroundColor: 'rgba(14,165,233,.7)', borderRadius: 4 },
        { label: 'Ausências', data: cd.map(d => d.ab), backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend:  { labels: { color: tickCol, font: { family: 'Sora', size: 11 }, boxWidth: 10 } },
        tooltip: { backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1, titleColor: tooltipTitle, bodyColor: tooltipBody, titleFont: { family: 'Sora' }, bodyFont: { family: 'Sora' } }
      },
      scales: {
        x: { ticks: { color: tickCol, font: { family: 'DM Mono', size: 11 } }, grid: { color: gridCol } },
        y: { ticks: { color: tickCol, font: { family: 'DM Mono', size: 11 } }, grid: { color: gridCol }, beginAtZero: true }
      }
    }
  });
}
