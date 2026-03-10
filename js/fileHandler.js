/* IMPORTAÇÃO DE ARQUIVOS */

document.getElementById('fi').addEventListener('change', async function () {
  await handleF(this.files);
  this.value = '';
});

async function handleF(fl) {
  const newFiles = [];
  const skipped  = [];

  for (const f of Array.from(fl)) {
    if (!f.name.endsWith('.txt')) continue;
    const t = await f.text();
    const p = parse(t, f.name);

    // Duplicata por nome
    const byName = S.files.findIndex(x => x.filename === p.filename);
    if (byName >= 0) { S.files[byName] = p; continue; }

    // Duplicata por semana
    if (p.fileDate) {
      const byDate = S.files.findIndex(x => x.fileDate === p.fileDate);
      if (byDate >= 0) {
        skipped.push(`${p.filename} (semana ${fDate(p.fileDate)} já importada como "${S.files[byDate].filename}")`);
        continue;
      }
    }
    newFiles.push(p);
  }

  S.files.push(...newFiles);
  S.files.sort((a, b) => (a.fileDate || '').localeCompare(b.fileDate || ''));

  if (skipped.length) alert('Arquivos ignorados (semana duplicada):\n' + skipped.join('\n'));

  if (!S.dateFrom && !S.dateTo) {
    const ms = months();
    if (ms.length) {
      const m = ms[ms.length - 1];
      S.dateFrom = mStart(m);
      S.dateTo   = mEnd(m);
      saveR();
    }
  }

  saveF();
  renderDRB();
  renderSBFiles();
  renderMain();
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
