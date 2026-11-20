/* Fleischner Society 2017, MacMahon et al., Radiology 284:228–243.
 * The guidance deliberately does not turn judgment-dependent decisions into
 * mandatory imaging appointments. All month offsets refer to baseline CT.
 */
(function (root) {
  'use strict';

  const ct = (id, min, max, title, detail, flag = 'required') => ({id, min, max, title, detail, flag});
  const common = 'Se o achado persistir e não apresentar crescimento nem alterações suspeitas.';
  const plan = (title, description, events = [], options = {}) => ({
    title, description, events, tone: options.tone || 'normal', status: options.status || 'FLEISCHNER 2017',
    notice: options.notice || '', empty: options.empty || 'Não é recomendado controlo tomográfico de rotina neste cenário.'
  });

  function getPlan({morph, size, number, risk, component = 'unknown', exclusions = []}) {
    if (exclusions.length) {
      return plan('Guideline não aplicável',
        'Este contexto exige uma estratégia individualizada e não deve ser gerido automaticamente com a tabela Fleischner 2017.', [], {
          tone: 'critical', status: 'FORA DO ÂMBITO',
          notice: 'Critérios assinalados: ' + exclusions.join('; ') + '. Utilize o protocolo adequado e avaliação especializada.',
          empty: 'Nenhum calendário foi gerado: o contexto clínico está fora do âmbito de aplicação.'
        });
    }

    const isMultiple = number === 'multiple';
    const isHigh = risk === 'high';
    const isSmall = size === 'small';
    const isSolid = morph === 'solid';

    if (isSolid) {
      if (isSmall) {
        if (!isHigh) return plan('Sem seguimento de rotina', 'Nódulo(s) sólido(s) <6 mm em doente de baixo risco: não é recomendada TC de vigilância de rotina.');
        return plan('Considerar TC aos 12 meses',
          'O controlo aos 12 meses é opcional, sobretudo quando existem características morfológicas suspeitas ou localização nos lobos superiores.',
          [ct('solid-small-option', 12, 12, 'TC opcional', 'Reavaliar a necessidade segundo o perfil de risco e as características do nódulo.', 'optional')],
          {tone: 'warning', status: 'SEGUIMENTO OPCIONAL'});
      }
      if (size === 'medium') {
        const start = isMultiple ? [3, 6] : [6, 12];
        const first = ct('solid-initial', start[0], start[1], 'Primeira TC de controlo',
          isMultiple ? 'Tomar como referência o nódulo mais suspeito.' : 'Comparar dimensões e morfologia com a TC inicial.');
        const second = ct('solid-late', 18, 24, 'Segunda TC de controlo',
          'Considerar se persistir estável e de acordo com o risco clínico.', isHigh ? 'required' : 'optional');
        return plan(`TC aos ${start[0]}–${start[1]} meses`,
          `${isHigh ? 'Seguida de TC' : 'Depois, considerar TC'} aos 18–24 meses, dependendo da estabilidade e do risco.`,
          [first, second], isHigh ? {} : {status: '2.º CONTROLO OPCIONAL'});
      }
      if (!isMultiple) {
        return plan('Avaliação aos ~3 meses / PET-TC / biópsia',
          'Nódulo sólido solitário >8 mm: ponderar TC a curto prazo, PET/TC ou obtenção de tecido, conforme a probabilidade de malignidade.',
          [ct('solid-large-decision', 3, 3, 'Decisão diagnóstica', 'TC aos ~3 meses é uma das opções; não substitui a consideração de PET/TC ou biópsia.', 'decision')],
          {tone: 'warning', status: 'AVALIAÇÃO INDIVIDUALIZADA',
           notice: 'Não pressupor vigilância tomográfica isolada: integrar morfologia, probabilidade pré-teste, comparação com exames prévios e acessibilidade a amostragem.'});
      }
      return plan('TC aos 3–6 meses',
        `${isHigh ? 'Depois, TC' : 'Depois, considerar TC'} aos 18–24 meses. A conduta deve ser guiada pelo nódulo mais suspeito.`,
        [ct('multiple-solid-large-first',3,6,'Primeira TC de controlo','Confirmar persistência e reavaliar o nódulo dominante.'),
         ct('multiple-solid-large-late',18,24,'Segunda TC de controlo','Se não houver crescimento e a vigilância permanecer apropriada.',isHigh?'required':'optional')],
        {tone: 'warning', status: 'REAVALIAR NÓDULO DOMINANTE',
         notice: 'Se algum nódulo >8 mm tiver características suspeitas, ponderar avaliação diagnóstica antecipada (incluindo PET/TC ou amostragem) segundo a abordagem dos nódulos solitários.'});
    }

    // Subsolid: management is independent of the customary low-/high-risk split.
    if (isMultiple) {
      if (isSmall) {
        return plan('TC aos 3–6 meses',
          'Confirmar persistência. Se estáveis, considerar TC aproximadamente aos 2 e 4 anos.',
          [ct('multi-subsolid-small-first',3,6,'TC de confirmação','Excluir causas inflamatórias ou infeciosas transitórias.'),
           ct('multi-subsolid-small-2y',24,24,'TC de vigilância','Apenas se persistentes e após reavaliação do contexto clínico.','optional'),
           ct('multi-subsolid-small-4y',48,48,'TC de vigilância','Se estabilidade mantida e vigilância ainda indicada.','optional')],
          {status: 'CONTROLOS LONGOS OPCIONAIS'});
      }
      const notice = morph === 'partsolid' && component === 'atleast6'
        ? 'Uma componente sólida ≥6 mm é particularmente suspeita. Priorizar avaliação especializada e não adiar uma decisão diagnóstica pelo calendário de TC.'
        : 'A estratégia posterior depende do nódulo mais suspeito, que pode não ser o maior; não existe calendário tardio universal para todos os nódulos múltiplos subsólidos.' + (morph === 'partsolid' && component === 'unknown' ? ' É importante medir a componente sólida.' : '');
      return plan('TC aos 3–6 meses',
        'Confirmar persistência dos nódulos subsólidos; depois orientar segundo a lesão mais suspeita e eventuais componentes sólidas.',
        [ct('multi-subsolid-large-first',3,6,'TC de confirmação','Determinar persistência e reavaliar morfologia de todos os nódulos.')],
        {tone: morph === 'partsolid' && component === 'atleast6' ? 'critical' : 'warning',
         status: 'PLANO POSTERIOR INDIVIDUAL', notice});
    }

    if (isSmall) {
      return plan('Sem seguimento de rotina',
        'Nódulo subsólido solitário <6 mm: em regra, não se recomenda vigilância sistemática.',[],{
          notice:'Em nódulos selecionados com características suspeitas, pode ponderar-se TC aos 2 e 4 anos. Esta é uma exceção individualizada, não dependente de uma categoria convencional de baixo ou alto risco.'});
    }

    if (morph === 'groundglass') {
      return plan('TC aos 6–12 meses',
        'Se persistir, repetir aproximadamente de 2 em 2 anos até completar 5 anos de vigilância.',
        [ct('ggn-first',6,12,'TC de confirmação','Confirmar persistência do vidro despolido puro.'),
         ct('ggn-second',null,null,'TC de vigilância',common,'conditional'),
         ct('ggn-third',null,null,'TC de vigilância',common,'conditional')],
        {status: 'VIGILÂNCIA ATÉ 5 ANOS'});
    }

    if (component === 'unknown') {
      return plan('Caracterizar componente sólida',
        'É necessário conhecer o diâmetro da componente sólida para orientar com segurança um nódulo parcialmente sólido ≥6 mm.',[],{
          tone:'warning',status:'DADO EM FALTA',
          notice:'Selecione a dimensão da componente sólida no formulário. O diâmetro total do nódulo não substitui esta avaliação.',
          empty:'Aguardamos a caracterização da componente sólida para gerar o calendário.'});
    }

    if (component === 'atleast6') {
      return plan('Nódulo muito suspeito: avaliação dirigida',
        'Uma componente sólida ≥6 mm exige avaliação clínica especializada; pode considerar-se TC aos 3–6 meses para confirmar persistência, mas não vigilância automática anual.',
        [ct('partsolid-high-risk',3,6,'Confirmar persistência / decidir',
          'Ponderar PET/TC, biópsia ou ressecção conforme a componente sólida, crescimento e morfologia.','decision')],
        {tone:'critical',status:'ELEVADA SUSPEIÇÃO',
         notice:'Se a componente sólida for >8 mm, crescer ou houver margens lobuladas/elementos quísticos suspeitos, a guideline recomenda ponderar PET/TC, biópsia ou ressecção.'});
    }

    const annual = [12,24,36,48,60].map((month,index) =>
      ct(`partsolid-year-${index + 1}`,month,month,`TC anual · ano ${index + 1}`,
         'Apenas se persistente, inalterado e com componente sólida <6 mm.','conditional'));
    return plan('TC aos 3–6 meses',
      'Se persistente, estável e com componente sólida <6 mm, realizar TC anual até perfazer 5 anos.',
      [ct('partsolid-first',3,6,'TC de confirmação','Confirmar persistência e medir a componente sólida.'),...annual],
      {status:'VIGILÂNCIA ATÉ 5 ANOS',
       notice:'A vigilância anual está condicionada à estabilidade de dimensões e atenuação. Uma componente sólida nova, ≥6 mm ou crescente exige reavaliação.'});
  }

  function monthPlus(iso, offset) {
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(iso) || !Number.isInteger(offset)) return null;
    const [year, month] = iso.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  }

  function makeSchedule(events, baseline, targetOverrides = {}) {
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(baseline)) return [];
    const schedule = [];
    for(const item of events) {
      let min = item.min, max = item.max;
      if(item.id === 'ggn-second' || item.id === 'ggn-third') {
        const first = schedule.find(x => x.id === 'ggn-first');
        if(!first) continue;
        const relativeToBaseline = monthDiff(baseline, first.target);
        min = max = relativeToBaseline + (item.id === 'ggn-second' ? 24 : 48);
        if(min > 60) continue;
      }
      const from = monthPlus(baseline, min);
      const to = monthPlus(baseline, max);
      const midpoint = monthPlus(baseline, Math.round((min+max)/2));
      const candidate = targetOverrides[item.id];
      const target = candidate && candidate >= from && candidate <= to ? candidate : midpoint;
      schedule.push({...item,min,max,from,to,target});
    }
    return schedule;
  }

  function monthDiff(from,to){
    const [y1,m1] = from.split('-').map(Number);
    const [y2,m2] = to.split('-').map(Number);
    return (y2-y1)*12+m2-m1;
  }

  const api = {getPlan, monthPlus, makeSchedule, monthDiff};
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FleischnerLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
