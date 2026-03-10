/* FILTRO DE PERÍODO (DATE RANGE) */
const mStart = m => m + '-01';
const mEnd   = m => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).toISOString().slice(0, 10);
};

function renderDRB() {
  const ms = months();
  const fe = document.getElementById('dateFrom');
  const te = document.getElementById('dateTo');
  if (fe) fe.value = S.dateFrom || '';
  if (te) te.value = S.dateTo   || '';

  const sw  = document.getElementById('monthSelWrap');
  const sel = document.getElementById('monthSel');
  if (sw && sel) {
    if (ms.length) {
      sw.style.display = '';
      const curM = ms.find(m => S.dateFrom === mStart(m) && S.dateTo === mEnd(m)) || '';
      sel.innerHTML = `<option value="">Todo o período</option>`
        + ms.map(m => `<option value="${m}"${m === curM ? ' selected' : ''}>${fMo(m)}</option>`).join('');
    } else {
      sw.style.display = 'none';
    }
  }

  const clr = document.getElementById('btnClr');
  if (clr) clr.style.display = (S.dateFrom || S.dateTo) ? '' : 'none';

  const bar = document.getElementById('dateRangeBar');
  if (bar) bar.style.display = ms.length ? '' : 'none';
}

function onMonthSel(v) {
  if (!v) { clearRange(); return; }
  S.dateFrom = mStart(v);
  S.dateTo   = mEnd(v);
  saveR(); renderDRB(); renderMain();
}

function onRangeChange() {
  S.dateFrom = document.getElementById('dateFrom').value || null;
  S.dateTo   = document.getElementById('dateTo').value   || null;
  saveR(); renderDRB(); renderMain();
}

function selMonth(m) {
  S.dateFrom = mStart(m);
  S.dateTo   = mEnd(m);
  saveR(); renderDRB(); renderMain();
}

function clearRange() {
  S.dateFrom = null;
  S.dateTo   = null;
  saveR(); renderDRB(); renderMain();
}

function descRange() {
  if (!S.dateFrom && !S.dateTo) return 'Todo o período';
  if (S.dateFrom  && S.dateTo)  return `${fDate(S.dateFrom)} – ${fDate(S.dateTo)}`;
  if (S.dateFrom)               return `A partir de ${fDate(S.dateFrom)}`;
  return `Até ${fDate(S.dateTo)}`;
}
