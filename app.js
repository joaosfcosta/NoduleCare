(function () {
  'use strict';
  const {getPlan, makeSchedule} = window.FleischnerLogic;
  const $ = (id) => document.getElementById(id);
  const baselineInput = $('baseline-date');
  const riskSection = $('risk-section');
  const componentSection = $('solid-component-section');
  const componentInput = $('solid-component');
  const recommendationPanel = $('recommendation-panel');
  let targetOverrides = {};
  let previousSignature = '';
  let toastTimer = null;
  let lastRendered = null;

  const monthFormatter = new Intl.DateTimeFormat('pt-PT', {month:'long',year:'numeric',timeZone:'UTC'});
  const monthShortFormatter = new Intl.DateTimeFormat('pt-PT', {month:'short',year:'numeric',timeZone:'UTC'});
  const formatMonth = (iso, short = false) => {
    if(!iso || !/^\d{4}-\d{2}$/.test(iso)) return '—';
    const [y,m] = iso.split('-').map(Number);
    return (short ? monthShortFormatter : monthFormatter).format(new Date(Date.UTC(y,m-1,1)));
  };
  const esc = (text) => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const selected = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const getSelection = () => ({
    morph: selected('morphology'), size: selected('size'), number: selected('number'),
    risk: selected('morphology') === 'solid' ? selected('risk') : null, component: componentInput.value
  });

  function tagsFor(state){
    const morphology = {solid:'Sólido',partsolid:'Parcialmente sólido',groundglass:'Vidro despolido puro'};
    const size = {small:'<6 mm',medium:'6–8 mm',large:'>8 mm'};
    const labels = [morphology[state.morph],size[state.size],state.number === 'single' ? 'Solitário' : 'Múltiplos'];
    if (state.morph === 'solid') labels.push(state.risk === 'high' ? 'Alto risco' : 'Baixo risco');
    if(state.morph === 'partsolid' && state.size !== 'small') labels.push(state.component === 'under6' ? 'Componente sólida <6 mm' : state.component === 'atleast6' ? 'Componente sólida ≥6 mm' : 'Componente sólida desconhecida');
    return labels.map(label => `<span class="selection-tag">${esc(label)}</span>`).join('');
  }

  function monthRange(from,to){
    return from === to ? formatMonth(from) : `${formatMonth(from)} — ${formatMonth(to)}`;
  }

  function showToast(message){
    const toast = $('toast');
    toast.textContent=message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  function renderTimeline(schedule, baseline, empty){
    const timeline = $('timeline');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    let html = '';
    if(!/^\d{4}-\d{2}$/.test(baseline)){
      timeline.innerHTML = '<div class="timeline-empty"><div class="timeline-empty-icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg></div><h3>Selecione o mês e o ano da TC inicial</h3><p>O calendário será calculado automaticamente.</p></div>';
      $('schedule-count').textContent = '—';
      return;
    }

    html += `<div class="timeline-event"><span class="timeline-marker"><svg viewBox="0 0 14 14"><path d="m3 7 3 3 5-6"/></svg></span><div class="timeline-main"><div class="timeline-top"><h3>TC inicial</h3><span class="event-badge">Exame de referência</span></div><p class="event-window">${esc(formatMonth(baseline))}</p><p class="event-detail">Ponto de partida para o cálculo da vigilância.</p></div></div>`;

    if(schedule.length === 0){
      html += `<div class="timeline-event"><span class="timeline-marker"></span><div class="timeline-main"><div class="timeline-top"><h3>Seguimento</h3></div><p class="event-detail" style="margin-top:10px">${esc(empty)}</p></div></div>`;
    }
    for(const [index,event] of schedule.entries()) {
      let badge = 'TC de controlo', badgeClass = '';
      if(event.flag === 'optional') {badge='Opcional';badgeClass='optional';}
      if(event.flag === 'conditional') {badge='Se estável';badgeClass='conditional';}
      if(event.flag === 'decision') {badge='Decisão clínica';badgeClass='optional';}
      const pastText = event.to < currentMonth ? 'Janela temporal já decorrida — confirmar exames entretanto realizados.' : '';
      const targetInput = event.flag === 'decision' ? '' :
        `<div class="event-target"><label for="target-${esc(event.id)}">Mês escolhido</label><input id="target-${esc(event.id)}" type="month" data-event-id="${esc(event.id)}" min="${esc(event.from)}" max="${esc(event.to)}" value="${esc(event.target)}" aria-label="Mês selecionado para ${esc(event.title)}"></div>`;
      html += `<div class="timeline-event"><span class="timeline-marker"></span><div class="timeline-main"><div class="timeline-top"><h3>${esc(event.title)}</h3><span class="event-badge ${badgeClass}">${badge}</span></div><p class="event-window">${esc(monthRange(event.from,event.to))}</p><p class="event-detail">${esc(event.detail)}${pastText ? `<br><strong>${esc(pastText)}</strong>` : ''}</p>${targetInput}</div></div>`;
    }
    timeline.innerHTML=html;
    $('schedule-count').textContent=`${schedule.length} ${schedule.length === 1 ? 'marco' : 'marcos'}`;
    timeline.querySelectorAll('input[data-event-id]').forEach(input => input.addEventListener('change', e => {
      const {eventId} = e.target.dataset;
      targetOverrides[eventId] = e.target.value;
      render(true);
    }));
  }

  function renderPrintReport({state,plan,schedule,baseline}){
    const morphologies={solid:'Sólido',partsolid:'Parcialmente sólido',groundglass:'Não sólido (vidro despolido puro)'};
    const dimensions={small:'<6 mm',medium:'6–8 mm',large:'>8 mm'};
    const validBaseline=/^\d{4}-(0[1-9]|1[0-2])$/.test(baseline);
    const fields=[
      ['Morfologia',morphologies[state.morph]],
      ['Dimensão média',dimensions[state.size]],
      ['Número de nódulos',state.number==='single'?'Solitário':'Múltiplos']
    ];
    if(state.morph==='solid') fields.push(['Estratificação de risco',state.risk==='high'?'Alto risco':'Baixo risco']);
    if(state.morph==='partsolid' && state.size!=='small') fields.push(['Componente sólida',state.component==='under6'?'<6 mm':state.component==='atleast6'?'≥6 mm':'Não caracterizada']);

    $('print-parameters').innerHTML=fields.map(([label,value]) =>
      `<div class="report-parameter"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
    $('print-baseline').textContent=validBaseline?formatMonth(baseline):'Não indicada';
    $('print-created').textContent=new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'long',year:'numeric'}).format(new Date());
    $('print-status').textContent=plan.status;
    $('print-title').textContent=plan.title;
    $('print-description').textContent=plan.description;
    const recommendation=$('print-title').closest('.report-recommendation');
    recommendation.dataset.tone=plan.tone;
    const notice=$('print-notice');
    notice.hidden=!plan.notice;
    notice.textContent=plan.notice;

    const badges={optional:'Opcional',conditional:'Condicional',decision:'Decisão clínica',required:'Recomendado'};
    const rows=validBaseline?
      `<tr><td><strong>TC inicial</strong></td><td>${esc(formatMonth(baseline))}</td><td>—</td><td>Referência</td></tr>`:'';
    $('print-schedule').innerHTML=rows+schedule.map(event=>
      `<tr><td><strong>${esc(event.title)}</strong></td><td>${esc(monthRange(event.from,event.to))}</td><td>${event.flag==='decision'?'—':esc(formatMonth(event.target))}</td><td>${esc(badges[event.flag]||'Recomendado')}</td></tr>`).join('');
    const empty=$('print-empty');
    empty.hidden=!!schedule.length && validBaseline;
    empty.textContent=!validBaseline?'Indique o mês e o ano da TC inicial para calcular as datas de controlo.':plan.empty;
  }

  function render(preserve = false){
    const state = getSelection();
    riskSection.classList.toggle('hidden',state.morph !== 'solid');
    componentSection.classList.toggle('hidden',state.morph !== 'partsolid' || state.size === 'small');
    $('multiple-hint').hidden = state.number !== 'multiple';
    const baseline = baselineInput.value;
    const signature = `${state.morph}|${state.size}|${state.number}|${state.risk}|${state.component}|${baseline}`;
    if(!preserve && signature !== previousSignature) targetOverrides = {};
    previousSignature = signature;

    const plan = getPlan(state);
    const schedule = makeSchedule(plan.events,baseline,targetOverrides);
    recommendationPanel.dataset.tone = plan.tone;
    $('plan-status').className='recommendation-status'+(plan.tone === 'warning'?' warning':plan.tone === 'critical'?' critical':'');
    $('plan-status').textContent=plan.status;
    $('recommendation-title').textContent=plan.title;
    $('recommendation-description').textContent=plan.description;
    $('selection-tags').innerHTML=tagsFor(state);

    const notice = plan.notice;
    const noticeBox=$('clinical-notice');
    noticeBox.classList.toggle('hidden',!notice);
    noticeBox.classList.toggle('critical',plan.tone==='critical');
    noticeBox.textContent=notice;
    renderTimeline(schedule,baseline,plan.empty);
    lastRendered={state,plan,schedule,baseline};
    renderPrintReport(lastRendered);
  }

  function describePlan({state,plan,schedule,baseline}){
    const type = {solid:'Sólido',partsolid:'Parcialmente sólido',groundglass:'Vidro despolido puro'}[state.morph];
    const size = {small:'<6 mm',medium:'6–8 mm',large:'>8 mm'}[state.size];
    const lines=[
      'CONTROLO EVOLUTIVO DE NÓDULOS PULMONARES — FLEISCHNER 2017',
      `TC inicial: ${formatMonth(baseline)}`,
      `Tipo: ${type}; dimensão: ${size}; ${state.number === 'single' ? 'solitário' : 'múltiplos'}${state.morph === 'solid' ? '; ' + (state.risk === 'high' ? 'alto risco' : 'baixo risco') : ''}.`
    ];
    if(state.morph === 'partsolid' && state.size !== 'small' && state.number === 'single'){
      lines.push('Componente sólida: '+(state.component === 'atleast6'?'≥6 mm':state.component==='under6'?'<6 mm':'não caracterizada'));
    }
    lines.push('',`Recomendação: ${plan.title}.`,plan.description);
    if(plan.notice) lines.push(`Nota: ${plan.notice}`);
    lines.push('', 'CALENDÁRIO (janelas a partir da TC inicial)');
    if(!schedule.length) lines.push(plan.empty);
    for(const item of schedule){
      const flag = item.flag==='optional'?' [opcional]':item.flag==='conditional'?' [se persistente/estável]':item.flag==='decision'?' [decisão clínica]':'';
      lines.push(`- ${item.title}: ${monthRange(item.from,item.to)}${flag}${item.flag !== 'decision' ? '; mês escolhido: '+formatMonth(item.target) : ''}`);
    }
    lines.push('','Datas orientadoras; reavaliar perante crescimento ou mudança morfológica.',
      'Fora do âmbito: idade <35 anos, TC de rastreio, imunossupressão, neoplasia primária conhecida.',
      'MacMahon H et al. Radiology. 2017;284:228–243. doi:10.1148/radiol.2017161659');
    return lines.join('\n');
  }

  baselineInput.value=`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  document.querySelectorAll('input[type=radio]').forEach(input => input.addEventListener('change',() => render()));
  componentInput.addEventListener('change',()=>render());
  baselineInput.addEventListener('change',()=>render());
  $('copy-plan').addEventListener('click',async () => {
    if(!lastRendered) return;
    try{await navigator.clipboard.writeText(describePlan(lastRendered));showToast('Plano copiado para a área de transferência.');}
    catch{showToast('Não foi possível copiar. Utilize a opção Imprimir.');}
  });
  $('print-plan').addEventListener('click',async () => {
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(baselineInput.value)) {
      showToast('Indique a data da TC inicial antes de exportar.');
      baselineInput.focus();
      return;
    }
    if (!lastRendered) return;
    const {state,plan,schedule,baseline} = lastRendered;
    const today = new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
    const sections = [
      {heading:'Características do nódulo',lines:[
        `TC inicial: ${formatMonth(baseline)}.`,
        `Morfologia: ${state.morph === 'solid' ? 'Sólido' : state.morph === 'partsolid' ? 'Parcialmente sólido' : 'Vidro despolido puro'}.`,
        `Dimensão: ${state.size === 'small' ? '<6 mm' : state.size === 'medium' ? '6-8 mm' : '>8 mm'}.`,
        `Número: ${state.number === 'single' ? 'Solitário' : 'Múltiplos'}.`,
        ...(state.morph === 'solid' ? [`Estratificação: ${state.risk === 'high' ? 'Alto risco' : 'Baixo risco'}.`] : []),
        ...(state.morph === 'partsolid' ? [`Componente sólida: ${state.component === 'atleast6' ? '>=6 mm' : state.component === 'under6' ? '<6 mm' : 'não caracterizada'}.`] : [])
      ]},
      {heading:'Recomendação',lines:[plan.title,plan.description,...(plan.notice?[plan.notice]:[])]},
      {heading:'Calendário de vigilância',lines: schedule.length ? schedule.map(event =>
        `${event.title}: ${monthRange(event.from,event.to)}${event.flag === 'optional' ? ' (opcional)' : event.flag === 'conditional' ? ' (condicional)' : event.flag === 'decision' ? ' (decisão clínica)' : ''}${event.flag !== 'decision' ? '; mês escolhido: ' + formatMonth(event.target) : ''}.`) : [plan.empty]},
      {heading:'Notas e referência',lines:[
        'As datas são orientadoras; reavaliar perante crescimento ou alteração morfológica.',
        'Fora do âmbito: idade inferior a 35 anos, TC de rastreio, imunossupressão ou neoplasia primária conhecida.',
        'MacMahon H et al. Radiology. 2017;284:228-243. DOI: 10.1148/radiol.2017161659.',
        'Ferramenta de apoio à decisão. Não substitui o juízo clínico.'
      ]}
    ];
    const button = $('print-plan');
    button.disabled = true;
    try {
      await window.createClinicalPDF({title:'NoduleCare - Plano de vigilância',subtitle:`Fleischner Society 2017 | Emitido em ${today}`,sections,filename:'NoduleCare-plano.pdf',logo:'./icons/icon-192.png'});
      showToast('PDF gerado. Consulte as transferências ou a app Ficheiros.');
    } catch(error) {
      console.error('Falha ao gerar PDF',error);
      showToast('Não foi possível gerar o PDF. Tente abrir a app no Safari.');
    } finally { button.disabled = false; }
  });
  render();
})();
