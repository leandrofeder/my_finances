/* PARSER DE ARQUIVOS */
const DN = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };

/* ─── Utilitário: parse CSV linha a linha (respeita aspas) ─── */
function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/* ─── Extrai intervalo de datas do nome do arquivo ─── */
// Suporta: agenda_DD-MM-YYYY_a_DD-MM-YYYY.csv  e  YYYY-MM-DD_...csv
function fileDateRange(filename) {
  // Padrão principal: agenda_23-02-2026_a_27-02-2026.csv
  const mRange = filename.match(/(\d{2})-(\d{2})-(\d{4})_a_(\d{2})-(\d{2})-(\d{4})/);
  if (mRange) {
    const [, d1, m1, y1, d2, m2, y2] = mRange;
    return {
      start: `${y1}-${m1}-${d1}`,
      end:   `${y2}-${m2}-${d2}`,
      year:  parseInt(y1),
    };
  }
  // Padrão legado: YYYY-MM-DD no nome
  const mLeg = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mLeg) {
    return { start: `${mLeg[1]}-${mLeg[2]}-${mLeg[3]}`, end: null, year: parseInt(mLeg[1]) };
  }
  // Fallback: apenas ano de 4 dígitos
  const mY = filename.match(/(\d{4})/);
  return { start: null, end: null, year: mY ? parseInt(mY[1]) : new Date().getFullYear() };
}

/* ─── Extrai apenas o ano do nome do arquivo ─── */
function fileYear(filename) {
  return fileDateRange(filename).year;
}

/* ─── Converte "seg 2/3" → { abbr, name, date } ─── */
function parseDayCell(cell, year) {
  const m = cell.trim().match(/^(\w{2,3})\s+(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  return {
    abbr: m[1],
    name: DN[m[1].toLowerCase()] || m[1],
    date: `${year}-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  };
}

/* ─── PARSER CSV ─── */
function parseCSV(content, filename) {
  const range = fileDateRange(filename);
  const year  = range.year;
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

  // Pula cabeçalho
  const dataLines = lines[0].toLowerCase().startsWith('data') ? lines.slice(1) : lines;

  const appts = [];
  const daysSet = new Map(); // date → day info

  for (const line of dataLines) {
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;

    const [rawData, rawStart, rawEnd, rawTipo, rawPaciente, rawMatricula, rawSessao] = cols.map(c => c.trim());

    // Ignora "Ausente" e "Bloqueio de agenda"
    if (/^ausente$/i.test(rawPaciente) || /^bloqueio de agenda$/i.test(rawPaciente)) continue;
    if (!rawPaciente) continue;

    const dayInfo = parseDayCell(rawData, year);
    if (!dayInfo) continue;

    if (!daysSet.has(dayInfo.date)) daysSet.set(dayInfo.date, dayInfo);

    const tipo   = rawTipo.toUpperCase();   // F | NF | FJ | ""
    const status = (tipo === 'F' || tipo === 'NF' || tipo === 'FJ') ? tipo : null;

    // Sessão: "24/35" → sessionNumber=24, totalSessions=35
    let sessionNumber = null, totalSessions = null;
    if (rawSessao) {
      const sm = rawSessao.match(/^(\d+)\/(\d+)$/);
      if (sm) { sessionNumber = parseInt(sm[1]); totalSessions = parseInt(sm[2]); }
    }

    const id = `${dayInfo.date}-ap-${rawStart}`;
    appts.push({
      id,
      type: 'appointment',
      date:         dayInfo.date,
      day:          dayInfo.name,
      startTime:    rawStart,
      endTime:      rawEnd,
      patientName:  rawPaciente,
      patientCode:  rawMatricula || null,
      sessionNumber,
      totalSessions,
      status
    });
  }

  // Monta lista de dias únicos ordenados
  const days = [...daysSet.values()].sort((a, b) => a.date.localeCompare(b.date));

  // fileDate: prioriza data extraída do nome; fallback = primeira data dos dados
  const fileDate    = range.start || days[0]?.date || null;
  const fileEndDate = range.end   || days[days.length - 1]?.date || null;

  return {
    filename,
    fileDate,
    fileEndDate,
    days,
    appointments: appts,
    uploadedAt: new Date().toISOString()
  };
}

/* ─── PARSER TXT (legado) ─── */
function parseTXT(content, filename) {
  const lines = content.split('\n');
  const dm = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  const fy = dm ? parseInt(dm[1]) : new Date().getFullYear();

  let hl = '';
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    if (/seg\s+\d+\/\d+/.test(lines[i]) && /ter\s+\d+\/\d+/.test(lines[i])) { hl = lines[i]; break; }
  }

  const days = [];
  hl.split('\t').forEach(p => {
    const m = p.trim().match(/^(\w{2,3})\s+(\d{1,2})\/(\d{1,2})/);
    if (m) days.push({ abbr: m[1], name: DN[m[1].toLowerCase()] || m[1], date: `${fy}-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}` });
  });

  let as = 0;
  for (let i = 0; i < lines.length; i++) { if (/^\d{2}:\d{2}$/.test(lines[i].trim())) as = i + 1; }

  const blocks = []; let cur = [];
  for (const line of lines.slice(as)) {
    if (/^\t+$/.test(line) || line === '') { blocks.push([...cur]); cur = []; }
    else cur.push(line.trim());
  }
  if (cur.length) blocks.push(cur);

  const cb = blocks.filter(b => b.some(l => l));
  const appts = [];

  cb.forEach((block, di) => {
    const d = days[di]; if (!d) return;
    const bl = block.filter(l => l); let i = 0;
    while (i < bl.length) {
      const ln = bl[i];
      if (/^bloqueio de agenda$/i.test(ln)) { i++; continue; }
      const tm = ln.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (tm) {
        const [, st, et] = tm; i++;
        if (i >= bl.length) break;
        const c = bl[i];
        if (/^ausente$/i.test(c) || /^bloqueio de agenda$/i.test(c)) { i++; continue; }
        if (/^almo[çc]o$/i.test(c)) { i++; continue; }
        const cm = c.match(/^(.+?)\s*-\s*(\d{10,})\s*(?:\((\d+)\/(\d+)\))?$/);
        let rawName = cm ? cm[1].trim() : c;
        let appStatus = null;
        const sm = rawName.match(/^\((F|NF|FJ)\)\s*/i);
        if (sm) { appStatus = sm[1].toUpperCase(); rawName = rawName.slice(sm[0].length); }
        appts.push({
          id: `${d.date}-ap-${st}`, type: 'appointment',
          date: d.date, day: d.name, startTime: st, endTime: et,
          patientName: rawName, patientCode: cm ? cm[2] : null,
          sessionNumber: cm && cm[3] ? parseInt(cm[3]) : null,
          totalSessions: cm && cm[4] ? parseInt(cm[4]) : null,
          status: appStatus
        });
        i++; continue;
      }
      i++;
    }
  });

  return {
    filename,
    fileDate:    dm ? `${fy}-${dm[2]}-${dm[3]}` : null,
    fileEndDate: days[days.length - 1]?.date || null,
    days,
    appointments: appts,
    uploadedAt: new Date().toISOString()
  };
}

/* ─── Entrada unificada ─── */
function parse(content, filename) {
  if (filename.toLowerCase().endsWith('.csv')) return parseCSV(content, filename);
  return parseTXT(content, filename);
}
