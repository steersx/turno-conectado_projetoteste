{
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const waitForApp = () => {
    if (!$('#sidebar') || !$('#user-menu') || typeof window === 'undefined') return;
    init();
  };
  function init() {
    const sidebar = $('#sidebar');
    const menuBtn = $('#menu-toggle');
    const userBtn = $('#user-menu');
    let backdrop = $('.tc-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'tc-drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }
    const closeDrawer = () => { sidebar.classList.remove('open'); backdrop.classList.remove('show'); };
    const openDrawer = () => { sidebar.classList.add('open'); backdrop.classList.add('show'); };
    if (menuBtn) menuBtn.addEventListener('click', e => {
      e.preventDefault();
      sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
    });
    backdrop.addEventListener('click', closeDrawer);
    $('#nav')?.addEventListener('click', e => { if (e.target.closest('[data-page]')) closeDrawer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeUserMenu(); closeModal(); } });

    // Perfil e sair no menu do usuário
    userBtn.classList.add('tc-user-wrap');
    userBtn.setAttribute('aria-haspopup', 'true');
    userBtn.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div');
    menu.className = 'tc-user-menu hidden';
    menu.innerHTML = `<div class="tc-menu-caption">Conta e preferências</div>
      <button type="button" data-tc-profile>👤 &nbsp; Meu perfil</button>
      <button type="button" data-tc-ai>✦ &nbsp; Assistente inteligente</button>
      <button type="button" data-tc-logout>↪ &nbsp; Sair do sistema</button>`;
    userBtn.parentElement.style.position = 'relative';
    userBtn.insertAdjacentElement('afterend', menu);
    function closeUserMenu() { menu.classList.add('hidden'); userBtn.setAttribute('aria-expanded','false'); }
    userBtn.addEventListener('click', e => {
      e.preventDefault();
      const open = menu.classList.toggle('hidden') === false;
      userBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => {
      if (!userBtn.contains(e.target) && !menu.contains(e.target)) closeUserMenu();
    });
    menu.addEventListener('click', e => {
      if (e.target.closest('[data-tc-profile]')) { closeUserMenu(); openProfile(); }
      if (e.target.closest('[data-tc-ai]')) { closeUserMenu(); openAI(); }
      if (e.target.closest('[data-tc-logout]')) {
        closeUserMenu();
        // Reutiliza a ação de logout existente no app
        $('#logout-btn')?.click();
      }
    });

    // Ferramentas extras na tela de indicadores
    const observer = new MutationObserver(() => {
      if ($('#page-content') && !$('#page-content').querySelector('[data-tc-tools]') &&
          $('#page-content').textContent.includes('Indicadores operacionais')) {
        const tools = document.createElement('div');
        tools.className = 'tc-tools tc-no-print';
        tools.dataset.tcTools = '1';
        tools.innerHTML = `<button class="tc-primary" data-tc-csv>⬇ Baixar indicadores (CSV)</button>
          <button data-tc-print>▤ Relatório visual / Salvar em PDF</button>
          <button data-tc-ai>✦ Analisar indicadores</button>`;
        $('#page-content').prepend(tools);
      }
    });
    observer.observe($('#page-content'), {childList:true, subtree:true});
    $('#page-content')?.addEventListener('click', e => {
      if (e.target.closest('[data-tc-csv]')) exportIndicators();
      if (e.target.closest('[data-tc-print]')) printIndicators();
      if (e.target.closest('[data-tc-ai]')) openAI();
    });
    // Também adiciona atalhos no painel de gestão
    document.addEventListener('click', e => {
      if (e.target.closest('[data-tc-ai-open]')) openAI();
    });
    window.addEventListener('resize', () => { if (innerWidth > 650) { closeDrawer(); sidebar.style.width = ''; } });
  }

  let modalBackdrop = null;
  function closeModal() { if (modalBackdrop) { modalBackdrop.remove(); modalBackdrop = null; } }
  function showModal(title, body, onReady) {
    closeModal();
    modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'tc-modal-backdrop';
    modalBackdrop.innerHTML = `<section class="tc-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="tc-modal-head"><h2>${esc(title)}</h2></div>${body}</section>`;
    modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
    document.body.appendChild(modalBackdrop);
    onReady?.(modalBackdrop);
  }
  function currentUserData() {
    const name = $('#user-name')?.textContent?.trim() || 'Usuário';
    const role = $('#user-role')?.textContent?.trim() || 'Não informado';
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('tc_profile_' + name) || '{}'); } catch {}
    return { name, role, profile };
  }
  function openProfile() {
    const u = currentUserData();
    showModal('Meu perfil', `<form id="tc-profile-form">
      <p class="muted">Os dados complementares ficam salvos apenas neste navegador.</p>
      <label>Nome completo</label><input name="name" value="${esc(u.profile.name || u.name)}" required>
      <label>Função / perfil</label><input value="${esc(u.role)}" disabled>
      <label>E-mail</label><input name="email" type="email" value="${esc(u.profile.email || '')}" placeholder="seuemail@empresa.com">
      <label>Telefone / ramal</label><input name="phone" value="${esc(u.profile.phone || '')}" placeholder="(00) 00000-0000">
      <label>Área</label><input name="area" value="${esc(u.profile.area || '')}" placeholder="Ex.: Manutenção preventiva">
      <div class="tc-modal-actions"><button type="button" class="tc-action" data-tc-cancel>Cancelar</button><button class="primary" type="submit">Salvar perfil</button></div>
      </form>`, modal => {
        modal.querySelector('[data-tc-cancel]').onclick = closeModal;
        modal.querySelector('form').onsubmit = e => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget).entries());
          localStorage.setItem('tc_profile_' + u.name, JSON.stringify(data));
          // O nome visível é atualizado sem alterar a identidade/autorização em memória.
          if ($('#user-name')) $('#user-name').textContent = data.name;
          if ($('#welcome h1')) $('#welcome h1').textContent = 'Olá, ' + data.name + '!';
          closeModal(); toast('Perfil salvo neste navegador.');
        };
      });
  }
  function toast(msg) {
    const t = $('#toast');
    if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800); }
  }
  function appData() {
    // app.js usa variáveis locais; para manter compatibilidade, lê a base do localStorage.
    const parse = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
    const machines = parse('tc_machines', []);
    const reports = parse('tc_reports', []);
    return { machines, reports };
  }
  function csvDownload(rows, filename) {
    if (!rows.length) { toast('Não há dados para exportar.'); return; }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(';'), ...rows.map(row => keys.map(k => '"' + String(row[k] ?? '').replace(/"/g,'""') + '"').join(';'))].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Arquivo preparado para baixar.');
  }
  function exportIndicators() {
    const { machines, reports } = appData();
    const resolved = reports.filter(r => /resolvido|concluído/i.test(r.status || r.result || '')).length;
    const downtime = reports.reduce((sum,r) => sum + (Number(r.downtime)||0),0);
    const types = ['Corretiva','Preventiva','Preditiva'];
    const rows = [
      {indicador:'Máquinas cadastradas', valor:machines.length, unidade:'máquinas'},
      {indicador:'Total de registros', valor:reports.length, unidade:'registros'},
      {indicador:'Registros resolvidos/concluídos', valor:resolved, unidade:'registros'},
      {indicador:'Taxa de resolução', valor:reports.length ? (resolved/reports.length*100).toFixed(1) : '0.0', unidade:'%'},
      {indicador:'Tempo de parada registrado', valor:downtime.toFixed(1), unidade:'horas'},
      ...types.map(type => ({indicador:'Manutenções ' + type.toLowerCase(), valor:reports.filter(r=>r.type===type).length, unidade:'registros'})),
      {indicador:'Gerado em', valor:new Date().toLocaleString('pt-BR'), unidade:''}
    ];
    csvDownload(rows, 'turno-conectado-indicadores.csv');
  }
  function printIndicators() {
    const { machines, reports } = appData();
    const resolved = reports.filter(r => /resolvido|concluído/i.test(r.status || r.result || '')).length;
    const downtime = reports.reduce((sum,r) => sum + (Number(r.downtime)||0),0);
    const typeRows = ['Corretiva','Preventiva','Preditiva'].map(type => `<tr><td>${type}</td><td>${reports.filter(r=>r.type===type).length}</td></tr>`).join('');
    const pending = reports.filter(r => !/resolvido|concluído/i.test(r.status || r.result || '')).length;
    const html = `<div id="tc-print-report"><div class="tc-no-print" style="margin-bottom:18px"><button onclick="window.print()">Imprimir / Salvar como PDF</button> <button onclick="this.closest('#tc-print-report').remove()">Fechar relatório</button></div>
      <h1>Turno Conectado</h1><h2>Relatório de indicadores operacionais</h2><p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <hr><h3>Resumo</h3><p><b>Máquinas cadastradas:</b> ${machines.length}</p><p><b>Registros de manutenção:</b> ${reports.length}</p>
      <p><b>Resolvidos/concluídos:</b> ${resolved} (${reports.length?(resolved/reports.length*100).toFixed(1):'0.0'}%)</p>
      <p><b>Pendências:</b> ${pending}</p><p><b>Tempo de parada registrado:</b> ${downtime.toFixed(1)} h</p>
      <h3>Registros por tipo</h3><table><thead><tr><th>Tipo</th><th>Quantidade</th></tr></thead><tbody>${typeRows}</tbody></table>
      <h3>Registros detalhados</h3><table><thead><tr><th>Data</th><th>Máquina</th><th>Tipo</th><th>Problema</th><th>Status</th><th>Parada (h)</th></tr></thead><tbody>
      ${reports.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.machine||'')}</td><td>${esc(r.type||'')}</td><td>${esc(r.problem||'')}</td><td>${esc(r.status||r.result||'')}</td><td>${Number(r.downtime)||0}</td></tr>`).join('')}
      </tbody></table><p><small>Indicadores calculados com os dados armazenados localmente. A qualidade depende da consistência dos registros.</small></p></div>`;
    let old = $('#tc-print-report'); old?.remove();
    const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild);
    toast('Relatório pronto. Escolha “Salvar como PDF” na janela de impressão.');
    setTimeout(() => window.print(), 300);
  }

  function openAI() {
    const { machines, reports } = appData();
    const pending = reports.filter(r => !/resolvido|concluído/i.test(r.status || r.result || ''));
    const downtimeByMachine = {};
    reports.forEach(r => { const key = r.machine || 'Sem máquina'; downtimeByMachine[key] = (downtimeByMachine[key]||0) + (Number(r.downtime)||0); });
    const topDowntime = Object.entries(downtimeByMachine).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const typeCounts = ['Corretiva','Preventiva','Preditiva'].map(t=>[t,reports.filter(r=>r.type===t).length]);
    const commonTerms = {};
    reports.forEach(r => {
      const text = `${r.problem||''} ${r.notes||''}`.toLocaleLowerCase('pt-BR');
      ['sensor','temperatura','superaquecimento','vibração','ruído','pressão','vazamento','motor','elétrica','lubrificação'].forEach(term => {
        if (text.includes(term)) commonTerms[term] = (commonTerms[term]||0)+1;
      });
    });
    const patterns = Object.entries(commonTerms).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const recommendations = [];
    if (pending.length) recommendations.push(`Priorizar ${pending.length} registro(s) ainda não resolvido(s), confirmando responsável, prazo e passagem de turno.`);
    if (topDowntime[0]?.[1] > 0) recommendations.push(`Revisar a máquina ${topDowntime[0][0]}, que acumula ${topDowntime[0][1].toFixed(1)} h de parada nos registros atuais.`);
    if (typeCounts.find(x=>x[0]==='Corretiva')[1] > typeCounts.find(x=>x[0]==='Preventiva')[1]) recommendations.push('Há mais registros corretivos do que preventivos: avalie reforçar inspeções preventivas e análise de causa-raiz.');
    if (patterns.length) recommendations.push(`Termos recorrentes nos relatos: ${patterns.map(x=>`${x[0]} (${x[1]})`).join(', ')}. Verifique se representam falhas repetidas.`);
    if (!recommendations.length) recommendations.push('A base ainda tem poucos sinais de alerta. Continue registrando falhas, duração da parada, causa-raiz e ação tomada.');
    const analysis = `Resumo dos dados\n• Máquinas cadastradas: ${machines.length}\n• Registros analisados: ${reports.length}\n• Pendências: ${pending.length}\n• Horas de parada: ${reports.reduce((s,r)=>s+(Number(r.downtime)||0),0).toFixed(1)} h\n\nPadrões observados\n${patterns.length ? patterns.map(x=>`• ${x[0]}: citado em ${x[1]} registro(s)`).join('\n') : '• Ainda não há termos recorrentes claros nos relatos.'}\n\nSugestões de ação\n${recommendations.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nLimite: esta é uma análise automática por regras e palavras-chave, não um modelo generativo. Confirme as hipóteses com a equipe técnica antes de intervir em equipamentos.`;
    showModal('Assistente inteligente · Análise local', `<div class="tc-ai-card"><div class="tc-ai-result">${esc(analysis)}</div></div>
      <p class="muted">A análise é feita no navegador com os dados locais. Não envia dados para serviços externos.</p>
      <div class="tc-modal-actions"><button class="tc-action" data-tc-copy>Copiar análise</button><button class="primary" data-tc-close>Concluir</button></div>`, modal => {
        modal.querySelector('[data-tc-close]').onclick = closeModal;
        modal.querySelector('[data-tc-copy]').onclick = () => {
          navigator.clipboard?.writeText(analysis).then(()=>toast('Análise copiada.')).catch(()=>toast('Não foi possível copiar automaticamente.'));
        };
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForApp);
  else waitForApp();
})();

