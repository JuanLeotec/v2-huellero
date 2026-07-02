// ============================================================
// reporteSemanal.js — Vista "Reporte Semanal" (misma lógica que renderSemanal original)
// ============================================================
import { fmt, deptChipClass, DEPT_COLORS_HEX, showToast } from '../core/utils.js';

function getSemanas(){ return window.SEMANAS || []; }

let semanaIdx = null;

function compBadge(val, prev){
  if(!prev) return `<span style="color:var(--color-text-muted);font-size:var(--fs-2xs)">— Sin semana anterior</span>`;
  if(val > 0) return `<span class="cell-danger" style="font-size:var(--fs-2xs)">▲ +${fmt(Math.abs(val))} vs semana anterior</span>`;
  if(val < 0) return `<span style="color:var(--brand-green-700);font-size:var(--fs-2xs);font-weight:700">▼ -${fmt(Math.abs(val))} vs semana anterior</span>`;
  return `<span style="color:var(--color-text-muted);font-size:var(--fs-2xs)">= Igual que semana anterior</span>`;
}

function sumCard(label, value, comp, color){
  return `<div class="metric-card" style="flex-direction:column;align-items:flex-start;gap:6px;padding:16px">
    <div class="metric-label">${label}</div>
    <div class="metric-value" style="font-size:var(--fs-xl);${color?`color:${color}`:''}">${value}</div>
    <div>${comp}</div>
  </div>`;
}

function paint(){
  const SEMANAS = getSemanas();
  if(semanaIdx === null) semanaIdx = SEMANAS.length - 1;
  const s = SEMANAS[semanaIdx];
  const prev = semanaIdx > 0 ? SEMANAS[semanaIdx - 1] : null;

  document.getElementById('rsSelect').value = semanaIdx;
  document.getElementById('rsPrev').disabled = semanaIdx === 0;
  document.getElementById('rsNext').disabled = semanaIdx === SEMANAS.length - 1;

  const compTT = prev ? s.total_tt - prev.total_tt : 0;
  const compCT = prev ? s.con_tardio - prev.con_tardio : 0;
  const compOlv = prev ? s.con_olvido - prev.con_olvido : 0;

  document.getElementById('rsHeader').innerHTML = `
    <div>
      <h3 style="font-size:var(--fs-lg)">📊 Reporte Semanal — ${s.label}</h3>
      <p style="color:var(--color-text-muted);font-size:var(--fs-xs);margin-top:2px">Lunes a Sábado · ${s.people.length} empleados evaluados</p>
    </div>
    ${prev ? `<span class="chip chip-ok">vs semana anterior: ${prev.label}</span>` : ''}
  `;

  document.getElementById('rsSummary').innerHTML =
    sumCard('Total min tardíos', fmt(s.total_tt), compBadge(compTT, prev), 'var(--brand-red-600)') +
    sumCard('Personas con tardío', s.con_tardio, compBadge(compCT, prev)) +
    sumCard('Personas con olvido', s.con_olvido, compBadge(compOlv, prev), 'var(--brand-yellow-600)') +
    sumCard('Min tardío mañana', fmt(s.total_mm), `<span style="color:var(--color-text-muted);font-size:var(--fs-2xs)">${s.total_tt>0?Math.round(s.total_mm/s.total_tt*100)+'% del total':'—'}</span>`) +
    sumCard('Min tardío tarde', fmt(s.total_mt), `<span style="color:var(--color-text-muted);font-size:var(--fs-2xs)">${s.total_tt>0?Math.round(s.total_mt/s.total_tt*100)+'% del total':'—'}</span>`);

  const people = s.people;
  const maxTT = Math.max(...people.map(p => p.tt), 1);
  const medals = ['🥇','🥈','🥉'];

  document.getElementById('rsTbody').innerHTML = people.map((p,i) => {
    const rank = i + 1;
    const pct = Math.round(p.tt / maxTT * 100);
    const rankHtml = medals[i] ? `<span style="font-size:16px">${medals[i]}</span>` : `<span class="chip" style="background:var(--gray-100);color:var(--gray-600)">${rank}</span>`;
    const prevP = prev ? prev.people.find(pp => pp.n === p.n) : null;
    let tendencia = '';
    if(prevP){
      const diff = p.tt - prevP.tt;
      tendencia = diff > 0 ? `<span class="cell-danger" style="font-size:var(--fs-2xs)">▲+${fmt(diff)}</span>`
        : diff < 0 ? `<span style="color:var(--brand-green-700);font-size:var(--fs-2xs);font-weight:700">▼${fmt(diff)}</span>`
        : `<span style="color:var(--color-text-muted);font-size:var(--fs-2xs)">=</span>`;
    }
    const estado = p.tt === 0 && p.olvidos === 0 ? `<span class="chip chip-ok">✓ Puntual</span>`
      : p.tt > 0 && p.olvidos > 0 ? `<span class="chip chip-danger">Tardío+Olvido</span>`
      : p.tt > 0 ? `<span class="chip chip-danger">Con tardío</span>`
      : `<span class="chip chip-warn">Con olvido</span>`;
    const barColor = pct > 70 ? 'var(--color-danger)' : pct > 40 ? 'var(--color-warning)' : 'var(--brand-blue-600)';
    return `
      <tr>
        <td style="text-align:center">${rankHtml}</td>
        <td class="cell-strong">${p.n}</td>
        <td><span class="chip ${deptChipClass(p.d)}"><span class="chip-dot" style="background:${DEPT_COLORS_HEX[p.d]||'#9aa5b8'}"></span>${p.d}</span></td>
        <td style="text-align:right">${p.mm > 0 ? `<span class="cell-danger">${fmt(p.mm)}</span>` : '0'}</td>
        <td style="text-align:right">${p.mt > 0 ? `<span class="cell-danger">${fmt(p.mt)}</span>` : '0'}</td>
        <td style="text-align:right">${p.tt > 0 ? `<span class="chip chip-danger">${fmt(p.tt)}</span>` : `<span style="color:var(--brand-green-700);font-weight:700">0</span>`}</td>
        <td style="text-align:center">${p.rm > 0 ? `<span class="chip chip-warn">${p.rm}x</span>` : '—'}</td>
        <td style="text-align:center">${p.rt > 0 ? `<span class="chip chip-warn">${p.rt}x</span>` : '—'}</td>
        <td style="text-align:center">${p.olvidos > 0 ? `<span class="chip chip-warn">${p.olvidos} días</span>` : '—'}</td>
        <td style="min-width:110px"><div style="background:var(--gray-100);border-radius:6px;height:10px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${barColor};border-radius:6px"></div></div></td>
        <td style="text-align:center;white-space:nowrap">${estado} ${tendencia}</td>
      </tr>`;
  }).join('');

  if(window.lucide) window.lucide.createIcons();
}

function exportCSV(){
  const SEMANAS = getSemanas();
  const s = SEMANAS[semanaIdx];
  const h = ['Empleado','Departamento','Min Mañana','Min Tarde','Total Min','Ret. Mañana','Ret. Tarde','Olvidos'];
  const rows = s.people.map(p => [`"${p.n}"`,p.d,p.mm,p.mt,p.tt,p.rm,p.rt,p.olvidos].join(','));
  const blob = new Blob(['\uFEFF' + [h.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `reporte_semana_${s.start}.csv`; a.click();
  showToast('CSV exportado');
}

function skeleton(){
  const SEMANAS = getSemanas();
  return `
    <div class="filter-bar" style="align-items:center">
      <div class="filter-group" style="flex:0 0 260px"><label>Semana</label>
        <select id="rsSelect">${SEMANAS.map((s,i)=>`<option value="${i}">Semana ${s.label}</option>`).join('')}</select>
      </div>
      <div class="filter-actions" style="margin-left:auto">
        <button class="btn btn-outline btn-sm" id="rsPrev"><i data-lucide="chevron-left"></i> Anterior</button>
        <button class="btn btn-outline btn-sm" id="rsNext">Siguiente <i data-lucide="chevron-right"></i></button>
        <button class="btn btn-outline btn-sm" onclick="window.print()"><i data-lucide="printer"></i> Imprimir</button>
        <button class="btn btn-success btn-sm" id="rsExport"><i data-lucide="download"></i> CSV Semana</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px" id="rsHeader"></div>
    </div>

    <div class="grid stagger" id="rsSummary" style="grid-template-columns:repeat(5,1fr)"></div>

    <div class="table-card">
      <div class="table-card-head"><h3>Ranking de empleados</h3></div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>
            <th style="text-align:center">#</th><th>Empleado</th><th>Depto</th>
            <th style="text-align:right">Min Mañana</th><th style="text-align:right">Min Tarde</th><th style="text-align:right">Total Min</th>
            <th style="text-align:center">Ret. Mañana</th><th style="text-align:center">Ret. Tarde</th><th style="text-align:center">Olvidos</th>
            <th>Barra tardío</th><th style="text-align:center">Estado</th>
          </tr></thead>
          <tbody id="rsTbody"></tbody>
        </table>
      </div>
    </div>
  `;
}

export function render(firstMount){
  const container = document.getElementById('view-semanal');
  const SEMANAS = getSemanas();
  if(firstMount){
    semanaIdx = SEMANAS.length - 1;
    container.innerHTML = skeleton();
    document.getElementById('rsSelect').addEventListener('change', (e) => { semanaIdx = parseInt(e.target.value); paint(); });
    document.getElementById('rsPrev').addEventListener('click', () => { semanaIdx = Math.max(0, semanaIdx - 1); paint(); });
    document.getElementById('rsNext').addEventListener('click', () => { semanaIdx = Math.min(SEMANAS.length - 1, semanaIdx + 1); paint(); });
    document.getElementById('rsExport').addEventListener('click', exportCSV);
    document.addEventListener('data:export-current', () => { if(document.getElementById('view-semanal').classList.contains('active')) exportCSV(); });
    if(window.lucide) window.lucide.createIcons();
  }
  paint();
}
