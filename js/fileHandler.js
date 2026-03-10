/* IMPORTAÇÃO DE ARQUIVOS */

// Input: relatórios semanais (.csv / .txt)
document.getElementById('fi').addEventListener('change', async function () {
  await handleF(this.files);
  this.value = '';
});

// Input: histórico consolidado
document.getElementById('fi-history').addEventListener('change', async function () {
  if (this.files.length) await importHistory(this.files[0]);
  this.value = '';
});

async function handleF(fl) {
  const newFiles = [];
  const skipped  = [];

  for (const f of Array.from(fl)) {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.csv')) continue;

    const text = await f.text();

    // Se for o histórico consolidado, redireciona
    if (name.endsWith('.csv') && text.trimStart().startsWith('##AGENDAHUB_HISTORY_V1')) {
      await importHistory(f);
      continue;
    }

    const p = parse(text, f.name);

    // Duplicata por nome
    const byName = S.files.findIndex(x => x.filename === p.filename);
    if (byName >= 0) { S.files[byName] = p; continue; }    // Duplicata por semana (fileDate / fileEndDate — intervalo da semana)
    if (p.fileDate) {
      const byDate = S.files.findIndex(x => x.fileDate === p.fileDate);
      if (byDate >= 0) {
        const ex = S.files[byDate];
        const label = (p.fileDate && p.fileEndDate && p.fileDate !== p.fileEndDate)
          ? `${fDate(p.fileDate)} → ${fDate(p.fileEndDate)}`
          : fDate(p.fileDate);
        skipped.push(`${p.filename} (semana ${label} já importada como "${ex.filename}")`);
        continue;
      }
    }
    newFiles.push(p);
  }

  S.files.push(...newFiles);
  S.files.sort((a, b) => (a.fileDate || '').localeCompare(b.fileDate || ''));

  if (skipped.length) showList(
    'Arquivos ignorados',
    'Os seguintes arquivos não foram importados pois a semana já existe:',
    skipped,
    'warning'
  );

  if (!S.dateFrom && !S.dateTo) {
    const ms = months();
    if (ms.length) {
      const m = ms[ms.length - 1];
      S.dateFrom = mStart(m);
      S.dateTo   = mEnd(m);
      saveR();
    }
  }

  if (newFiles.length || skipped.length === 0) {
    saveF();
    renderDRB();
    renderSBFiles();
    renderMain();
  } else {
    saveF();
    renderDRB();
    renderSBFiles();
    renderMain();
  }
}

function delFile(fn) {
  S.files = S.files.filter(f => f.filename !== fn);
  saveF();
  renderDRB();
  renderSBFiles();
  renderMain();
}

// Drag-and-drop global
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length) handleF(e.dataTransfer.files);
});
