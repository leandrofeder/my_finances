/* ─── EXPORTAÇÃO / IMPORTAÇÃO ─── */

/* ══════════════════════════════════════════════
   HISTÓRICO DE ATENDIMENTOS
   Arquivo: agendahub_historico_YYYY-MM-DD.csv
   Contém APENAS atendimentos, sem preços.
   ══════════════════════════════════════════════ */

function exportHistory() {
  const allAppts = allA();
  if (!allAppts.some(a => a.type === 'appointment')) {
    showAlert('Nada para exportar', 'Nenhum atendimento importado ainda.', 'warning');
    return;
  }

  const rows = [
    '##AGENDAHUB_HISTORY_V2',
    'Data,Início,Fim,Tipo,Paciente,Matrícula,Sessão,DiaSemana,ArquivoOrigem,Confirmação'
  ];

  for (const a of allAppts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))) {
    if (a.type !== 'appointment') continue;

    const sessao = (a.sessionNumber && a.totalSessions)
      ? `${a.sessionNumber}/${a.totalSessions}` : '';

    const confirmStr = a.confirmation === 'V' ? 'Confirmado'
      : a.confirmation === 'X' ? 'Cancelado' : '';

    rows.push([
      csvQ(dateToDDMM(a.date)),
      csvQ(a.startTime   || ''),
      csvQ(a.endTime     || ''),
      csvQ(a.status      || ''),
      csvQ(a.patientName || ''),
      csvQ(a.patientCode || ''),
      csvQ(sessao),
      csvQ(a.day         || ''),
      csvQ(findOriginFile(a)),
      csvQ(confirmStr)
    ].join(','));
  }

  _downloadCSV(rows.join('\n'), `agendahub_historico_${_ts()}.csv`);
}

async function importHistory(file) {
  const text  = await file.text();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const isV1 = lines[0]?.startsWith('##AGENDAHUB_HISTORY_V1');
  const isV2 = lines[0]?.startsWith('##AGENDAHUB_HISTORY_V2');
  if (!isV1 && !isV2) {
    showAlert('Arquivo inválido', 'Selecione um histórico de atendimentos exportado pelo AgendaHub.', 'error');
    return;
  }

  // Coleta apenas linhas de atendimento (para V1 antigo que ainda tinha seção ##PRICES, ignora)
  const apptLines = [];
  for (const line of lines) {
    if (line.startsWith('##AGENDAHUB_HISTORY')) continue;
    if (line.startsWith('##PRICES'))           break; // V1 legado — para antes dos preços
    if (line.startsWith('##DEFAULT_PRICE'))     break;
    apptLines.push(line);
  }

  const byFile = new Map();
  for (const line of apptLines.slice(1)) { // pula cabeçalho
    const cols = parseCSVLine(line);
    if (cols.length < 8) continue;

    const [rawData, rawStart, rawEnd, rawTipo, rawPaciente, rawMatricula, rawSessao, col8, col9, col10] = cols.map(c => c.trim());

    // Detecta layout: V2 tem 10 colunas (sem Valor), V1-legado tinha 10 ou 11 com Valor
    // Heurística: col8 é DiaSemana (curto, ex: "seg") ou Valor (numérico "200.00")
    const col8IsNumeric = /^\d+(\.\d+)?$/.test(col8);
    const rawDia    = col8IsNumeric ? col9  : col8;
    const rawOrigem = col8IsNumeric ? col10 : col9;
    const rawConf   = col8IsNumeric ? (cols[10] || '').trim() : col10?.trim();

    if (!rawPaciente) continue;

    const year    = extractYearFromOrigin(rawOrigem);
    const dayInfo = parseDayCell(rawData, year);
    if (!dayInfo) continue;

    const tipo   = rawTipo.toUpperCase();
    const status = (tipo === 'F' || tipo === 'NF' || tipo === 'FJ') ? tipo : null;

    let confirmation = undefined;
    if (isV2 || rawConf !== undefined) {
      const rc = (rawConf || '').toLowerCase();
      confirmation = rc === 'confirmado' ? 'V' : rc === 'cancelado' ? 'X' : null;
    }

    let sessionNumber = null, totalSessions = null;
    const sm = rawSessao.match(/^(\d+)\/(\d+)$/);
    if (sm) { sessionNumber = parseInt(sm[1]); totalSessions = parseInt(sm[2]); }

    const origem = rawOrigem || 'historico_importado.csv';
    if (!byFile.has(origem)) byFile.set(origem, { filename: origem, fileDate: dayInfo.date, fileEndDate: dayInfo.date, days: [], appointments: [] });

    const entry = byFile.get(origem);
    if (!entry.days.find(d => d.date === dayInfo.date)) {
      entry.days.push(dayInfo);
      if (dayInfo.date < entry.fileDate)    entry.fileDate    = dayInfo.date;
      if (dayInfo.date > entry.fileEndDate) entry.fileEndDate = dayInfo.date;
    }

    entry.appointments.push({
      id: `${dayInfo.date}-ap-${rawStart}`,
      type: 'appointment',
      date: dayInfo.date, day: dayInfo.name || rawDia,
      startTime: rawStart, endTime: rawEnd,
      patientName: rawPaciente, patientCode: rawMatricula || null,
      sessionNumber, totalSessions, status, confirmation
    });
  }

  let added = 0;
  for (const [, f] of byFile) {
    f.days.sort((a, b) => a.date.localeCompare(b.date));
    const exists = S.files.find(x => x.filename === f.filename);
    if (exists) {
      for (const a of f.appointments) {
        if (!exists.appointments.find(x => x.id === a.id)) { exists.appointments.push(a); added++; }
      }
    } else {
      S.files.push(f);
      added += f.appointments.length;
    }
  }

  S.files.sort((a, b) => (a.fileDate || '').localeCompare(b.fileDate || ''));
  saveF();

  if (!S.dateFrom && !S.dateTo) {
    const ms = months();
    if (ms.length) { S.dateFrom = mStart(ms[0]); S.dateTo = mEnd(ms[ms.length - 1]); saveR(); }
  }
  renderDRB(); renderSBFiles(); renderMain();
  showToast(`${added} atendimento(s) adicionado(s) com sucesso!`, 'success');
}

/* ══════════════════════════════════════════════
   PREÇOS DOS PACIENTES
   Arquivo: agendahub_valores_YYYY-MM-DD.csv
   Contém APENAS preços — completamente separado.
   ══════════════════════════════════════════════ */

function exportPrices() {
  const customCount = Object.keys(S.prices.patients).length;
  if (!customCount && S.prices.default === 200) {
    showAlert('Nada para exportar', 'Nenhum valor personalizado configurado.', 'warning');
    return;
  }

  const pl   = patList(allA());
  const rows = [
    '##AGENDAHUB_PRICES_V1',
    `##DEFAULT_PRICE,${S.prices.default}`,
    'Chave,NomePaciente,Valor'
  ];

  for (const [k, v] of Object.entries(S.prices.patients)) {
    const pat = pl.find(p => p.key === k);
    rows.push([csvQ(k), csvQ(pat?.name || ''), csvQ(String(v))].join(','));
  }

  _downloadCSV(rows.join('\n'), `agendahub_valores_${_ts()}.csv`);
}

async function importPrices(file) {
  const text  = await file.text();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (!lines[0]?.startsWith('##AGENDAHUB_PRICES_V1')) {
    showAlert('Arquivo inválido', 'Selecione um arquivo de valores exportado pelo AgendaHub.', 'error');
    return;
  }

  let defaultPrice = null;
  let imported = 0;

  for (const line of lines) {
    if (line.startsWith('##AGENDAHUB_PRICES_V1')) continue;
    if (line.startsWith('##DEFAULT_PRICE,')) {
      const v = parseFloat(line.split(',')[1]);
      if (!isNaN(v)) defaultPrice = v;
      continue;
    }
    if (line.startsWith('Chave,')) continue; // cabeçalho

    const cols = parseCSVLine(line).map(c => c.trim());
    if (cols.length < 3) continue;
    const [key, , val] = cols;
    const v = parseFloat(val);
    if (key && !isNaN(v)) { S.prices.patients[key] = v; imported++; }
  }

  if (defaultPrice !== null) S.prices.default = defaultPrice;
  saveP();
  renderMain();
  showToast(`Valores importados: ${imported} personalizado(s) + padrão R$ ${S.prices.default.toFixed(2)}`, 'success');
}

/* ─── Helpers internos ─── */
function csvQ(s) {
  const str = String(s ?? '');
  return (str.includes(',') || str.includes('"') || str.includes('\n'))
    ? `"${str.replace(/"/g, '""')}"` : `"${str}"`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function _ts() {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth()+1)}-${pad2(n.getDate())}`;
}

function _downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function dateToDDMM(dateStr) {
  if (!dateStr) return '';
  const d     = new Date(dateStr + 'T12:00');
  const abbrs = ['dom','seg','ter','qua','qui','sex','sab'];
  return `${abbrs[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function findOriginFile(appt) {
  for (const f of S.files) {
    if (f.appointments.some(a => a.id === appt.id)) return f.filename;
  }
  return '';
}

function extractYearFromOrigin(origin) {
  const m = (origin || '').match(/(\d{4})/);
  return m ? parseInt(m[1]) : new Date().getFullYear();
}
