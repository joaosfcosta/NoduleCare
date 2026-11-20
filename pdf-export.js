(function () {
  'use strict';
  // Geração local: os dados clínicos nunca são enviados a um servidor.
  const normalize = (value) => String(value ?? '')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[−–—]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[→]/g, '->')
    .replace(/[Δ]/g, 'Delta')
    .replace(/[ρ]/g, 'rho')
    .replace(/[²]/g, '2')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, '');

  async function createClinicalPDF({ title, subtitle, sections, filename }) {
    if (!window.PDFLib) throw new Error('O módulo PDF não está disponível.');
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.create();
    pdf.setTitle(normalize(title));
    pdf.setSubject('Relatório clínico de apoio à decisão');
    pdf.setCreator('Ferramenta clínica local');
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const dark = rgb(0.08, 0.22, 0.27);
    const muted = rgb(0.35, 0.45, 0.48);
    const teal = rgb(0.04, 0.49, 0.44);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const left = 46;
    const right = pageWidth - left;
    let page;
    let y;
    let pageNumber = 0;

    function newPage() {
      page = pdf.addPage([pageWidth, pageHeight]);
      pageNumber += 1;
      y = pageHeight - 48;
      page.drawRectangle({x: left, y: pageHeight - 25, width: right - left, height: 3, color: teal});
      page.drawText(`Página ${pageNumber}`, {x: right - 44, y: 25, size: 8, font: regular, color: muted});
    }
    function ensure(height) {
      if (y - height < 48) newPage();
    }
    function wrappedLines(text, font, fontSize, maxWidth) {
      const output = [];
      for (const paragraph of normalize(text).split('\n')) {
        if (!paragraph.trim()) { output.push(''); continue; }
        let line = '';
        for (const word of paragraph.trim().split(/\s+/)) {
          const next = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) { line = next; continue; }
          if (line) output.push(line);
          line = word;
          // Evita ultrapassar a margem com termos excecionalmente longos.
          while (font.widthOfTextAtSize(line, fontSize) > maxWidth && line.length > 1) {
            let count = line.length - 1;
            while (count > 1 && font.widthOfTextAtSize(line.slice(0, count), fontSize) > maxWidth) count--;
            output.push(line.slice(0, count));
            line = line.slice(count);
          }
        }
        output.push(line);
      }
      return output;
    }
    function write(text, {font = regular, size = 10, color = dark, lineHeight = 15, after = 0, indent = 0} = {}) {
      for (const line of wrappedLines(text, font, size, right - left - indent)) {
        ensure(lineHeight);
        if (line) page.drawText(line, {x: left + indent, y, font, size, color});
        y -= lineHeight;
      }
      y -= after;
    }

    newPage();
    write(title, {font: bold, size: 19, lineHeight: 24, color: dark, after: 2});
    if (subtitle) write(subtitle, {size: 9, lineHeight: 13, color: muted, after: 17});
    else y -= 14;
    page.drawLine({start: {x: left, y: y + 7}, end: {x: right, y: y + 7}, thickness: 0.8, color: rgb(0.81, 0.89, 0.88)});

    for (const section of sections) {
      const lines = (section.lines || []).filter(x => x !== null && x !== undefined);
      ensure(38);
      y -= 15;
      write(section.heading, {font: bold, size: 11, lineHeight: 16, color: teal, after: 5});
      for (const item of lines) write(item, {size: 9.7, lineHeight: 15, after: 2});
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], {type: 'application/pdf'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'relatorio.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  window.createClinicalPDF = createClinicalPDF;
})();
