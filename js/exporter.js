/* ─── EXPORTAÇÃO / IMPORTAÇÃO DO HISTÓRICO CONSOLIDADO ─── */

/**
 * Gera o CSV completo com TODOS os atendimentos + preços dos pacientes.
 * Formato:
 *   Linha de cabeçalho de atendimentos
 *   Uma linha por atendimento (nunca agrupado)
 *   Seção separada com preços customizados dos pacientes
 */
function exportHistory() {
  const allAppts = allA(); // todos os atendimentos sem filtro de data
  // ── Pré-computa chave → preço para todos os pacientes ──
  const pm = patMap(allAppts);
  const priceOf = new Map();
  for (const [k, p] of pm) {
    priceOf.set(k, S.prices.patients[k] ?? S.prices.default);
  }

  // ── Cabeçalho da seção de atendimentos ──
  const rows = [
    '##AGENDAHUB_HISTORY_V1',
    'Data,Início,Fim,Tipo,Paciente,Matrícula,Sessão,Valor,DiaSemana,ArquivoOrigem'
  ];

  // ── Uma linha por atendimento ──
  for (const a of allAppts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))) {
    if (a.type !== 'appointment') continue;

    const sessao = (a.sessionNumber && a.totalSessions)
      ? `${a.sessionNumber}/${a.totalSessions}`
      : '';

    // Determina a chave do paciente (mesmo critério do patMap)
    const cleanName = stripSt(a.patientName);
    const patKey    = a.patientCode || cleanName;
    const valor     = priceOf.get(patKey) ?? S.prices.default;

    rows.push([
      csvQ(dateToDDMM(a.date)),
      csvQ(a.startTime   || ''),
      csvQ(a.endTime     || ''),
      csvQ(a.status      || ''),
      csvQ(a.patientName || ''),
      csvQ(a.patientCode || ''),
      csvQ(sessao),
      csvQ(valor.toFixed(2)),
      csvQ(a.day         || ''),
      csvQ(findOriginFile(a))
    ].join(','));
  }

  // ── Seção de preços ──
  rows.push('');
  rows.push('##PRICES');
  rows.push('Chave,NomePaciente,Valor');
  const pl = patList(allA());
  for (const [k, v] of Object.entries(S.prices.patients)) {
    const pat = pl.find(p => p.key === k);
    rows.push([csvQ(k), csvQ(pat?.name || ''), csvQ(String(v))].join(','));
  }
  rows.push(`##DEFAULT_PRICE,${S.prices.default}`);

  // ── Download ──
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const now  = new Date();
  const ts   = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
  a.href     = url;
  a.download = `agendahub_historico_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Importa o CSV de histórico consolidado */
async function importHistory(file) {
  const text = await file.text();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines[0]?.startsWith('##AGENDAHUB_HISTORY_V1')) {
    showAlert('Arquivo inválido', 'Selecione um histórico exportado pelo AgendaHub.', 'error');
    return;
  }

  // Separa seções
  const apptLines  = [];
  const priceLines = [];
  let section = 'appts';
  let defaultPrice = null;

  for (const line of lines) {
    if (line.startsWith('##AGENDAHUB_HISTORY_V1')) continue;
    if (line.startsWith('##PRICES'))              { section = 'prices'; continue; }
    if (line.startsWith('##DEFAULT_PRICE,'))       { defaultPrice = parseFloat(line.split(',')[1]); continue; }
    if (section === 'appts')  apptLines.push(line);
    if (section === 'prices') priceLines.push(line);
  }

  // ── Reconstrói appointments agrupados por arquivo de origem ──
  const byFile = new Map();
  // pula cabeçalho
  for (const line of apptLines.slice(1)) {
    const cols = parseCSVLine(line);
    if (cols.length < 9) continue;
    // Suporta formato antigo (9 cols) e novo com Valor (10 cols)
    const [rawData, rawStart, rawEnd, rawTipo, rawPaciente, rawMatricula, rawSessao, col8, col9, col10] = cols.map(c => c.trim());
    const hasValor  = cols.length >= 10;
    const rawDia    = hasValor ? col9  : col8;
    const rawOrigem = hasValor ? col10 : col9;
    if (!rawPaciente) continue;

    // reconstrói data YYYY-MM-DD a partir de "seg 2/3" + ano do arquivo de origem
    const year = extractYearFromOrigin(rawOrigem);
    const dayInfo = parseDayCell(rawData, year);
    if (!dayInfo) continue;

    const tipo   = rawTipo.toUpperCase();
    const status = (tipo === 'F' || tipo === 'NF' || tipo === 'FJ') ? tipo : null;

    let sessionNumber = null, totalSessions = null;
    const sm = rawSessao.match(/^(\d+)\/(\d+)$/);
    if (sm) { sessionNumber = parseInt(sm[1]); totalSessions = parseInt(sm[2]); }    const origem = rawOrigem || 'historico_importado.csv';
    if (!byFile.has(origem)) byFile.set(origem, { filename: origem, fileDate: dayInfo.date, fileEndDate: dayInfo.date, days: [], appointments: [] });

    const entry = byFile.get(origem);
    // Adiciona dia se novo
    if (!entry.days.find(d => d.date === dayInfo.date)) {
      entry.days.push(dayInfo);
      // Mantém fileDate como data mais antiga e fileEndDate como mais recente
      if (dayInfo.date < entry.fileDate)    entry.fileDate    = dayInfo.date;
      if (dayInfo.date > entry.fileEndDate) entry.fileEndDate = dayInfo.date;
    }

    entry.appointments.push({
      id:            `${dayInfo.date}-ap-${rawStart}`,
      type:          'appointment',
      date:          dayInfo.date,
      day:           dayInfo.name || rawDia,
      startTime:     rawStart,
      endTime:       rawEnd,
      patientName:   rawPaciente,
      patientCode:   rawMatricula || null,
      sessionNumber,
      totalSessions,
      status
    });
  }

  // ── Restaura preços ──
  if (defaultPrice !== null) S.prices.default = defaultPrice;
  for (const line of priceLines.slice(1)) { // pula cabeçalho
    const cols = parseCSVLine(line).map(c => c.trim());
    if (cols.length < 3) continue;
    const [key, , val] = cols;
    const v = parseFloat(val);
    if (key && !isNaN(v)) S.prices.patients[key] = v;
  }

  // ── Mescla com arquivos existentes (sem duplicar) ──
  let added = 0;
  for (const [, f] of byFile) {
    f.days.sort((a, b) => a.date.localeCompare(b.date));
    const exists = S.files.find(x => x.filename === f.filename);
    if (exists) {
      // Mescla appointments novos
      for (const a of f.appointments) {
        const dup = exists.appointments.find(x => x.id === a.id);
        if (!dup) { exists.appointments.push(a); added++; }
      }
    } else {
      S.files.push(f);
      added += f.appointments.length;
    }
  }

  S.files.sort((a, b) => (a.fileDate || '').localeCompare(b.fileDate || ''));
  saveF(); saveP();

  if (!S.dateFrom && !S.dateTo) {
    const ms = months();
    if (ms.length) { S.dateFrom = mStart(ms[0]); S.dateTo = mEnd(ms[ms.length - 1]); saveR(); }
  }
  renderDRB(); renderSBFiles(); renderMain();
  showToast(`${added} atendimento(s) adicionado(s) com sucesso!`, 'success');
}

/* ─── Helpers ─── */
function csvQ(s) {
  const str = String(s ?? '');
  return (str.includes(',') || str.includes('"') || str.includes('\n'))
    ? `"${str.replace(/"/g, '""')}"`
    : `"${str}"`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function dateToDDMM(dateStr) {
  // "2026-03-02" → "seg 2/3"  (usa o nome do dia da semana)
  if (!dateStr) return '';
  const d   = new Date(dateStr + 'T12:00');
  const abbrs = ['dom','seg','ter','qua','qui','sex','sab'];
  const abbr  = abbrs[d.getDay()];
  return `${abbr} ${d.getDate()}/${d.getMonth() + 1}`;
}

function findOriginFile(appt) {
  for (const f of S.files) {
    if (f.appointments.some(a => a.id === appt.id)) return f.filename;
  }
  return '';
}

function extractYearFromOrigin(origin) {
  const m = origin.match(/(\d{4})/);
  return m ? parseInt(m[1]) : new Date().getFullYear();
}
