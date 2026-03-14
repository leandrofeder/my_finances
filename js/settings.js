/* CONFIGURAÇÕES */

function renderSettings() {
  const ce      = Object.entries(S.prices.patients);
  const pl      = patList(allA());
  const allPats = patMap(allA());
  const hidden  = (S.hiddenPatients || []).map(k => {
    const p = allPats.get(k);
    return p ? { key: k, name: p.name } : { key: k, name: k };
  });
  const totalAppts  = allA().filter(a => a.type === 'appointment').length;
  const totalFiles  = S.files.length;
  const customPrices = Object.keys(S.prices.patients).length;

  const btnIcon = (path) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px">${path}</svg>`;
  const dlIcon  = btnIcon('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>');
  const ulIcon  = btnIcon('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>');

  return `
    <div class="pt" style="margin-bottom:20px">Configurações</div>

    <!-- ── HISTÓRICO DE ATENDIMENTOS ── -->
    <div class="ssec">
      <div class="stit">Histórico de atendimentos</div>
      <div class="sdesc">
        Exporta todos os atendimentos em um único CSV <strong>sem preços</strong>.
        Use para backup ou para restaurar o histórico em outro dispositivo.
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="bsave" onclick="exportHistory()" ${!totalAppts ? 'disabled title="Nenhum dado para exportar"' : ''}>
          ${dlIcon}Exportar histórico (.csv)
        </button>
        <button class="bsave" style="background:var(--surface2);color:var(--text);border:1px solid var(--border2)"
          onclick="document.getElementById('fi-history').click()">
          ${ulIcon}Importar histórico (.csv)
        </button>
        ${totalAppts ? `<span style="font-size:11px;color:var(--muted)">${totalAppts} atendimento(s) · ${totalFiles} arquivo(s)</span>` : ''}
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--muted);line-height:1.7">
        <strong style="color:var(--sub)">Relatório semanal</strong> — CSV exportado por semana (ex: <code>agenda_02-03_a_06-03-2026.csv</code>)<br>
        <strong style="color:var(--sub)">Histórico consolidado</strong> — CSV gerado por esta plataforma com todos os atendimentos unificados
      </div>
    </div>

    <!-- ── VALORES DOS PACIENTES ── -->
    <div class="ssec">
      <div class="stit">Valores dos pacientes</div>
      <div class="sdesc">
        Exporta o valor padrão e todos os valores personalizados em um arquivo separado.
        Importe este arquivo para restaurar os preços sem precisar reconfigurar manualmente.
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="bsave" onclick="exportPrices()">
          ${dlIcon}Exportar valores (.csv)
        </button>
        <button class="bsave" style="background:var(--surface2);color:var(--text);border:1px solid var(--border2)"
          onclick="document.getElementById('fi-prices').click()">
          ${ulIcon}Importar valores (.csv)
        </button>
        <span style="font-size:11px;color:var(--muted)">
          Padrão: <strong style="color:var(--green)">${fBRL(S.prices.default)}</strong>
          ${customPrices ? ` · ${customPrices} personalizado(s)` : ''}
        </span>
      </div>
    </div>

    <!-- ── VALOR PADRÃO ── -->
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
        ${btnIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>')}
        Limpar todos os dados
      </button>
    </div>`;
}

function saveDP() {
  const v = parseFloat(document.getElementById('dpi').value);
  if (!isNaN(v) && v >= 0) { S.prices.default = v; saveP(); renderMain(); }
}

async function clearAll() {
  const ok = await showConfirm(
    'Apagar tudo',
    'Isso apagará todos os arquivos, valores e configurações. Esta ação não pode ser desfeita.',
    { confirmLabel: 'Apagar tudo', confirmStyle: 'danger', type: 'error' }
  );
  if (!ok) return;
  S.files = [];
  S.dateFrom = null;
  S.dateTo   = null;
  S.prices   = { default: 200, patients: {} };
  S.hiddenPatients = [];
  saveF(); saveP(); saveR(); saveH();
  renderDRB(); renderSBFiles(); renderMain();
}
