/* FORMATADORES */
const fBRL  = v => 'R$\u00A0' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fDate = d => new Date(d + 'T12:00').toLocaleDateString('pt-BR');
const fMo   = m => {
  const [y, mo] = m.split('-');
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mo) - 1] + '/' + y;
};

const pill = (t, c, bg) =>
  `<span class="pill" style="color:${c};background:${bg || c + '22'};border:1px solid ${c}44">${t}</span>`;

const esc  = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
const ea   = s => s ? String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;') : '';

// Remove prefixo (F)/(NF)/(FJ) de nomes legados
const stripSt = n => n ? n.replace(/^\((F|NF|FJ)\)\s*/i, '').trim() : n;
