(function(){
 'use strict';
 const clean=s=>String(s??'').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[−–—]/g,'-').replace(/[•·]/g,'-').replace(/→/g,'->').replace(/Δ/g,'Delta').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'');
 async function createClinicalPDF({title,subtitle,sections,filename,logo}){
  if(!window.PDFLib)throw Error('Módulo PDF indisponível.');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib,pdf=await PDFDocument.create();
  pdf.setTitle(clean(title));pdf.setSubject('Relatório clínico');pdf.setCreator('Ferramenta clínica local');
  const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let icon;try{if(logo){const r=await fetch(logo);if(r.ok)icon=await pdf.embedPng(await r.arrayBuffer());}}catch{}
  const c={ink:rgb(.12,.17,.22),muted:rgb(.42,.46,.50),teal:rgb(.22,.28,.34),pale:rgb(.955,.962,.968),line:rgb(.83,.85,.87),white:rgb(1,1,1)};
  const W=595.28,H=841.89,L=48,R=W-L,CW=R-L,brand=title.split(' - ')[0],reportTitle=title.slice(brand.length).replace(/^\s*-\s*/,'');
  let page,y,n=0;
  function wrap(value,font,size,width){
   const out=[];for(const p of clean(value).split('\n')){let line='';for(const word of p.split(/\s+/).filter(Boolean)){
    const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)<=width){line=next;continue;}
    if(line)out.push(line);line=word;while(line.length>1&&font.widthOfTextAtSize(line,size)>width){let k=line.length-1;while(k>1&&font.widthOfTextAtSize(line.slice(0,k),size)>width)k--;out.push(line.slice(0,k));line=line.slice(k);}
   }if(line)out.push(line);}return out;
  }
  function newPage(){
   page=pdf.addPage([W,H]);n++;y=H-48;
   page.drawLine({start:{x:L,y:48},end:{x:R,y:48},thickness:.6,color:c.line});
   page.drawText(clean(brand)+'  |  Apoio à decisão clínica',{x:L,y:31,size:7.5,font:normal,color:c.muted});
   page.drawText(String(n),{x:R-8,y:31,size:8,font:normal,color:c.muted});
   if(n>1){page.drawText(clean(brand)+'  /  Continuação',{x:L,y:H-47,size:10,font:bold,color:c.teal});y=H-72;}
  }
  function ensure(h){if(y-h<65)newPage();}
  function write(value,{font=normal,size=9.5,color=c.ink,height=14,after=0,indent=0}={}){
   for(const line of wrap(value,font,size,CW-indent)){ensure(height);page.drawText(line,{x:L+indent,y,font,size,color});y-=height;}y-=after;
  }
  function heading(name){
   ensure(38);y-=13;page.drawText(clean(name).toUpperCase(),{x:L,y,size:9,font:bold,color:c.teal});y-=10;
   page.drawLine({start:{x:L,y},end:{x:R,y},thickness:.65,color:c.line});y-=17;
  }
  function table(section){
   const cols=section.columns,rows=section.table;if(!cols?.length||!rows?.length)return;
   const widths=section.widths||cols.map(()=>CW/cols.length);
   function row(cells,head){
    const size=head?8.2:8.7,font=head?bold:normal;
    const count=Math.max(1,...cells.map((v,i)=>wrap(v,font,size,widths[i]-16).length));
    const height=Math.max(25,count*12.5+13);ensure(height+3);
    if(head)page.drawRectangle({x:L,y:y-height+9,width:CW,height,color:c.pale});
    page.drawLine({start:{x:L,y:y-height+9},end:{x:R,y:y-height+9},thickness:.5,color:c.line});
    let x=L;cells.forEach((v,i)=>{wrap(v,font,size,widths[i]-16).forEach((line,j)=>page.drawText(line,{x:x+8,y:y-10-j*12.5,size,font,color:head?c.teal:c.ink}));x+=widths[i];});y-=height;
   }
   row(cols,true);rows.forEach(cells=>row(cells,false));y-=8;
  }
  newPage();
  if(icon)page.drawImage(icon,{x:L,y:H-94,width:32,height:32});
  page.drawText(clean(brand),{x:icon?L+43:L,y:H-72,font:bold,size:15,color:c.ink});
  page.drawText('RELATÓRIO CLÍNICO',{x:icon?L+43:L,y:H-87,font:bold,size:7.6,color:c.teal});
  page.drawLine({start:{x:L,y:H-108},end:{x:R,y:H-108},thickness:1.2,color:c.teal});
  y=H-136;write(reportTitle,{font:bold,size:17,height:22,after:2});
  if(subtitle)write(subtitle,{size:8.6,height:13,color:c.muted,after:13});
  for(const section of sections){
   heading(section.heading);
   const lines=(section.lines||[]).filter(v=>v!=null&&String(v).trim());
   const emph=section.heading==='Conclusão'||section.heading==='Recomendação';
   if(emph&&lines.length){
    const parts=wrap(lines.shift(),bold,12,CW-26),h=parts.length*16+19;ensure(h+6);
    page.drawRectangle({x:L,y:y-h+8,width:CW,height:h,color:c.pale});
    page.drawRectangle({x:L,y:y-h+8,width:3,height:h,color:c.teal});
    parts.forEach((line,i)=>page.drawText(line,{x:L+13,y:y-12-i*16,font:bold,size:12,color:c.ink}));y-=h+5;
   }
   if(section.table)table(section);
   for(const line of lines)write(line,{after:3});y-=6;
  }
  const bytes=await pdf.save(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=filename||'relatorio.pdf';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 window.createClinicalPDF=createClinicalPDF;
})();
