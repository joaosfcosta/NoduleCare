(function(){
 'use strict';
 const clean=s=>String(s??'').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[−–—]/g,'-').replace(/[•·]/g,'-').replace(/→/g,'->').replace(/Δ/g,'Delta').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'');
 async function createClinicalPDF({title,subtitle,sections,filename,logo}){
  if(!window.PDFLib)throw Error('Módulo PDF indisponível.');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib,pdf=await PDFDocument.create();
  pdf.setTitle(clean(title));pdf.setSubject('Relatório clínico');pdf.setCreator('Ferramenta clínica local');
  const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const display=bold;
  let icon;try{if(logo){const r=await fetch(logo);if(r.ok)icon=await pdf.embedPng(await r.arrayBuffer());}}catch{}
  const c={ink:rgb(.10,.16,.22),muted:rgb(.39,.45,.50),teal:rgb(.16,.23,.32),pale:rgb(.949,.960,.971),line:rgb(.82,.85,.88),white:rgb(1,1,1),soft:rgb(.978,.982,.986)};
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
   page.drawRectangle({x:0,y:H-5,width:W,height:5,color:c.ink});
   page.drawLine({start:{x:L,y:49},end:{x:R,y:49},thickness:.65,color:c.line});
   page.drawText(clean(brand)+'   /   DOCUMENTO CLÍNICO',{x:L,y:32,size:7.2,font:bold,color:c.muted});
   page.drawText(String(n).padStart(2,'0'),{x:R-15,y:32,size:8,font:bold,color:c.muted});
   if(n>1){page.drawText(clean(brand)+'  /  continuação',{x:L,y:H-47,size:10,font:bold,color:c.teal});y=H-72;}
  }
  function ensure(h){if(y-h<65)newPage();}
  function write(value,{font=normal,size=9.5,color=c.ink,height=14,after=0,indent=0}={}){
   for(const line of wrap(value,font,size,CW-indent)){ensure(height);page.drawText(line,{x:L+indent,y,font,size,color});y-=height;}y-=after;
  }
  let sectionNumber=0;
  function heading(name){
   ensure(45);y-=15;sectionNumber++;
   page.drawText(String(sectionNumber).padStart(2,'0'),{x:L,y,size:9,font:bold,color:c.muted});
   page.drawText(clean(name),{x:L+30,y:y-1,size:12.7,font:display,color:c.ink});
   y-=12;page.drawLine({start:{x:L+30,y},end:{x:R,y},thickness:.65,color:c.line});y-=15;
  }
  function fieldLine(value){
   const s=clean(value),m=s.match(/^([^:]{2,38}):\s*(.+)$/);
   if(!m||m[2].length>72||s.includes('DOI:'))return false;
   const label=wrap(m[1],bold,8.6,177),content=wrap(m[2],normal,9.2,CW-205);
   const h=Math.max(22,Math.max(label.length,content.length)*13+10);ensure(h+2);
   page.drawLine({start:{x:L+29,y:y-h+8},end:{x:R,y:y-h+8},thickness:.35,color:c.line});
   label.forEach((line,i)=>page.drawText(line,{x:L+30,y:y-9-i*13,size:8.6,font:bold,color:c.muted}));
   content.forEach((line,i)=>page.drawText(line,{x:L+209,y:y-9-i*13,size:9.2,font:normal,color:c.ink}));
   y-=h;return true;
  }
  function table(section){
   const cols=section.columns,rows=section.table;if(!cols?.length||!rows?.length)return;
   const raw=section.widths||cols.map(()=>CW/cols.length),sum=raw.reduce((a,b)=>a+b,0);
   const widths=raw.map(w=>w*(CW-29)/sum);
   function row(cells,head){
    const size=head?8.2:8.7,font=head?bold:normal;
    const count=Math.max(1,...cells.map((v,i)=>wrap(v,font,size,widths[i]-16).length));
    const height=Math.max(25,count*12.5+13);ensure(height+3);
    if(head)page.drawRectangle({x:L+29,y:y-height+9,width:CW-29,height,color:c.pale});
    page.drawLine({start:{x:L+29,y:y-height+9},end:{x:R,y:y-height+9},thickness:.5,color:c.line});
    let x=L+29;cells.forEach((v,i)=>{wrap(v,font,size,widths[i]-16).forEach((line,j)=>page.drawText(line,{x:x+8,y:y-10-j*12.5,size,font,color:head?c.teal:c.ink}));x+=widths[i];});y-=height;
   }
   row(cols,true);rows.forEach(cells=>row(cells,false));y-=8;
  }
  newPage();
  if(icon)page.drawImage(icon,{x:L,y:H-97,width:40,height:40});
  page.drawText(clean(brand),{x:icon?L+53:L,y:H-76,font:bold,size:17,color:c.ink});
  page.drawText('RELATÓRIO CLÍNICO  /  USO PROFISSIONAL',{x:icon?L+53:L,y:H-92,font:bold,size:7.4,color:c.muted});
  page.drawLine({start:{x:L,y:H-112},end:{x:R,y:H-112},thickness:1.1,color:c.ink});
  y=H-143;write(reportTitle,{font:display,size:21,height:26,after:5});
  if(subtitle)write(subtitle,{size:8.5,height:13,color:c.muted,after:13});
  for(const section of sections){
   heading(section.heading);
   const lines=(section.lines||[]).filter(v=>v!=null&&String(v).trim());
   const emph=section.heading==='Conclusão'||section.heading==='Recomendação';
   if(emph&&lines.length){
    const parts=wrap(lines.shift(),bold,12.7,CW-62),h=parts.length*17+22;ensure(h+6);
    page.drawRectangle({x:L+29,y:y-h+8,width:CW-29,height:h,color:c.pale});
    page.drawRectangle({x:L+29,y:y-h+8,width:2,height:h,color:c.ink});
    parts.forEach((line,i)=>page.drawText(line,{x:L+44,y:y-13-i*17,font:bold,size:12.7,color:c.ink}));y-=h+5;
   }
   if(section.table)table(section);
   for(const line of lines){if(!fieldLine(line))write(line,{size:9.3,indent:30,after:4});}y-=8;
  }
  const bytes=await pdf.save(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=filename||'relatorio.pdf';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 window.createClinicalPDF=createClinicalPDF;
})();
