(function(){
  'use strict';
  // Relatório produzido exclusivamente no navegador.
  const tidy=value=>String(value??'').replace(/[−—]/g,'-').replace(/[•·]/g,' · ')
    .replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/→/g,'->').replace(/Δ/g,'Delta')
    .replace(/[\u00a0\u202f]/g,' ').replace(/[^\x20-\x7e\xa0-\xff\u2013\n]/g,'');

  async function createClinicalPDF({title,subtitle,sections,filename,logo}){
    const lib=window.PDFLib;if(!lib)throw Error('O módulo PDF não está disponível.');
    const {PDFDocument,StandardFonts,rgb}=lib,pdf=await PDFDocument.create();
    pdf.setTitle(tidy(title));pdf.setCreator('Ferramenta clínica local');
    pdf.setSubject('Relatório de apoio à decisão clínica');
    const regular=await pdf.embedFont(StandardFonts.Helvetica);
    const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
    let icon=null;
    try{if(logo){const r=await fetch(logo);if(r.ok)icon=await pdf.embedPng(await r.arrayBuffer());}}catch{}
    const ink=rgb(.09,.15,.22),mid=rgb(.39,.45,.51),accent=rgb(.19,.38,.57);
    const line=rgb(.84,.87,.90),ice=rgb(.945,.963,.976),white=rgb(1,1,1),pale=rgb(.981,.984,.987);
    const W=595.28,H=841.89,M=43,CW=W-2*M,G=15,half=(CW-G)/2;
    const brand=title.split(' - ')[0],description=title.slice(brand.length).replace(/^\s*-\s*/,'');
    let page,pageNo=0,y;

    function wrap(value,font,size,width){
      const result=[];
      for(const para of tidy(value).split('\n')){
        let current='';
        for(const word of para.trim().split(/\s+/).filter(Boolean)){
          const trial=current?current+' '+word:word;
          if(font.widthOfTextAtSize(trial,size)<=width){current=trial;continue;}
          if(current)result.push(current);current=word;
          while(current.length>1&&font.widthOfTextAtSize(current,size)>width){
            let n=current.length-1;while(n>1&&font.widthOfTextAtSize(current.slice(0,n),size)>width)n--;
            result.push(current.slice(0,n));current=current.slice(n);
          }
        }
        if(current)result.push(current);
      }return result;
    }
    function label(text,x,top,color=mid,size=8.3){
      page.drawText(tidy(text).toUpperCase(),{x,y:top,size,font:bold,color});
    }
    function newPage(){
      page=pdf.addPage([W,H]);pageNo++;y=H-34;
      page.drawRectangle({x:0,y:H-4,width:W,height:4,color:ink});
      page.drawLine({start:{x:M,y:44},end:{x:W-M,y:44},thickness:.65,color:line});
      label(brand+'  /  Decisão clínica',M,29,mid,7.2);
      page.drawText(String(pageNo).padStart(2,'0'),{x:W-M-15,y:29,size:7.8,font:bold,color:mid});
      if(pageNo>1){label(brand+'  /  Continuação',M,H-48,mid,9);y=H-74;}
    }
    function fullHeader(){
      const top=H-39;
      if(icon)page.drawImage(icon,{x:M,y:top-43,width:43,height:43});
      label(brand,M+(icon?57:0),top-15,ink,16);
      label('Relatório clínico  /  uso profissional',M+(icon?57:0),top-31,mid,7.6);
      page.drawLine({start:{x:M,y:top-62},end:{x:W-M,y:top-62},thickness:1,color:ink});
      page.drawText(tidy(description),{x:M,y:top-92,size:20,font:bold,color:ink});
      const details=wrap(subtitle||'',regular,9,CW);
      details.forEach((v,i)=>page.drawText(v,{x:M,y:top-111-i*12.5,size:9,font:regular,color:mid}));
      y=top-135-(details.length-1)*12.5;
    }
    function splitKV(lineValue){
      const text=tidy(lineValue),match=text.match(/^([^:]{2,42}):\s*(.+)$/);
      return match&&match[2].length<125&&!match[1].includes('DOI')?[match[1].trim(),match[2].trim()]:null;
    }
    function boxSection(section,x,top,width,number){
      const padding=14,inner=width-2*padding,small=width<300;
      let cursor=top-17;
      label(String(number).padStart(2,'0'),x+padding,cursor,accent,8);
      page.drawText(tidy(section.heading),{x:x+padding+27,y:cursor-1,size:10.6,font:bold,color:ink});
      cursor-=21;
      page.drawLine({start:{x:x+padding,y:cursor+5},end:{x:x+width-padding,y:cursor+5},thickness:.6,color:line});
      cursor-=12;
      const sectionLines=(section.lines||[]).filter(v=>v!=null&&String(v).trim());
      for(const item of sectionLines){
        const pair=splitKV(item);
        if(pair&&small){
          const v=wrap(pair[1],regular,8.9,inner);
          page.drawText(pair[0],{x:x+padding,y:cursor,size:8,font:bold,color:mid});cursor-=12;
          v.forEach(s=>{page.drawText(s,{x:x+padding,y:cursor,size:8.9,font:regular,color:ink});cursor-=12.4;});
          cursor-=8;
        }else if(pair){
          const keyWidth=width*.34;
          const vals=wrap(pair[1],regular,9,inner-keyWidth);
          page.drawText(pair[0],{x:x+padding,y:cursor,size:8.6,font:bold,color:mid});
          vals.forEach((s,i)=>page.drawText(s,{x:x+padding+keyWidth,y:cursor-i*13,size:9,font:regular,color:ink}));
          cursor-=Math.max(20,vals.length*13+7);
          page.drawLine({start:{x:x+padding,y:cursor+8},end:{x:x+width-padding,y:cursor+8},thickness:.35,color:line});
        }else{
          const lines=wrap(item,regular,small?8.8:9,inner);
          lines.forEach(s=>{page.drawText(s,{x:x+padding,y:cursor,size:small?8.8:9,font:regular,color:ink});cursor-=13;});
          cursor-=7;
        }
      }
      return top-Math.max(62,top-cursor+3);
    }
    function tableSection(section,x,top,width,number){
      const inset=14,tableX=x+inset,tableWidth=width-2*inset;
      let cursor=top-16;
      label(String(number).padStart(2,'0'),tableX,cursor,accent,8);
      page.drawText(tidy(section.heading),{x:tableX+27,y:cursor-1,size:10.8,font:bold,color:ink});
      cursor-=21;
      const cols=section.columns||[],rows=section.table||[];
      const raw=section.widths||cols.map(()=>1),total=raw.reduce((a,b)=>a+b,0);
      const widths=raw.map(v=>v*tableWidth/total);
      const row=(cells,header=false,index=0)=>{
        const size=header?7.5:8.5,font=header?bold:regular;
        const wrapped=cells.map((v,i)=>wrap(v,font,size,widths[i]-12));
        const height=Math.max(header?24:25,Math.max(...wrapped.map(v=>v.length),1)*11.4+11);
        if(header||index%2===0)page.drawRectangle({x:tableX,y:cursor-height+7,width:tableWidth,height,color:header?ice:pale});
        let colx=tableX;
        wrapped.forEach((lines,i)=>{lines.forEach((s,j)=>page.drawText(s,{x:colx+6,y:cursor-9-j*11.4,size,font,color:header?mid:ink}));colx+=widths[i];});
        cursor-=height;
        page.drawLine({start:{x:tableX,y:cursor+7},end:{x:tableX+tableWidth,y:cursor+7},thickness:.4,color:line});
      };
      row(cols,true);rows.forEach((r,i)=>row(r,false,i));
      cursor-=13;
      for(const item of section.lines||[]){
        wrap(item,regular,8.7,tableWidth).forEach(s=>{page.drawText(s,{x:tableX,y:cursor,size:8.7,font:regular,color:mid});cursor-=12;});cursor-=5;
      }
      return cursor;
    }
    function functionalCompact(section,x,top,width){
      const pad=14;
      let cursor=top-17;
      label('03',x+pad,cursor,accent,8);
      page.drawText('Função respiratória',{x:x+pad+27,y:cursor-1,size:10.6,font:bold,color:ink});
      cursor-=21;
      page.drawLine({start:{x:x+pad,y:cursor+5},end:{x:x+width-pad,y:cursor+5},thickness:.6,color:line});
      cursor-=12;
      const records=section.table||[];
      for(const row of records){
        page.drawRectangle({x:x+pad,y:cursor-60,width:width-2*pad,height:68,color:pale});
        label(row[0],x+pad+9,cursor-12,ink,10.2);
        const fields=[['Inicial',row[1]],['Atual',row[2]],['Redução abs.',row[3]],['Redução rel.',row[4]]];
        fields.forEach((field,i)=>{
          const col=i%2,lineIndex=Math.floor(i/2),px=x+pad+9+col*(width-2*pad)/2,py=cursor-30-lineIndex*24;
          label(field[0],px,py,mid,7);
          page.drawText(tidy(field[1]),{x:px,y:py-12,size:9,font:bold,color:ink});
        });
        cursor-=77;
      }
      for(const item of section.lines||[]){
        wrap(item,regular,8.3,width-2*pad).forEach(s=>{page.drawText(s,{x:x+pad,y:cursor,size:8.3,font:regular,color:mid});cursor-=12;});cursor-=3;
      }
      return cursor-10;
    }
    function notesSection(section,x,top,width){
      let cursor=top-17;
      label('04',x+14,cursor,accent,8);
      page.drawText('Notas clínicas e referência',{x:x+41,y:cursor-1,size:10.6,font:bold,color:ink});
      cursor-=21;
      page.drawLine({start:{x:x+14,y:cursor+5},end:{x:x+width-14,y:cursor+5},thickness:.6,color:line});
      cursor-=13;
      const entries=(section.lines||[]).filter(Boolean);
      const textX=x+14,textWidth=width-28;
      function drawParagraph(value,justify){
        const size=8.8,lines=wrap(value,regular,size,textWidth);
        lines.forEach((lineText,index)=>{
          const words=lineText.split(' ');
          if(justify&&index<lines.length-1&&words.length>1){
            const wordWidth=words.reduce((sum,word)=>sum+regular.widthOfTextAtSize(word,size),0);
            const gap=(textWidth-wordWidth)/(words.length-1);
            let pos=textX;
            for(const word of words){page.drawText(word,{x:pos,y:cursor,size,font:regular,color:ink});pos+=regular.widthOfTextAtSize(word,size)+gap;}
          }else page.drawText(lineText,{x:textX,y:cursor,size,font:regular,color:ink});
          cursor-=12.5;
        });
      }
      function drawReference(value){
        const size=8.1,words=tidy(value).split(/\s+/).filter(Boolean);
        const space=regular.widthOfTextAtSize(' ',size);
        let pos=textX;
        for(const word of words){
          const font=word==='Radiology.'?italic:regular;
          const wordWidth=font.widthOfTextAtSize(word,size);
          if(pos>textX&&pos+wordWidth>textX+textWidth){pos=textX;cursor-=12.5;}
          page.drawText(word,{x:pos,y:cursor,size,font,color:mid});
          pos+=wordWidth+space;
        }
        cursor-=12.5;
      }
      // Texto clínico e bibliografia são blocos diferentes, nunca campos de formulário.
      for(let i=0;i<entries.length;i++){
        const raw=tidy(entries[i]);
        const isReference=/MacMahon|DOI:/.test(raw);
        if(i===1&&raw.includes(':')){
          const cut=raw.indexOf(':');
          label(raw.slice(0,cut),x+14,cursor,mid,7.5);
          cursor-=13;
          drawParagraph(raw.slice(cut+1).trim(),true);
        }else{
          if(isReference){cursor-=4;page.drawLine({start:{x:x+14,y:cursor+4},end:{x:x+width-14,y:cursor+4},thickness:.5,color:line});cursor-=10;label('Referência científica',x+14,cursor,mid,7.3);cursor-=13;}
          if(isReference)drawReference(raw);
          else drawParagraph(raw,true);
        }
        cursor-=9;
      }
      return cursor;
    }
    function hero(section,top){
      const entries=(section.lines||[]).filter(Boolean);
      const summary=wrap(entries[0]||'',bold,17,CW-40);
      const explanations=entries.slice(1).flatMap(v=>wrap(v,regular,9.3,CW-40));
      const h=45+summary.length*21+explanations.length*14;
      page.drawRectangle({x:M,y:top-h,width:CW,height:h,color:ink});
      page.drawRectangle({x:M,y:top-h,width:4,height:h,color:accent});
      label('RESULTADO',M+19,top-20,ice,7.8);
      let cursor=top-46;
      summary.forEach(s=>{page.drawText(s,{x:M+19,y:cursor,font:bold,size:17,color:white});cursor-=21;});
      explanations.forEach(s=>{page.drawText(s,{x:M+19,y:cursor-3,font:regular,size:9.3,color:ice});cursor-=14;});
      return top-h-20;
    }
    function ensure(height){if(y-height<66)newPage();}
    newPage();fullHeader();
    const isFibro=brand.toLowerCase().includes('fibro');
    if(isFibro){
      y=hero(sections[0],y);
      const a=boxSection(sections[1],M,y,half,2);
      const b=functionalCompact(sections[2],M,a-10,half);
      const xRight=M+half+G;
      const c=boxSection(sections[4],xRight,y,half,5);
      const d=boxSection(sections[3],xRight,c-3,half,4);
      const e=boxSection(sections[5],xRight,d-3,half,6);
      y=Math.min(b,e);
    }else{
      // NoduleCare: dados do nódulo numa grelha, recomendação e cronograma.
      y=hero(sections[1],y);
      ensure(175);
      const item=sections[0],data=(item.lines||[]).filter(Boolean);
      const first={heading:item.heading,lines:data.slice(0,Math.ceil(data.length/2))};
      const second={heading:'Perfil do achado',lines:data.slice(Math.ceil(data.length/2))};
      const a=boxSection(first,M,y,half,1),b=boxSection(second,M+half+G,y,half,2);
      y=Math.min(a,b)-14;
      ensure(135);
      y=tableSection(sections[2],M,y,CW,3)-8;
      ensure(130);
      y=notesSection(sections[3],M,y,CW);
    }
    const bytes=await pdf.save();
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const link=document.createElement('a');link.href=url;link.download=filename||'relatorio.pdf';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  window.createClinicalPDF=createClinicalPDF;
})();
