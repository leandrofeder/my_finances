/* DASHBOARD */

/* ── Ocultar/mostrar valores monetários ── */
function toggleHideValues() {
  S.hideValues = !S.hideValues;
  document.querySelectorAll('[data-money]').forEach(el => {
    el.textContent = S.hideValues ? '•••••' : el.dataset.money;
  });
  const btn = document.getElementById('btnHideValues');
  if (btn) {
    btn.innerHTML = _eyeIcon();
    btn.title = S.hideValues ? 'Mostrar valores' : 'Ocultar valores';
  }
}

function _eyeIcon() {
  return S.hideValues
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

/* Gera um <span> com data-money para poder ocultar/mostrar sem re-render */
function moneyEl(value) {
  const formatted = fBRL(value);
  return `<span data-money="${formatted}">${S.hideValues ? '•••••' : formatted}</span>`;
}

/* ── Renderização principal ── */
function renderDash() {
  const ap = filtA(), st = stats(ap), pl = patList(ap), cd = chartD(ap);

  const icons = {
    chk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    dol: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    usr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    alt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const cards = [
    { l: 'Atendimentos', v: String(st.total),   c: 'var(--accent)', i: 'chk', money: false },
    { l: 'Faturamento',  v: st.revenue,          c: 'var(--green)',  i: 'dol', money: true  },
    { l: 'Pacientes',    v: String(st.patients), c: 'var(--violet)', i: 'usr', money: false },
    { l: 'Ausências',    v: String(st.absent),   c: 'var(--amber)',  i: 'alt', money: false },
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
        <div class="tprv">${moneyEl(p.revenue)}</div>
        <div class="tpp">${moneyEl(p.price)}/sessão</div>
      </div>    </div>`).join('');

  return `
    <div class="ph">
      <div class="pt">Dashboard</div>
      <div class="ps">${descRange()}</div>
    </div>
    <div class="sgrid">${cards.map(c => `
      <div class="sc" style="border-left-color:${c.c}">
        <div class="sl" style="color:${c.c}">${c.l} <span>${icons[c.i]}</span></div>
        <div class="sv">${c.money ? moneyEl(c.v) : c.v}</div>
      </div>`).join('')}
    </div>
    ${cd.length ? `<div class="card"><div class="ct">Atendimentos por dia</div><div id="chartWrap"><canvas id="myChart"></canvas></div></div>` : ''}
    <div class="card">
      <div class="ct">Top pacientes no período</div>
      ${top || '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Nenhum atendimento no período</div>'}      ${pl.length > 6 ? `<button class="bmore" onclick="setTab('patients')">Ver todos os ${pl.length} pacientes →</button>` : ''}
    </div>`;
}

/* ── Aba de Insights ── */
function renderInsightsTab() {
  const ap = filtA(), st = stats(ap);
  const cancelPat  = insightCancelsByPatient(ap);
  const cancelWeek = insightCancelsByWeekday(ap);
  const attWeek    = insightAttByWeekday(ap);
  const periods    = insightByPeriod(ap);
  return renderInsights(cancelPat, cancelWeek, attWeek, periods, st);
}

function renderInsights(cancelPat, cancelWeek, attWeek, periods, st) {
  const header = `
    <div class="ph">
      <div class="pt">Insights</div>
      <div class="ps">${descRange()}</div>
    </div>`;

  if (st.total === 0) return header + `<div style="color:var(--muted);font-size:13px;text-align:center;padding:40px">Nenhum dado no período</div>`;

  /* Pacientes que mais cancelam */
  const topCancelers = cancelPat.slice(0, 5);
  const cancelPatHtml = topCancelers.length ? `
    <div class="ins-card">
      <div class="ins-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Pacientes com mais cancelamentos
      </div>
      ${topCancelers.map((p, i) => {
        const total = p.pres + p.total;
        const pct   = total ? Math.round(p.total / total * 100) : 0;
        return `<div class="ins-row">
          <div class="ins-rank">${i + 1}</div>
          <div class="ins-name">${esc(p.name)}</div>
          <div class="ins-badges">
            ${p.nf > 0 ? `<span class="pa-badge pa-a" title="Falta sem aviso">✗ ${p.nf} NF</span>` : ''}
            ${p.fj > 0 ? `<span class="pa-badge pa-fj" title="Falta justificada">⚡ ${p.fj} FJ</span>` : ''}
          </div>
          <div class="ins-bar-wrap"><div class="ins-bar" style="width:${pct}%;background:var(--red)"></div></div>
          <div class="ins-pct" style="color:var(--red)">${pct}%</div>
        </div>`;
      }).join('')}
    </div>` : '';

  /* Cancelamentos por dia da semana */
  const maxCancel = Math.max(...cancelWeek.map(d => d.cancel), 1);
  const cancelWeekHtml = cancelWeek.some(d => d.cancel > 0) ? `
    <div class="ins-card">
      <div class="ins-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Cancelamentos por dia da semana
      </div>
      ${cancelWeek.map(d => {
        const pct = Math.round(d.cancel / maxCancel * 100);
        return `<div class="ins-row">
          <div class="ins-dow">${d.label}</div>
          <div class="ins-bar-wrap"><div class="ins-bar" style="width:${pct}%;background:var(--amber)"></div></div>
          <div class="ins-count">${d.cancel} cancel.</div>
          <div class="ins-count" style="color:var(--muted)">${d.att} atend.</div>
        </div>`;
      }).join('')}
    </div>` : '';

  /* Dias com mais atendimentos */
  const maxAtt = Math.max(...attWeek.map(d => d.count), 1);
  const attWeekHtml = attWeek.length ? `
    <div class="ins-card">
      <div class="ins-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Dias com mais atendimentos
      </div>
      ${[...attWeek].sort((a, b) => b.count - a.count).map(d => {
        const pct = Math.round(d.count / maxAtt * 100);
        return `<div class="ins-row">
          <div class="ins-dow">${d.label}</div>
          <div class="ins-bar-wrap"><div class="ins-bar" style="width:${pct}%;background:var(--accent)"></div></div>
          <div class="ins-count">${d.count} atend.</div>
        </div>`;
      }).join('')}
    </div>` : '';
  /* Períodos do dia */
  const periodIcons = { manha: '🌤', tarde: '🌅', noite: '🌙' };
  const maxPeriod = Math.max(...periods.map(p => Math.max(p.att, p.cancel)), 1);
  const periodsHtml = periods.length ? `
    <div class="ins-card">
      <div class="ins-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--violet)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Distribuição por período do dia
      </div>
      ${periods.map(p => {
        const pctAtt    = Math.round(p.att    / maxPeriod * 100);
        const pctCancel = p.cancel > 0 ? Math.round(p.cancel / maxPeriod * 100) : 0;
        return `<div class="ins-period">
          <div class="ins-period-label">${periodIcons[p.key] || ''} ${p.label}</div>
          <div class="ins-period-row">
            <span class="ins-period-tag" style="color:var(--accent)">Atend.</span>
            <div class="ins-bar-wrap"><div class="ins-bar" style="width:${pctAtt}%;background:var(--accent)"></div></div>
            <span class="ins-count">${p.att}</span>
          </div>
          ${p.cancel > 0 ? `<div class="ins-period-row">
            <span class="ins-period-tag" style="color:var(--red)">Cancel.</span>
            <div class="ins-bar-wrap"><div class="ins-bar" style="width:${pctCancel}%;background:var(--red)"></div></div>
            <span class="ins-count">${p.cancel}</span>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';
  if (!cancelPatHtml && !cancelWeekHtml && !attWeekHtml && !periodsHtml) return header + `<div style="color:var(--muted);font-size:13px;text-align:center;padding:40px">Sem dados suficientes para insights</div>`;

  return header + `
    <div class="ins-grid">
      ${cancelPatHtml}
      ${cancelWeekHtml}
      ${attWeekHtml}
      ${periodsHtml}
    </div>`;
}

/* ── Gráfico de barras ── */
function setupChart() {
  const c = document.getElementById('myChart');
  if (!c) return;

  const cd      = chartD(filtA());
  const isLight = document.documentElement.classList.contains('light');
  const tickCol       = isLight ? '#94A3B8' : '#3D5270';
  const gridCol       = isLight ? '#E2E8F0' : '#1C2537';
  const tooltipBg     = isLight ? '#FFFFFF'  : '#0D1120';
  const tooltipBorder = isLight ? '#DDE3EE'  : '#1C2537';
  const tooltipTitle  = isLight ? '#4B6280'  : '#7A93B8';
  const tooltipBody   = isLight ? '#0F172A'  : '#E2EAF6';

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

