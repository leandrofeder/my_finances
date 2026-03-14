/* AGENDA */
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function renderSched() {
  const filtered = filtA();

  const header = `
    <div class="ph" style="align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div><div class="pt">Agenda Detalhada</div><div class="ps">${descRange()}</div></div>
      ${renderConfToggle()}
    </div>`;

  if (!filtered.length) {
    return header + `<div style="color:var(--muted);text-align:center;padding:40px;font-size:13px">Nenhum atendimento no período selecionado</div>`;
  }

  const dedupedIds = new Set(filtered.map(a => {
    const patId = a.type === 'appointment' ? (a.patientCode || stripSt(a.patientName) || '') : (a.type);
    return `${a.type}|${a.date}|${a.startTime || ''}|${patId}`;
  }));

  const vis = S.files.filter(f => f.appointments.some(a => {
    if (!a.date) return false;
    if (S.dateFrom && a.date < S.dateFrom) return false;
    if (S.dateTo   && a.date > S.dateTo)   return false;
    return true;
  }));

  const byMonth = new Map();
  for (const f of vis) {
    const anchor = f.days[0]?.date || f.fileDate || '';
    const mo = anchor.slice(0, 7);
    if (!byMonth.has(mo)) byMonth.set(mo, []);
    byMonth.get(mo).push(f);
  }

  const html = [header];
  for (const [mo, files] of [...byMonth.entries()].sort()) {
    const [y, m] = mo.split('-');
    const moLabel = `${MONTHS_PT[parseInt(m) - 1]} ${y}`;
    html.push(`<div class="month-div"><div class="month-div-label">${moLabel}</div><div class="month-div-line"></div></div>`);
    html.push(...files.map(f => wBlock(f, dedupedIds)));
  }
  return html.join('');
}

function wBlock(f, dedupedIds) {
  const id = 'w_' + f.filename.replace(/[^a-z0-9]/gi, '_');

  const fileAppts = dedupedIds
    ? f.appointments.filter(a => {
        const patId = a.type === 'appointment' ? (a.patientCode || stripSt(a.patientName) || '') : (a.type);
        return dedupedIds.has(`${a.type}|${a.date}|${a.startTime || ''}|${patId}`);
      })
    : f.appointments;

  const allAppts     = fileAppts.filter(a => a.type === 'appointment');
  const wPending     = allAppts.filter(a => isPending(a)).length;
  const validAppts   = allAppts.filter(a => !isPending(a));
  const ac           = validAppts.length;
  const anyHasStatus = validAppts.some(a => a.status != null || ((a.patientName || '').match(/^\((F|NF|FJ)\)/i)));
  const wPresF = anyHasStatus
    ? validAppts.filter(a => a.status === 'F' || (a.patientName || '').match(/^\(F\)/i)).length
    : ac;
  const wNF = validAppts.filter(a => a.status === 'NF' || (a.patientName || '').match(/^\(NF\)/i)).length;
  const wFJ = validAppts.filter(a => a.status === 'FJ' || (a.patientName || '').match(/^\(FJ\)/i)).length;

  let wRev = 0;
  const pm = patMap(fileAppts);
  for (const [k, p] of pm) {
    const nonPend  = p.sessions.filter(a => !isPending(a));
    const hasS     = nonPend.some(a => a.status != null);
    const bill     = hasS ? p.sessions.filter(a => a.status === 'F') : nonPend;
    wRev += bill.length * (S.prices.patients[k] ?? S.prices.default);
  }

  const validDays = f.days.filter(d => d.date);
  const firstDay  = validDays[0]?.date;
  const lastDay   = validDays[validDays.length - 1]?.date;
  const wStart    = f.fileDate    || firstDay;
  const wEnd      = f.fileEndDate || lastDay;
  const weekLabel = wStart && wEnd && wStart !== wEnd
    ? `${fDate(wStart).slice(0, 5)} → ${fDate(wEnd)}`
    : wStart ? fDate(wStart) : f.filename;

  const body = f.days.map(day => {
    const da = fileAppts.filter(a => a.date === day.date && a.type !== 'blocked');
    if (!da.length) return '';

    const at = da.filter(a => a.type === 'appointment' && !isPending(a) && (a.status === 'F' || a.status == null));
    const ab = da.filter(a => a.type === 'appointment' && !isPending(a) && (a.status === 'NF' || a.status === 'FJ'));
    const pn = da.filter(a => isPending(a));

    const rows = da.map(a => {
      const sty = {
        appointment: `background:var(--ar-bg);border-color:var(--border)`,
        absent:      `background:rgba(245,158,11,.07);border-color:rgba(245,158,11,.2)`,
        lunch:       `background:rgba(107,114,128,.08);border-color:var(--border)`
      }[a.type] || '';

      const cleanPName    = stripSt(a.patientName);
      const displayStatus = a.status || (() => { const sm = (a.patientName || '').match(/^\((F|NF|FJ)\)/i); return sm ? sm[1].toUpperCase() : null; })();
      const pending       = isPending(a);

      const isBillable = a.type === 'appointment' && !pending && (displayStatus === 'F' || displayStatus == null);
      const price = isBillable ? (S.prices.patients[a.patientCode || cleanPName] ?? S.prices.default) : null;

      let label, nameCls = '';
      if (a.type === 'appointment') {
        label = esc(cleanPName);
        if (pending)                     nameCls = 'aname-pending';
        else if (displayStatus === 'F')  nameCls = 'aname-f';
        else if (displayStatus === 'NF') nameCls = 'aname-nf';
        else if (displayStatus === 'FJ') nameCls = 'aname-fj';
      } else {
        label = a.type === 'absent' ? 'Ausente' : 'Almoço';
      }

      const statusTag = a.type === 'appointment'
        ? pending
          ? `<span class="sf sf-pending">pendente</span>`
          : displayStatus
            ? `<span class="sf ${displayStatus === 'F' ? 'sf-f' : displayStatus === 'NF' ? 'sf-nf' : 'sf-fj'}">${displayStatus}</span>`
            : ''
        : '';

      const confirmTag = a.type === 'appointment' && a.confirmation !== undefined
        ? a.confirmation === 'V'
          ? `<span class="conf-badge conf-v" title="Confirmado pelo paciente">✓</span>`
          : a.confirmation === 'X'
            ? `<span class="conf-badge conf-x" title="Cancelado pelo paciente">✗</span>`
            : `<span class="conf-badge conf-none" title="Sem resposta do paciente">—</span>`
        : '';

      return `<div class="ar${pending ? ' ar-pending' : ''}" style="${sty}">
        <div class="atime">${a.startTime || ''}${a.endTime ? ' – ' + a.endTime : ''}</div>
        <div class="aname ${nameCls}" style="${a.type !== 'appointment' ? 'color:var(--muted)' : 'font-weight:500'}">${label}</div>
        ${statusTag}
        ${confirmTag}
        ${a.sessionNumber && a.totalSessions ? `<div class="asess">${a.sessionNumber}/${a.totalSessions}</div>` : ''}
        ${price !== null ? `<div class="aprice">${moneyEl(price)}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="dsec">
      <div class="dlabel">${day.name} · ${fDate(day.date)}
        ${at.length ? pill(at.length + ' presença' + (at.length !== 1 ? 's' : ''), '#22C55E', 'rgba(34,197,94,.1)') : ''}
        ${ab.length ? pill(ab.length + ' falta'    + (ab.length !== 1 ? 's' : ''), '#F59E0B') : ''}
        ${pn.length ? pill(pn.length + ' pendente' + (pn.length !== 1 ? 's' : ''), 'var(--sub)', 'var(--surface2)') : ''}
      </div>${rows}</div>`;
  }).join('');

  return `<div class="wb">
    <button class="wh" onclick="togW('${id}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <div>
        <div class="wt">Semana de ${weekLabel}</div>
        <div class="wsub" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px">
          <span style="color:var(--green);font-weight:700;font-family:var(--mono);font-size:12px">${moneyEl(wRev)}</span>
          <span style="color:var(--border2)">·</span>
          ${wPresF > 0 ? `<span class="pa-badge pa-p">✓ ${wPresF}</span>`  : ''}
          ${wNF    > 0 ? `<span class="pa-badge pa-a">✗ ${wNF}</span>`      : ''}
          ${wFJ    > 0 ? `<span class="pa-badge pa-fj">⚡ ${wFJ}</span>`    : ''}
          ${wPending > 0 && S.confFilter === 'all' ? `<span class="pa-badge pa-pending">◌ ${wPending} pend.</span>` : ''}
        </div>
      </div>
      <div style="flex:1"></div>
      <div class="chev" id="${id}_c">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </button>
    <div id="${id}" style="display:none">${body}</div>
  </div>`;
}

function togW(id) {
  const b = document.getElementById(id);
  const c = document.getElementById(id + '_c');
  if (!b) return;
  const op = b.style.display !== 'none';
  b.style.display = op ? 'none' : 'block';
  if (c) c.classList.toggle('op', !op);
}
