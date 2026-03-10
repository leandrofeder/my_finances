/* DADOS DERIVADOS */

function allA() {
  const seen = new Set();
  const result = [];
  for (const f of S.files) {
    for (const a of f.appointments) {
      const patId = a.type === 'appointment'
        ? (a.patientCode || stripSt(a.patientName) || '')
        : (a.type);
      const key = `${a.type}|${a.date}|${a.startTime || ''}|${patId}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(a);
      }
    }
  }
  return result;
}

function filtA() {
  return allA().filter(a => {
    if (!a.date) return true;
    if (S.dateFrom && a.date < S.dateFrom) return false;
    if (S.dateTo   && a.date > S.dateTo)   return false;
    return true;
  });
}

function months() {
  const s = new Set();
  allA().forEach(a => { if (a.date) s.add(a.date.slice(0, 7)); });
  return [...s].sort();
}

function patMap(appts) {
  const m = new Map();

  appts.filter(a => a.type === 'appointment').forEach(a => {
    const cleanName = stripSt(a.patientName);
    let status = a.status;
    if (status == null) {
      const sm = (a.patientName || '').match(/^\((F|NF|FJ)\)\s*/i);
      if (sm) status = sm[1].toUpperCase();
    }
    const k = a.patientCode || cleanName;
    if (!m.has(k)) m.set(k, { key: k, name: cleanName, code: a.patientCode, sessions: [] });
    m.get(k).sessions.push({ ...a, patientName: cleanName, status });
  });

  // Mescla entradas com nome+código embutido
  for (const [k, p] of [...m.entries()]) {
    if (p.code) continue;
    const nm = k.match(/^(.+?)\s+(\d{10,})\s*$/);
    if (!nm) continue;
    const embCode = nm[2], embName = nm[1].trim();
    const target = m.has(embCode) ? m.get(embCode) : null;
    if (target) {
      const fixedSessions = p.sessions.map(s => ({ ...s, patientName: embName || target.name }));
      target.sessions.push(...fixedSessions);
      if (!target.name || target.name === embCode) target.name = embName;
      m.delete(k);
    }
  }

  return m;
}

function patList(appts) {
  const m = patMap(appts);
  return [...m.values()].map(p => {
    if (S.hiddenPatients && S.hiddenPatients.includes(p.key)) return null;
    const s = [...p.sessions].sort((a, b) => a.date.localeCompare(b.date));
    const last = s[s.length - 1];
    const price = S.prices.patients[p.key] ?? S.prices.default;
    const hasAnyStatus = p.sessions.some(a => a.status != null);
    const presF = p.sessions.filter(a => a.status === 'F').length;
    const absNF = p.sessions.filter(a => a.status === 'NF').length;
    const absFJ = p.sessions.filter(a => a.status === 'FJ').length;
    const billableSessions = hasAnyStatus ? p.sessions.filter(a => a.status === 'F') : p.sessions;
    return {
      ...p, count: p.sessions.length, presF, absNF, absFJ, hasAnyStatus, price,
      revenue: billableSessions.length * price,
      lastDate: last?.date || '',
      curSession: last?.sessionNumber || null,
      totalSess: last?.totalSessions || null,
      sessions: s
    };
  }).filter(Boolean).sort((a, b) => b.count - a.count);
}

function stats(appts) {
  const pm = patMap(appts);
  let rev = 0;
  for (const [k, p] of pm) {
    if (S.hiddenPatients && S.hiddenPatients.includes(k)) continue;
    const hasAnyStatus = p.sessions.some(a => a.status != null);
    const billable = hasAnyStatus ? p.sessions.filter(a => a.status === 'F') : p.sessions;
    rev += billable.length * (S.prices.patients[k] ?? S.prices.default);
  }
  const visiblePats = new Set([...pm.keys()].filter(k => !S.hiddenPatients || !S.hiddenPatients.includes(k)));
  const allAppts = appts.filter(a => a.type === 'appointment');
  const anyHasStatus = allAppts.some(a => a.status != null);
  return {
    total: anyHasStatus ? allAppts.filter(a => a.status === 'F').length : allAppts.length,
    absent: allAppts.filter(a => a.status === 'NF' || a.status === 'FJ').length,
    absFJ: allAppts.filter(a => a.status === 'FJ').length,
    absNF: allAppts.filter(a => a.status === 'NF').length,
    patients: visiblePats.size,
    revenue: rev,
    anyHasStatus
  };
}

function chartD(appts) {
  const by = {};
  appts.forEach(a => {
    if (!a.date) return;
    if (!by[a.date]) by[a.date] = { date: a.date, at: 0, ab: 0, bl: 0 };
    if (a.type === 'appointment') by[a.date].at++;
    if (a.type === 'absent')      by[a.date].ab++;
    if (a.type === 'blocked')     by[a.date].bl++;
  });
  return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}
