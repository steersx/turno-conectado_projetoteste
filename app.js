const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const today = new Date();
const dateText = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
$('#today').textContent = dateText + ' · ' + today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const USERS = {
  '12345678': {
  name: 'Administrador',
  role: 'Gestão',
  area: 'Gestão'
},
};
const seedMachines = [
  { id: 'M-023', name: 'Máquina 23', sector: 'Usinagem', status: 'Em análise', type: 'Corretiva', owner: 'João Santos' },
  { id: 'M-008', name: 'Máquina 08', sector: 'Montagem', status: 'Em teste', type: 'Preventiva', owner: 'Carla Souza' },
  { id: 'M-015', name: 'Máquina 15', sector: 'Caldeiraria', status: 'Operando', type: 'Preditiva', owner: 'Rafael Lima' },
  { id: 'M-027', name: 'Máquina 27', sector: 'Embalagem', status: 'Pendente', type: 'Corretiva', owner: 'João Santos' },
  { id: 'M-032', name: 'Máquina 32', sector: 'Utilidades', status: 'Em manutenção', type: 'Preventiva', owner: 'Carla Souza' },
  { id: 'M-012', name: 'Máquina 12', sector: 'Usinagem', status: 'Operando', type: 'Preventiva', owner: 'Lucas Mendes' },
  { id: 'M-004', name: 'Máquina 04', sector: 'Montagem', status: 'Parada', type: 'Corretiva', owner: 'Carlos Lima' },
  { id: 'M-018', name: 'Máquina 18', sector: 'Caldeiraria', status: 'Operando', type: 'Preditiva', owner: 'Rafael Lima' }
];
const seedReports = [
  { id: 1, machine: 'Máquina 23', type: 'Corretiva', date: '2026-10-02T08:45', owner: 'João Santos', problem: 'Superaquecimento', action: 'Inspeção inicial e limpeza do sistema de refrigeração.', result: 'Em andamento', status: 'Em análise', shift: 'A', downtime: 2.5, continuity: 'Turno B deve continuar os testes antes da liberação.' },
  { id: 2, machine: 'Máquina 08', type: 'Preventiva', date: '2026-10-02T08:15', owner: 'Carla Souza', problem: 'Inspeção programada', action: 'Inspeção de rotina e reaperto de conexões.', result: 'Concluído', status: 'Em teste', shift: 'B', downtime: 0, continuity: 'Validar operação após teste.' },
  { id: 3, machine: 'Máquina 15', type: 'Preditiva', date: '2026-10-02T07:42', owner: 'Rafael Lima', problem: 'Ruído anormal', action: 'Medição de vibração e análise de tendência.', result: 'Resolvido', status: 'Resolvido', shift: 'A', downtime: 0, continuity: 'Monitorar vibração na próxima inspeção.' },
  { id: 4, machine: 'Máquina 27', type: 'Corretiva', date: '2026-10-01T16:33', owner: 'João Santos', problem: 'Falha no sensor', action: 'Sensor isolado para diagnóstico.', result: 'Pendente', status: 'Pendente', shift: 'B', downtime: 1.2, continuity: 'Aguardar peça de reposição.' },
  { id: 5, machine: 'Máquina 32', type: 'Preventiva', date: '2026-10-01T15:20', owner: 'Carla Souza', problem: 'Queda de pressão', action: 'Verificação de filtros e conexões.', result: 'Em andamento', status: 'Em manutenção', shift: 'A', downtime: 2.2, continuity: 'Rever pressão após troca do filtro.' }
];
let currentUser = null, currentPage = 'dashboard';
let machines = JSON.parse(localStorage.getItem('tc_machines') || 'null') || seedMachines;
let reports = JSON.parse(localStorage.getItem('tc_reports') || 'null') || seedReports;
function save() { localStorage.setItem('tc_machines', JSON.stringify(machines)); localStorage.setItem('tc_reports', JSON.stringify(reports)) }
function esc(s = '') { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function isManager() { return currentUser?.role === 'Gestão' }
function showToast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600) }
function statusClass(s) { if (/Resolvido|Operando|Concluído/i.test(s)) return 'green'; if (/Pendente|Parada|análise/i.test(s)) return 'red'; if (/teste|manutenção/i.test(s)) return 'yellow'; return 'blue' }
function statusTag(s) { return `<span class="status ${statusClass(s)}">${esc(s)}</span>` }

function login() {
  const code = $('#access-code').value.trim();
  const user = USERS[code];

  if (!user) {
    $('#login-error').textContent =
      'Senha inválida. Confira o código e tente novamente.';
    return;
  }

  currentUser = user;

  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');

  $('#user-role').textContent = user.role;
  $('#user-name').textContent = user.name;

  $$('.manager-only').forEach(el => {
    el.style.display = isManager() ? 'flex' : 'none';
  });

  $('#welcome').innerHTML =
    `<h1>Olá, ${esc(user.name)}!</h1>` +
    '<p>Confira as informações da operação e acompanhe as ocorrências.</p>';

  go('dashboard');
}

function go(page) { if (['management', 'indicators'].includes(page) && !isManager()) { showToast('Acesso permitido apenas à gestão.'); return } currentPage = page; $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page)); $('#sidebar').classList.remove('open'); $('#welcome').classList.toggle('hidden', page !== 'dashboard'); render() }
function kpi(title, value, sub, color) { return `<div class="kpi ${color}"><div class="kpi-title">${title}</div><div class="value">${value}</div><small>${sub}</small></div>` }
function table(headers, rows) { return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="8" class="empty">Nenhum registro encontrado.</td></tr>'}</tbody></table></div>` }
function reportRows(list) { return list.slice().reverse().map(r => `<tr><td>${esc(r.machine)}</td><td>${esc(r.problem)}</td><td>${esc(r.shift)}</td><td>${statusTag(r.status)}</td><td>${esc(r.owner)}</td><td>${new Date(r.date).toLocaleDateString('pt-BR')}</td></tr>`).join('') }
function dashboard() {
  let open = reports.filter(r => !['Resolvido', 'Concluído'].includes(r.status)).length, done = reports.filter(r => ['Resolvido', 'Concluído'].includes(r.status)).length, active = machines.filter(m => /manutenção|análise|teste/i.test(m.status)).length, stopped = machines.filter(m => /Parada/i.test(m.status)).length; let visibleReports = isManager() ? reports : reports.filter(r => r.owner === currentUser.name || r.type === currentUser.area);
  return `<div class="kpis">${kpi('Máquinas cadastradas', machines.length, 'Total de equipamentos', 'blue')}${kpi('Máquinas com ocorrência', open, 'Aguardando resolução', 'red')}${kpi('Manutenções em andamento', active, 'Em execução', 'yellow')}${kpi('Máquinas liberadas', machines.filter(m => m.status === 'Operando').length, 'Em operação', 'green')}${kpi('Ocorrências não resolvidas', open, 'Precisam de continuidade', 'orange')}${kpi('Manutenções realizadas', done, 'Concluídas ou resolvidas', 'purple')}</div>
<div class="dashboard-grid">
<section class="panel"><h3>Status das máquinas</h3><div class="status-layout"><div class="donut"><div class="donut-center">${machines.length}<small>máquinas</small></div></div><div class="legend">${[['Operando', machines.filter(m => m.status === 'Operando').length, 'var(--green)'], ['Em manutenção', machines.filter(m => m.status === 'Em manutenção').length, 'var(--yellow)'], ['Parada', machines.filter(m => m.status === 'Parada').length, 'var(--red)'], ['Em teste', machines.filter(m => m.status === 'Em teste').length, 'var(--blue)'], ['Outros', machines.filter(m => !['Operando', 'Em manutenção', 'Parada', 'Em teste'].includes(m.status)).length, 'var(--purple)']].map(x => `<div class="legend-row"><span class="dot" style="background:${x[2]}"></span>${x[0]}<b>${x[1]}</b></div>`).join('')}</div></div></section>
<section class="panel"><div class="panel-head"><h3>Ocorrências recentes</h3><button class="link-btn" data-go="occurrences">Ver todas →</button></div>${table(['Máquina', 'Problema', 'Turno', 'Status', 'Responsável'], reportRows(visibleReports.slice(-5)))}</section>
<section class="panel"><h3>Tipos de manutenção</h3><div class="status-layout"><div class="donut" style="background:conic-gradient(var(--blue) 0 33%,var(--green) 33% 70%,var(--red) 70% 100%)"><div class="donut-center">${reports.length}<small>registros</small></div></div><div class="legend">${['Preditiva', 'Preventiva', 'Corretiva'].map((t, i) => `<div class="legend-row"><span class="dot" style="background:${['var(--blue)', 'var(--green)', 'var(--red)'][i]}"></span>${t}<b>${reports.filter(r => r.type === t).length}</b></div>`).join('')}</div></div></section></div>
<div class="bottom-grid"><section class="panel"><div class="panel-head"><h3>Continuidade entre turnos</h3><button class="link-btn" data-go="history">Ver todas →</button></div>${(visibleReports.filter(r => r.continuity).slice(-2).reverse().map(r => `<div class="continuity"><h4>${esc(r.machine)} ${statusTag(r.status)}</h4><small>${esc(r.shift)} → Próximo turno · ${esc(r.owner)}</small><p>${esc(r.continuity)}</p></div>`).join('')) || '<p class="muted">Nenhuma pendência de continuidade.</p>'}</section>
<section class="panel"><h3>Indicadores rápidos</h3><div class="split"><div class="mini-stat"><small>Total de ocorrências</small><b>${reports.length}</b><small>Registros no sistema</small></div><div class="mini-stat"><small>Tempo parado registrado</small><b>${reports.reduce((s, r) => s + (Number(r.downtime) || 0), 0).toFixed(1)} h</b><small>Somatório informado</small></div><div class="mini-stat"><small>Preventivas</small><b>${reports.filter(r => r.type === 'Preventiva').length}</b><small>Registros</small></div><div class="mini-stat"><small>Pendentes</small><b>${open}</b><small>Acompanhar</small></div></div></section>
<section class="panel"><h3>Ocorrências por setor</h3>${['Usinagem', 'Montagem', 'Caldeiraria', 'Embalagem', 'Utilidades'].map((s, i) => { let n = reports.filter(r => machines.find(m => m.name === r.machine)?.sector === s).length; return `<div class="bar-row"><span>${s}</span><div class="bar"><span style="width:${Math.max(5, n * 25)}%"></span></div><b>${n}</b></div>` }).join('')}</section></div>`
}
function machinesPage() { return `<div class="section-title"><h2>Máquinas e equipamentos</h2><button class="primary" data-go="report">＋ Registrar serviço</button></div><div class="toolbar"><input id="machine-search" placeholder="Buscar máquina ou setor..."><select id="machine-status"><option value="">Todos os status</option>${['Operando', 'Em manutenção', 'Em análise', 'Em teste', 'Pendente', 'Parada'].map(s => `<option>${s}</option>`).join('')}</select></div><section class="panel" id="machines-table">${machinesTable(machines)}</section>` }
function machinesTable(list) { return table(['Código', 'Máquina', 'Setor', 'Status', 'Tipo mais recente', 'Responsável', 'Ação'], list.map(m => `<tr><td>${esc(m.id)}</td><td>${esc(m.name)}</td><td>${esc(m.sector)}</td><td>${statusTag(m.status)}</td><td>${esc(m.type)}</td><td>${esc(m.owner)}</td><td><button class="link-btn" data-machine-history="${esc(m.name)}">Histórico →</button></td></tr>`).join('')) }
function occurrencesPage() { let list = isManager() ? reports : reports.filter(r => r.owner === currentUser.name || r.type === currentUser.area); return `<div class="section-title"><h2>Ocorrências</h2><button class="primary" data-go="report">＋ Nova ocorrência</button></div><div class="toolbar"><input id="occ-search" placeholder="Buscar máquina, problema ou responsável..."><select id="occ-status"><option value="">Todos os status</option>${['Em análise', 'Em teste', 'Resolvido', 'Pendente', 'Em manutenção', 'Concluído'].map(s => `<option>${s}</option>`).join('')}</select></div><section class="panel" id="occ-table">${table(['Máquina', 'Problema', 'Tipo', 'Data / hora', 'Turno', 'Status', 'Responsável'], list.slice().reverse().map(r => `<tr><td>${esc(r.machine)}</td><td>${esc(r.problem)}</td><td>${esc(r.type)}</td><td>${new Date(r.date).toLocaleString('pt-BR')}</td><td>${esc(r.shift)}</td><td>${statusTag(r.status)}</td><td>${esc(r.owner)}</td></tr>`).join(''))}</section>` }
function reportPage() {
  return `<div class="section-title"><h2>Registrar manutenção / ocorrência</h2></div><section class="panel"><form id="report-form"><div class="form-grid">
<div class="field"><label>Máquina / equipamento *</label><input name="machine" list="machine-list" placeholder="Ex.: Máquina 23" required><datalist id="machine-list">${machines.map(m => `<option value="${esc(m.name)}">`).join('')}</datalist></div>
<div class="field"><label>Tipo de manutenção *</label><select name="type" required>${[currentUser.area, 'Preditiva', 'Preventiva', 'Corretiva'].filter((x, i, a) => x && a.indexOf(x) === i && x !== 'Gestão').map(t => `<option>${t}</option>`).join('')}</select></div>
<div class="field"><label>Problema / ocorrência *</label><input name="problem" placeholder="Descreva o que aconteceu" required></div>
<div class="field"><label>Turno *</label><select name="shift"><option>A</option><option>B</option><option>C</option></select></div>
<div class="field full-field"><label>Procedimento executado</label><textarea name="action" placeholder="O que foi verificado ou realizado?"></textarea></div>
<div class="field"><label>Resultado *</label><select name="result"><option>Em andamento</option><option>Concluído</option><option>Resolvido</option><option>Não resolvido</option><option>Aguardando peça</option></select></div>
<div class="field"><label>Status atual *</label><select name="status"><option>Em análise</option><option>Em manutenção</option><option>Em teste</option><option>Operando</option><option>Pendente</option><option>Parada</option><option>Resolvido</option></select></div>
<div class="field"><label>Tempo de parada (horas)</label><input name="downtime" type="number" min="0" step=".1" value="0"></div>
<div class="field"><label>Continuidade / próximo turno</label><input name="continuity" placeholder="O que a próxima equipe precisa fazer?"></div>
<div class="field full-field"><label>Observações adicionais</label><textarea name="notes" placeholder="Peças utilizadas, causa provável, testes, recomendações..."></textarea></div>
</div><div class="form-actions"><button type="reset" class="secondary">Limpar</button><button class="primary" type="submit">Salvar registro</button></div></form></section>`}

function historyPage() {
  let list = isManager()
    ? reports
    : reports.filter(r =>
        r.owner === currentUser.name ||
        r.type === currentUser.area
      );
  const machineOptions = [...new Set(list.map(r => r.machine))]
    .sort()
    .map(name =>
      `<option value="${esc(name)}">${esc(name)}</option>`
    ).join('');
  return `
    <div class="section-title">
      <h2>Histórico de manutenção</h2>
      <button class="secondary" id="export-history">
        Exportar CSV
      </button>
    </div>
    <section class="panel ai-panel">
      <h3>Análise do histórico da máquina</h3>
      <p class="muted">
        Selecione um equipamento para identificar ocorrências,
        pendências e tempo de parada registrados.
      </p>
      <div class="toolbar">
        <select id="history-machine-ai">
          <option value="">Selecione uma máquina</option>
          ${machineOptions}
        </select>
        <button class="primary" id="analyze-history-ai">
          Analisar histórico com IA
        </button>
      </div>
      <div id="history-ai-result" class="hidden"></div>
    </section>
    <div class="toolbar" style="margin-top:14px">
      <input id="history-search"
        placeholder="Filtrar por máquina, responsável ou problema...">
    </div>
    <section class="panel" id="history-table">
      ${historyTable(list)}
    </section>
  `;
}

function historyTable(list) { return table(['Data / hora', 'Máquina', 'Tipo', 'Problema', 'Procedimento', 'Resultado', 'Responsável', 'Continuidade'], list.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => `<tr><td>${new Date(r.date).toLocaleString('pt-BR')}</td><td>${esc(r.machine)}</td><td>${esc(r.type)}</td><td>${esc(r.problem)}</td><td>${esc(r.action)}</td><td>${statusTag(r.result)}</td><td>${esc(r.owner)}</td><td>${esc(r.continuity)}</td></tr>`).join('')) }
function maintenancePage() { return `<div class="section-title"><h2>Manutenções registradas</h2><button class="primary" data-go="report">＋ Novo registro</button></div><section class="panel">${table(['Máquina', 'Tipo', 'Data / hora', 'Responsável', 'Tempo parado', 'Resultado'], reports.slice().reverse().map(r => `<tr><td>${esc(r.machine)}</td><td>${esc(r.type)}</td><td>${new Date(r.date).toLocaleString('pt-BR')}</td><td>${esc(r.owner)}</td><td>${Number(r.downtime) || 0} h</td><td>${statusTag(r.result)}</td></tr>`).join(''))}</section>` }
function managementPage() { if (!isManager()) return '<section class="panel">Acesso não autorizado.</section>'; return `<div class="section-title"><h2>Painel de gestão</h2><button class="secondary" id="export-all">Exportar todos os registros (CSV)</button></div><div class="kpis">${kpi('Máquinas', machines.length, 'Cadastradas', 'blue')}${kpi('Registros', reports.length, 'Banco local', 'purple')}${kpi('Pendentes', reports.filter(r => !['Resolvido', 'Concluído'].includes(r.status)).length, 'Acompanhar', 'red')}${kpi('Horas paradas', reports.reduce((s, r) => s + (+r.downtime || 0), 0).toFixed(1), 'Horas informadas', 'orange')}</div><section class="panel"><h3>Base completa de registros</h3>${historyTable(reports)}</section><section class="panel" style="margin-top:12px"><h3>Máquinas cadastradas</h3>${machinesTable(machines)}</section>` }
function indicatorsPage() { if (!isManager()) return '<section class="panel">Acesso não autorizado.</section>'; let total = reports.length, resolved = reports.filter(r => ['Resolvido', 'Concluído'].includes(r.status)).length; return `<div class="section-title"><h2>Indicadores operacionais</h2></div><div class="kpis">${kpi('Taxa de resolução', total ? Math.round(resolved / total * 100) + '%' : '0%', 'Resolvidas / total', 'green')}${kpi('MTTR estimado', total ? (reports.reduce((s, r) => s + (+r.downtime || 0), 0) / Math.max(1, resolved)).toFixed(1) + ' h' : '0 h', 'Tempo informado / resolvidas', 'blue')}${kpi('Corretivas', reports.filter(r => r.type === 'Corretiva').length, 'Por tipo', 'red')}${kpi('Preventivas', reports.filter(r => r.type === 'Preventiva').length, 'Por tipo', 'yellow')}${kpi('Preditivas', reports.filter(r => r.type === 'Preditiva').length, 'Por tipo', 'purple')}${kpi('Pendências', total - resolved, 'Registros não resolvidos', 'orange')}</div><section class="panel"><h3>Distribuição por tipo</h3>${['Preditiva', 'Preventiva', 'Corretiva'].map(t => { let n = reports.filter(r => r.type === t).length; return `<div class="bar-row" style="grid-template-columns:100px 1fr 35px"><span>${t}</span><div class="bar"><span style="width:${total ? n / total * 100 : 0}%"></span></div><b>${n}</b></div>` }).join('')}<p class="muted">Observação: indicadores calculados com os dados demonstrativos e os registros locais. MTBF confiável exige datas de falha e horas de operação consistentes.</p></section>` }
function render() { const c = $('#page-content'); const pages = { dashboard, machines: machinesPage, occurrences: occurrencesPage, report: reportPage, history: historyPage, maintenance: maintenancePage, management: managementPage, indicators: indicatorsPage }; c.innerHTML = (pages[currentPage] || dashboard)(); c.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go))); bindPage() }
function bindPage() {
  const mf = $('#report-form'); if (mf) mf.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(mf).entries()); const machineName = d.machine.trim(); if (!machineName) return; let m = machines.find(x => x.name.toLowerCase() === machineName.toLowerCase()); if (!m) { m = { id: 'M-' + String(100 + machines.length + 1), name: machineName, sector: 'Não informado', status: d.status, type: d.type, owner: currentUser.name }; machines.push(m) } else { m.status = d.status; m.type = d.type; m.owner = currentUser.name } reports.push({ id: Date.now(), machine: machineName, type: d.type, date: new Date().toISOString(), owner: currentUser.name, problem: d.problem, action: d.action, result: d.result, status: d.status, shift: d.shift, downtime: Number(d.downtime) || 0, continuity: d.continuity, notes: d.notes }); save(); showToast('Registro salvo com sucesso!'); go('history') };
  const ms = $('#machine-search'), mst = $('#machine-status'); if (ms) { const filter = () => { let q = ms.value.toLowerCase(), s = mst.value; $('#machines-table').innerHTML = machinesTable(machines.filter(m => (m.name + ' ' + m.sector + ' ' + m.id).toLowerCase().includes(q) && (!s || m.status === s))); bindMachineLinks() }; ms.oninput = filter; mst.onchange = filter; bindMachineLinks() }
  const os = $('#occ-search'), ost = $('#occ-status'); if (os) { const filter = () => { let q = os.value.toLowerCase(), s = ost.value, list = (isManager() ? reports : reports.filter(r => r.owner === currentUser.name || r.type === currentUser.area)).filter(r => (r.machine + ' ' + r.problem + ' ' + r.owner).toLowerCase().includes(q) && (!s || r.status === s)); $('#occ-table').innerHTML = table(['Máquina', 'Problema', 'Tipo', 'Data / hora', 'Turno', 'Status', 'Responsável'], list.slice().reverse().map(r => `<tr><td>${esc(r.machine)}</td><td>${esc(r.problem)}</td><td>${esc(r.type)}</td><td>${new Date(r.date).toLocaleString('pt-BR')}</td><td>${esc(r.shift)}</td><td>${statusTag(r.status)}</td><td>${esc(r.owner)}</td></tr>`).join('')) }; os.oninput = filter; ost.onchange = filter }
  const hs = $('#history-search'); if (hs) hs.oninput = () => { let q = hs.value.toLowerCase(), list = (isManager() ? reports : reports.filter(r => r.owner === currentUser.name || r.type === currentUser.area)).filter(r => Object.values(r).join(' ').toLowerCase().includes(q)); $('#history-table').innerHTML = historyTable(list) };
  const ex = $('#export-history'); if (ex) ex.onclick = () => exportCSV((isManager() ? reports : reports.filter(r => r.owner === currentUser.name || r.type === currentUser.area)), 'historico-manutencao.csv'); const ea = $('#export-all'); if (ea) ea.onclick = () => exportCSV(reports, 'turno-conectado-registros.csv')

  const analyzeHistoryBtn = $('#analyze-history-ai');

  if (analyzeHistoryBtn) {
    analyzeHistoryBtn.onclick = () => {
      const selector = $('#history-machine-ai');
      const resultBox = $('#history-ai-result');
      const machineName = selector.value;

      if (!machineName) {
        showToast('Selecione uma máquina primeiro.');
        return;
      }

      const machineReports = reports.filter(
        r => r.machine === machineName
      );

      const resolved = machineReports.filter(
        r => /resolvido|concluído/i.test(r.status || r.result || '')
      );

      const pending = machineReports.filter(
        r => !/resolvido|concluído/i.test(r.status || r.result || '')
      );

      const downtime = machineReports.reduce(
        (sum, r) => sum + (Number(r.downtime) || 0), 0
      );

      const problems = machineReports
        .map(r => r.problem)
        .filter(Boolean);

      const recommendations = [];

      if (pending.length) {
        recommendations.push(
          `Verificar ${pending.length} ocorrência(s) ainda não resolvida(s).`
        );
      }

      if (downtime > 0) {
        recommendations.push(
          `Investigar as causas das ${downtime.toFixed(1)} horas de parada registradas.`
        );
      }

      if (problems.some(p => /sensor/i.test(p))) {
        recommendations.push(
          'Verificar sensores, conexões elétricas e sinais de leitura.'
        );
      }

      if (problems.some(p => /temperatura|superaquecimento/i.test(p))) {
        recommendations.push(
          'Revisar o sistema de refrigeração e as medições de temperatura.'
        );
      }

      if (problems.some(p => /ruído|vibração/i.test(p))) {
        recommendations.push(
          'Inspecionar fixações, alinhamento e componentes sujeitos a desgaste.'
        );
      }

      if (problems.some(p => /pressão|vazamento/i.test(p))) {
        recommendations.push(
          'Verificar filtros, conexões e possíveis vazamentos.'
        );
      }

      if (!recommendations.length) {
        recommendations.push(
          'Manter as inspeções preventivas e registrar os resultados dos próximos testes.'
        );
      }

      resultBox.innerHTML = `
        <div class="panel ai-result">
          <h3>Resultado da análise: ${esc(machineName)}</h3>

          <div class="split">
            <div class="mini-stat">
              <small>Ocorrências registradas</small>
              <b>${machineReports.length}</b>
            </div>
            <div class="mini-stat">
              <small>Resolvidas</small>
              <b>${resolved.length}</b>
            </div>
            <div class="mini-stat">
              <small>Pendentes</small>
              <b>${pending.length}</b>
            </div>
            <div class="mini-stat">
              <small>Tempo de parada</small>
              <b>${downtime.toFixed(1)} h</b>
            </div>
          </div>

          <h3 style="margin-top:18px">Recomendações</h3>
          <ul>
            ${recommendations.map(item => `<li>${esc(item)}</li>`).join('')}
          </ul>

          <p class="muted">
            Análise automática baseada nos registros disponíveis.
            Confirme as recomendações com a equipe técnica antes de
            executar qualquer intervenção.
          </p>
        </div>
      `;

      resultBox.classList.remove('hidden');
    };
  }

}
function bindMachineLinks() { $$('[data-machine-history]').forEach(b => b.onclick = () => { const name = b.dataset.machineHistory; go('history'); setTimeout(() => { const h = $('#history-search'); if (h) { h.value = name; h.dispatchEvent(new Event('input')) } }, 0) }) }
function exportCSV(data, filename) {
  if (!isManager() && currentPage !== 'history') {
    showToast('Sem permissão para exportar.');
    return;
  }
  if (!data || !data.length) {
    showToast('Não há dados para exportar.');
    return;
  }
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(';'),
    ...data.map(row =>
      keys.map(key =>
        '"' + String(row[key] ?? '').replace(/"/g, '""') + '"'
      ).join(';')
    )
  ].join('\r\n');
  const blob = new Blob(
    ['\ufeff' + csv],
    { type: 'text/csv;charset=utf-8;' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('Arquivo CSV exportado!');
}
});

resizer.addEventListener("pointermove", (event) => {
  if (!redimensionando) return;

  const largura = event.clientX - sidebar.getBoundingClientRect().left;

  sidebar.style.width =
    Math.max(180, Math.min(360, largura)) + "px";
});

function pararRedimensionamento() {
  redimensionando = false;
  document.body.style.userSelect = "";
}

resizer.addEventListener("pointerup", pararRedimensionamento);
resizer.addEventListener("pointercancel", pararRedimensionamento);
}

/* Assistente de análise do Turno Conectado */
function analisarRelatoComAssistente(relato) {
  const texto = String(relato || '').trim();

  if (!texto) {
    alert('Escreva o relato do técnico antes de analisar.');
    return;
  }

  const sugestoes = [];

  if (/sensor/i.test(texto)) {
    sugestoes.push(
      'Sensor: verificar alimentação, conexões, cabeamento e sinal.'
    );
  }

  if (/temperatura|superaquecimento/i.test(texto)) {
    sugestoes.push(
      'Temperatura: verificar refrigeração, ventilação e leituras.'
    );
  }

  if (/vibração|ruído/i.test(texto)) {
    sugestoes.push(
      'Ruído ou vibração: avaliar fixações, alinhamento e rolamentos.'
    );
  }

  if (/vazamento|pressão/i.test(texto)) {
    sugestoes.push(
      'Pressão: verificar filtros, conexões e possíveis vazamentos.'
    );
  }

  if (sugestoes.length === 0) {
    sugestoes.push(
      'Registrar sintomas, testes realizados, resultados e causa confirmada.'
    );
  }

  return [
    'RELATO DO TÉCNICO',
    texto,
    '',
    'PONTOS PARA VERIFICAÇÃO',
    ...sugestoes.map((item, i) => `${i + 1}. ${item}`),
    '',
    'IMPORTANTE: sugestões automáticas. Confirme os resultados com a equipe técnica.'
  ].join('\n');
}
