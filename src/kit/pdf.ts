/**
 * The smallest PDF that does the job: one JPEG per page, each page the size
 * of its picture, numbered at its foot when there is more than one. Pictures
 * in, bytes out; the browser draws the JPEGs.
 */
import { measure } from './textpdf.ts';

export interface PdfPage {
  /** Size in px; a px becomes 0.75pt, so a 960px slide is a 10in page. */
  w: number;
  h: number;
  /** Pixel size of the JPEG, which may be finer than w by h. */
  pw: number;
  ph: number;
  jpeg: Uint8Array;
}

export function pdf(pages: PdfPage[], title = ''): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    parts.push(bytes);
    size += bytes.length;
  };
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = size;
    push(`${n} 0 obj\n${body}\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };
  // PDF strings: UTF-16BE with a byte order mark covers any title.
  const hex = (s: string) => '<FEFF' + [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('') + '>';

  push('%PDF-1.4\n%âãÏÓ\n');
  const n = pages.length;
  // Objects: 1 catalog, 2 page tree, 3 info, then page / contents / image for each page.
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${4 + i * 3} 0 R`).join(' ')}] >>`);
  obj(3, `<< /Producer (TinyLittleOffice) /Title ${hex(title)} >>`);
  pages.forEach((p, i) => {
    const id = 4 + i * 3;
    const w = Math.round(p.w * 75) / 100;
    const h = Math.round(p.h * 75) / 100;
    // A document of more than one page has its page numbers, small and grey, centred at the foot.
    const num = n > 1 ? `${i + 1} / ${n}` : '';
    const draw = enc.encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q` + (num ? ` BT /F1 8 Tf 0.45 g ${(w / 2 - measure(num, 8) / 2).toFixed(2)} ${Math.min(14, h * 0.02).toFixed(2)} Td (${num}) Tj ET` : ''));
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${id + 1} 0 R /Resources << /XObject << /Im0 ${id + 2} 0 R >>${num ? ` /Font << /F1 ${4 + n * 3} 0 R >>` : ''} >> >>`);
    obj(id + 1, `<< /Length ${draw.length} >>`, draw);
    obj(id + 2, `<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`, p.jpeg);
  });
  // The font page numbers are set in (one every reader has).
  obj(4 + n * 3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const count = 5 + n * 3;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
