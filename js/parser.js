/* PARSER DE ARQUIVOS .TXT */
const DN = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };

function parse(content, filename) {
  const lines = content.split('\n');
  const dm = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  const fy = dm ? parseInt(dm[1]) : new Date().getFullYear();

  let hl = '';
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    if (/seg\s+\d+\/\d+/.test(lines[i]) && /ter\s+\d+\/\d+/.test(lines[i])) {
      hl = lines[i];
      break;
    }
  }

  const days = [];
  hl.split('\t').forEach(p => {
    const m = p.trim().match(/^(\w{2,3})\s+(\d{1,2})\/(\d{1,2})/);
    if (m) days.push({
      abbr: m[1],
      name: DN[m[1].toLowerCase()] || m[1],
      date: `${fy}-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}`
    });
  });

  let as = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\d{2}:\d{2}$/.test(lines[i].trim())) as = i + 1;
  }

  const blocks = [];
  let cur = [];
  for (const line of lines.slice(as)) {
    if (/^\t+$/.test(line) || line === '') { blocks.push([...cur]); cur = []; }
    else cur.push(line.trim());
  }
  if (cur.length) blocks.push(cur);

  const cb = blocks.filter(b => b.some(l => l));
  const appts = [];

  cb.forEach((block, di) => {
    const d = days[di];
    if (!d) return;
    const bl = block.filter(l => l);
    let i = 0;

    while (i < bl.length) {
      const ln = bl[i];

      if (/^bloqueio de agenda$/i.test(ln)) { i++; continue; }

      const tm = ln.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (tm) {
        const [, st, et] = tm;
        i++;
        if (i >= bl.length) break;
        const c = bl[i];

        if (/^ausente$/i.test(c)) {
          appts.push({ id: `${d.date}-abs-${st}`, type: 'absent', date: d.date, day: d.name, startTime: st, endTime: et, patientName: null, patientCode: null, sessionNumber: null, totalSessions: null, status: null });
        } else if (/^almo[çc]o$/i.test(c)) {
          appts.push({ id: `${d.date}-lun-${st}`, type: 'lunch', date: d.date, day: d.name, startTime: st, endTime: et, patientName: null, patientCode: null, sessionNumber: null, totalSessions: null, status: null });
        } else if (/^bloqueio de agenda$/i.test(c)) {
          // ignorar bloqueios
        } else {
          const cm = c.match(/^(.+?)\s*-\s*(\d{10,})\s*(?:\((\d+)\/(\d+)\))?$/);
          let rawName = cm ? cm[1].trim() : c;
          let appStatus = null;
          const sm = rawName.match(/^\((F|NF|FJ)\)\s*/i);
          if (sm) { appStatus = sm[1].toUpperCase(); rawName = rawName.slice(sm[0].length); }
          appts.push({
            id: `${d.date}-ap-${st}`,
            type: 'appointment',
            date: d.date, day: d.name,
            startTime: st, endTime: et,
            patientName: rawName,
            patientCode: cm ? cm[2] : null,
            sessionNumber: cm && cm[3] ? parseInt(cm[3]) : null,
            totalSessions: cm && cm[4] ? parseInt(cm[4]) : null,
            status: appStatus
          });
        }
        i++;
        continue;
      }
      i++;
    }
  });

  return { filename, fileDate: dm ? `${fy}-${dm[2]}-${dm[3]}` : null, days, appointments: appts, uploadedAt: new Date().toISOString() };
}
