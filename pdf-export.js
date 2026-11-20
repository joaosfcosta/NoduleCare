(function () {
  'use strict';
  // Produção no dispositivo, sem transmitir informação clínica.
  const normalize = value => String(value ?? '').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[−–—]/g, '-').replace(/[•·]/g, '-').replace(/→/g, '->')
    .replace(/Δ/g, 'Delta').replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, '');

  async function createClinicalPDF({title, subtitle, sections, filename, logo}) {
    if (!window.PDFLib) throw new Error('O módulo PDF não está disponível.');
    const {PDFDocument, StandardFonts, rgb} = window.PDFLib;
    const pdf = await PDFDocument.create();
    pdf.setTitle(normalize(title));
    pdf.setSubject('Relatório clínico de apoio à decisão');
    pdf.setCreator('Ferramenta clínica local');
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let icon = null;
    if (logo) {
      try { const response = await fetch(logo); if (response.ok) icon = await pdf.embedPng(await response.arrayBuffer()); }
      catch { /* Sem logótipo, o PDF continua disponível. */ }
    }
    const C = {
      deep: rgb(.055,.18,.225), teal: rgb(.055,.52,.45), mint: rgb(.86,.96,.925),
      ink: rgb(.10,.22,.26), muted: rgb(.39,.48,.51), line: rgb(.84,.89,.89),
      paper: rgb(.975,.988,.985), white: rgb(1,1,1)
    };
    const W=595.28,H=841.89,L=45,R=W-L,WIDTH=R-L;
    const brand=String(title).split(' - ')[0].trim();
    let page,y,pageNo=0;

    function wrap(value,font,size,maxWidth) {
      const lines=[];
      for(const paragraph of normalize(value).split('\n')) {
        if(!paragraph.trim()){lines.push('');continue;}
        let current='';
        for(const word of paragraph.trim().split(/\s+/)) {
          const next=current?`${current} ${word}`:word;
          if(font.widthOfTextAtSize(next,size)<=maxWidth){current=next;continue;}
          if(current)lines.push(current);
          current=word;
          while(current.length>1 && font.widthOfTextAtSize(current,size)>maxWidth){
            let cut=current.length-1;
            while(cut>1 && font.widthOfTextAtSize(current.slice(0,cut),size)>maxWidth)cut--;
            lines.push(current.slice(0,cut));current=current.slice(cut);
          }
        }
        if(current)lines.push(current);
      }
      return lines;
    }
    function addPage(){
      page=pdf.addPage([W,H]);pageNo++;y=H-45;
      page.drawRectangle({x:0,y:H-7,width:W,height:7,color:C.deep});
      page.drawRectangle({x:0,y:H-7,width:138,height:7,color:C.teal});
      page.drawLine({start:{x:L,y:48},end:{x:R,y:48},thickness:.7,color:C.line});
      page.drawText('FERRAMENTA DE APOIO À DECISÃO CLÍNICA',{x:L,y:31,size:7.4,font:regular,color:C.muted});
      page.drawText(String(pageNo),{x:R-9,y:31,size:8,font:bold,color:C.muted});
    }
    addPage();
    const bandY=H-185;
    page.drawRectangle({x:L,y:bandY,width:WIDTH,height:140,color:C.deep});
    page.drawRectangle({x:L,y:bandY,width:5,height:140,color:C.teal});
    if(icon)page.drawImage(icon,{x:L+21,y:bandY+79,width:43,height:43});
    else{page.drawRectangle({x:L+21,y:bandY+79,width:43,height:43,color:C.teal});page.drawText(brand.slice(0,1),{x:L+34,y:bandY+90,size:23,font:bold,color:C.white});}
    page.drawText(normalize(brand),{x:L+75,y:bandY+99,size:17,font:bold,color:C.white});
    page.drawText('RELATÓRIO CLÍNICO',{x:L+75,y:bandY+83,size:8,font:bold,color:C.mint});
    const heading=normalize(title.slice(brand.length).replace(/^\s*-\s*/,''));
    wrap(heading,bold,15,WIDTH-48).slice(0,2).forEach((line,i)=>page.drawText(line,{x:L+22,y:bandY+49-i*18,size:15,font:bold,color:C.white}));
    if(subtitle){const sub=wrap(subtitle,regular,8.7,WIDTH-48)[0]||'';page.drawText(sub,{x:L+22,y:bandY+15,size:8.7,font:regular,color:C.mint});}
    y=bandY-24;

    sections.forEach((section,index)=>{
      const highlight=section.heading==='Conclusão'||section.heading==='Recomendação';
      const rows=(section.lines||[]).filter(v=>v!==null&&v!==undefined&&String(v).trim()).map(value=>wrap(value,regular,9.7,WIDTH-56));
      const headingLines=wrap(section.heading,bold,10.5,WIDTH-78);
      const total=35+headingLines.length*14+rows.reduce((s,r)=>s+r.length*14.7+5,0);
      if(total>y-66)addPage();
      const top=y,bottom=y-total;
      page.drawRectangle({x:L,y:bottom,width:WIDTH,height:total,color:highlight?C.mint:C.paper});
      page.drawRectangle({x:L,y:bottom,width:highlight?4:2,height:total,color:highlight?C.teal:C.line});
      let cursor=top-23;
      page.drawText(String(index+1).padStart(2,'0'),{x:L+19,y:cursor,size:8.5,font:bold,color:C.teal});
      for(const line of headingLines){page.drawText(line,{x:L+47,y:cursor,size:10.5,font:bold,color:C.ink});cursor-=14;}
      cursor-=8;
      for(const row of rows){for(const line of row){if(line)page.drawText(line,{x:L+27,y:cursor,font:regular,size:9.7,color:C.ink});cursor-=14.7;}cursor-=5;}
      y=bottom-15;
    });
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=filename||'relatorio.pdf';document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  window.createClinicalPDF=createClinicalPDF;
})();
