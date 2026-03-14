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

    // Filtro de confirmação: só se aplica a appointments com coluna Presença (novo formato).
    // No modo 'responded', exclui os que não têm resposta do paciente (confirmation === null).
    // Formato antigo (confirmation === undefined) passa sempre.
    if (S.confFilter === 'responded' && a.type === 'appointment' && a.confirmation !== undefined) {
      if (a.confirmation !== 'V' && a.confirmation !== 'X') return false;
    }

    return true;
  });
}

function months() {
  const s = new Set();
  allA().forEach(a => { if (a.date) s.add(a.date.slice(0, 7)); });
  return [...s].sort();
}

/**
 * Um appointment é "pendente" quando vem do novo formato CSV
 * (tem coluna Presença) mas a recepcionista ainda não lançou o status (F/NF/FJ).
 */
function isPending(a) {
  return a.type === 'appointment' && a.confirmation !== undefined && a.status === null;
}

/** Verifica se algum arquivo tem a coluna de confirmação */
function hasConfirmationData() {
  return allA().some(a => a.type === 'appointment' && a.confirmation !== undefined);
}

/** Conta pendentes no período atual (sem respeitar confFilter) */
function countPendingInPeriod() {
  return allA().filter(a => {
    if (!a.date) return true;
    if (S.dateFrom && a.date < S.dateFrom) return false;
    if (S.dateTo   && a.date > S.dateTo)   return false;
    return isPending(a);
  }).length;
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

    const nonPending    = p.sessions.filter(a => !isPending(a));
    const pendingCount  = p.sessions.length - nonPending.length;

    const hasAnyStatus  = nonPending.some(a => a.status != null);
    const presF  = p.sessions.filter(a => a.status === 'F').length;
    const absNF  = p.sessions.filter(a => a.status === 'NF').length;
    const absFJ  = p.sessions.filter(a => a.status === 'FJ').length;
    const billableSessions = hasAnyStatus
      ? p.sessions.filter(a => a.status === 'F')
      : nonPending;

    return {
      ...p,
      count: nonPending.length,
      pendingCount,
      presF, absNF, absFJ,
      hasAnyStatus,
      price,
      revenue: billableSessions.length * price,
      lastDate: last?.date || '',
      curSession: last?.sessionNumber || null,
      totalSess:  last?.totalSessions || null,
      sessions: s
    };
  }).filter(Boolean).sort((a, b) => b.count - a.count);
}

function stats(appts) {
  const pm = patMap(appts);
  let rev = 0;
  for (const [k, p] of pm) {
    if (S.hiddenPatients && S.hiddenPatients.includes(k)) continue;
    const nonPending   = p.sessions.filter(a => !isPending(a));
    const hasAnyStatus = nonPending.some(a => a.status != null);
    const billable     = hasAnyStatus ? p.sessions.filter(a => a.status === 'F') : nonPending;
    rev += billable.length * (S.prices.patients[k] ?? S.prices.default);
  }

  const visiblePats    = new Set([...pm.keys()].filter(k => !S.hiddenPatients || !S.hiddenPatients.includes(k)));
  const allAppts       = appts.filter(a => a.type === 'appointment');
  const nonPendingAll  = allAppts.filter(a => !isPending(a));
  const anyHasStatus   = nonPendingAll.some(a => a.status != null);
  const pendingCount   = allAppts.filter(a => isPending(a)).length;

  return {
    total:       anyHasStatus ? nonPendingAll.filter(a => a.status === 'F').length : nonPendingAll.length,
    absent:      nonPendingAll.filter(a => a.status === 'NF' || a.status === 'FJ').length,
    absFJ:       nonPendingAll.filter(a => a.status === 'FJ').length,
    absNF:       nonPendingAll.filter(a => a.status === 'NF').length,
    patients:    visiblePats.size,
    revenue:     rev,
    anyHasStatus,
    pending:     pendingCount
  };
}

function chartD(appts) {
  const by = {};
  const validAppts   = appts.filter(a => !isPending(a));
  const anyHasStatus = validAppts.some(a => a.type === 'appointment' && a.status != null);
  validAppts.forEach(a => {
    if (!a.date || a.type !== 'appointment') return;
    if (!by[a.date]) by[a.date] = { date: a.date, at: 0, ab: 0 };
    if (anyHasStatus) {
      if (a.status === 'F')                        by[a.date].at++;
      if (a.status === 'NF' || a.status === 'FJ')  by[a.date].ab++;
    } else {
      by[a.date].at++;
    }
  });
  return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}

/* ─── INSIGHTS ─── */

function insightCancelsByPatient(appts) {
  const pm = patMap(appts);
  return [...pm.values()]
    .map(p => ({
      key:   p.key,
      name:  p.name,
      nf:    p.sessions.filter(a => a.status === 'NF').length,
      fj:    p.sessions.filter(a => a.status === 'FJ').length,
      total: p.sessions.filter(a => a.status === 'NF' || a.status === 'FJ').length,
      pres:  p.sessions.filter(a => a.status === 'F').length,
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total);
}

function insightCancelsByWeekday(appts) {
  const labels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const counts = { att: Array(7).fill(0), cancel: Array(7).fill(0) };
  appts.filter(a => a.type === 'appointment' && a.date && !isPending(a)).forEach(a => {
    const dow = new Date(a.date + 'T12:00').getDay();
    if (a.status === 'NF' || a.status === 'FJ') counts.cancel[dow]++;
    else counts.att[dow]++;
  });
  return labels.map((l, i) => ({ label: l, att: counts.att[i], cancel: counts.cancel[i] }))
    .filter(d => d.att + d.cancel > 0);
}

function insightAttByWeekday(appts) {
  const labels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const counts = Array(7).fill(0);
  appts.filter(a => a.type === 'appointment' && a.date && !isPending(a) && a.status !== 'NF' && a.status !== 'FJ').forEach(a => {
    counts[new Date(a.date + 'T12:00').getDay()]++;
  });
  return labels.map((l, i) => ({ label: l, count: counts[i] })).filter(d => d.count > 0);
}

function insightByPeriod(appts) {
  const periods = [
    { key: 'manha',  label: 'Manhã',   start:  6, end: 12 },
    { key: 'tarde',  label: 'Tarde',   start: 12, end: 18 },
    { key: 'noite',  label: 'Noite',   start: 18, end: 24 },
  ];
  const counts = periods.map(p => ({ ...p, att: 0, cancel: 0 }));
  appts.filter(a => a.type === 'appointment' && a.startTime && !isPending(a)).forEach(a => {
    const h = parseInt(a.startTime.split(':')[0]);
    const p = counts.find(p => h >= p.start && h < p.end);
    if (!p) return;
    if (a.status === 'NF' || a.status === 'FJ') p.cancel++;
    else p.att++;
  });
  return counts.filter(p => p.att + p.cancel > 0);
}
