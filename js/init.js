/* INICIALIZAÇÃO */
load();

if (!S.dateFrom && !S.dateTo) {
  const ms = months();
  if (ms.length) {
    const m = ms[ms.length - 1];
    S.dateFrom = mStart(m);
    S.dateTo   = mEnd(m);
    saveR();
  }
}

renderDRB();
renderSBFiles();
renderMain();
