// The QR code: the standard's shape at both ends of the range. (Ported from the old tree's test/apps.test.ts.)
import { test, expect } from 'vitest';
import { qrCode, qrSvg, QR_MAX_BYTES } from '../src/kit/qr.ts';

test('a QR code of a link has the standard shape', () => {
  const small = qrCode(new TextEncoder().encode('https://tinylittleoffice.com/'));
  expect(small.length).toBe(25);
  // The finder patterns are where they should be, and the dark module too.
  expect(small[0][0] && small[0][6] && small[6][0] && !small[1][1] && small[3][3] && small[0][18] && small[18][0] && small[17][8]).toBe(true);
  expect(qrCode(new Uint8Array(2953)).length).toBe(177);
  expect(() => qrCode(new Uint8Array(QR_MAX_BYTES + 1))).toThrow();
  expect(qrSvg(new TextEncoder().encode('x')).startsWith('<svg')).toBe(true);
});
