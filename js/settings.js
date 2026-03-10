/* CONFIGURAÇÕES */

function renderSettings() {
  const ce      = Object.entries(S.prices.patients);
  const pl      = patList(allA());
  const allPats = patMap(allA());
  const hidden  = (S.hiddenPatients || []).map(k => {
    const p = allPats.get(k);
    return p ? { key: k, name: p.name } : { key: k, name: k };
  });

  return `
    <div class="pt" style="margin-bottom:20px">Configurações</div>

    <div class="ssec">
      <div class="stit">Valor padrão por sessão</div>
      <div class="sdesc">Aplicado a todos os pacientes sem valor personalizado. Você pode sobrescrever individualmente na aba Pacientes.</div>
      <div style="display:flex;gap:10px">
        <div class="pi"><span>R$</span><input type="number" id="dpi" min="0" step="0.01" value="${S.prices.default}"></div>
        <button class="bsave" onclick="saveDP()">Salvar</button>
      </div>
    </div>

    ${ce.length ? `<div class="ssec">
      <div class="stit" style="margin-bottom:14px">Valores personalizados (${ce.length})</div>
      ${ce.map(([k, price]) => {
        const p = pl.find(x => x.key === k);
        return `<div class="cpr">
          <div style="flex:1;font-size:13px">${esc(p?.name || k)}</div>
          <span style="color:var(--green);font-weight:700;font-family:var(--mono)">${fBRL(price)}</span>
          <button onclick="resetP('${ea(k)}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;font-family:var(--font)">remover</button>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${hidden.length ? `<div class="ssec">
      <div class="stit" style="margin-bottom:4px">Pacientes ocultos (${hidden.length})</div>
      <div class="sdesc">Estes pacientes foram removidos da lista mas seus atendimentos ainda existem nos arquivos.</div>
      ${hidden.map(p => `
        <div class="cpr">
          <div style="flex:1;font-size:13px">${esc(p.name)}</div>
          <button onclick="restorePat('${ea(p.key)}')" style="background:rgba(14,165,233,.1);border:1px solid rgba(14,165,233,.2);border-radius:5px;padding:3px 10px;cursor:pointer;color:#7DD3FC;font-size:11px;font-family:var(--font)">restaurar</button>
        </div>`).join('')}
    </div>` : ''}

    <div class="ssec dz">
      <div class="stit" style="color:var(--red)">Zona de perigo</div>
      <div class="sdesc">Remove todos os dados importados e configurações.</div>
      <button class="bdanger" onclick="clearAll()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        Limpar todos os dados
      </button>
    </div>`;
}

function saveDP() {
  const v = parseFloat(document.getElementById('dpi').value);
  if (!isNaN(v) && v >= 0) { S.prices.default = v; saveP(); renderMain(); }
}

function clearAll() {
  if (!confirm('Tem certeza? Isso apagará todos os arquivos e configurações.')) return;
  S.files = [];
  S.dateFrom = null;
  S.dateTo   = null;
  S.prices   = { default: 200, patients: {} };
  S.hiddenPatients = [];
  saveF(); saveP(); saveR(); saveH();
  renderDRB(); renderSBFiles(); renderMain();
}
