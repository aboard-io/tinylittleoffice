// The link's shape: "#/v1/<app>[.<view>][/<payload>]".
import { test, expect } from 'vitest';
import { LINK, parseHash, routeHash } from '../src/kit/route.ts';

test('a document link is read and written the same way', () => {
  expect(LINK).toBe('#/v1/');
  expect(parseHash('#/v1/text/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '' });
  expect(parseHash('#/v1/text.png/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'png' });
  expect(parseHash('#/v1/text')).toEqual({ app: 'text', payload: '', version: 1, view: '' });
  expect(parseHash('#/v1/text/')).toEqual({ app: 'text', payload: '', version: 1, view: '' });
  expect(parseHash('#/v2/text/x').version).toBe(2);
  expect(parseHash('').app).toBeNull();
  expect(parseHash('#/').app).toBeNull();
  expect(parseHash('#/v1/Text/x').app).toBeNull();
  expect(routeHash('text')).toBe('#/v1/text');
  expect(routeHash('text', 'yABC')).toBe('#/v1/text/yABC');
  expect(routeHash('text', 'yABC', 'pdf')).toBe('#/v1/text.pdf/yABC');
  expect(parseHash(routeHash('text', 'yABC', 'pdf'))).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'pdf' });
});
