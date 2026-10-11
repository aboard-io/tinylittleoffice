/**
 * British spellings and British sample words, each with what to say instead: the product's English is American
 * (Paul, 2026-10-11). test/american.test.ts holds en.ts and every template to it, test/i18n.test.ts every English string.
 */
export const BRITISH: [RegExp, string][] = [
  [/colour/i, 'color'],
  [/centre/i, 'center'],
  [
    /(organ|real|recogn|custom|minim|maxim|optim|summar|author|categor|priorit|visual|normal|initial|synchron|personal|apolog|util|critic|special|final|emphas|memor|standard|capital|central|modern|sanit|harmon|familiar|energ|mobil|item|local|stabil|apolog|theor|symbol|global|fertil|steril|vapor|colon|agon)is(e|es|ed|ing|ation)/i,
    '-ize',
  ],
  [/favourit/i, 'favorite'],
  [/\bgrey(?<!Earl Grey)/i, 'gray'],
  [/licence/i, 'license'],
  [/programme/i, 'program'],
  [/kilometre|centimetre|millimetre|\bmetres?\b|litre/i, '-meter, -liter'],
  [/labelled|travell|cancell|modell|levell|jewellery/i, 'one l'],
  [/neighbour|behaviour|honour|favour|flavour|labour|rumour|harbour|humour/i, '-or'],
  [/catalogue|cheque|\btyres?\b|aluminium|\bwhilst\b|\bamongst\b|\blearnt\b|\bspelt\b|\bfor ever\b|\bmaths\b/i, 'the American word'],
  [/full stop/i, 'period'],
  [/postcode/i, 'ZIP code'],
  [/\bmobile\b/i, 'cell phone'],
  [/nappies|\bnappy\b/i, 'diapers'],
  [/\bCo-op\b/, 'a bodega or a supermarket'],
  [/lollipop/i, 'crossing guard'],
  [/\brota\b/i, 'schedule'],
  [/\bfortnight/i, 'two weeks'],
  [/\bautumn\b/i, 'fall'],
  [/\bpubs?\b/i, 'a classroom will see it'],
  [/\bflat\b(?! tangent| fee| rate|-| white| shoes| tires?| out)/i, 'apartment'],
  [/bank holiday/i, 'holiday'],
  [/half term/i, 'break'],
  [/\bINSET\b|Key Stage|Year \d\b/, 'an American school'],
  [/\bcouncil tax\b|\bMOT\b|\bTV licen/i, 'an American bill'],
  [/£|\bGBP\b|\bpence\b|\bquid\b/, 'dollars'],
  [/\b0\d{3,4} ?\d{3} ?\d{3,4}\b|\+44/, 'a 555 number'],
  [/Europe\/London/, 'no zone: the reader’s'],
  [/\btakings\b/i, 'sales'],
  [/class(’|')s marks/i, 'grades'],
  [/\bticked?\b|\bticking\b|\bunticks?\b/i, 'check'],
  [/\bround (it|the|each|while|every)\b/i, 'around'],
  [/\b(the|a) (little )?shop\b(?!’s)/i, 'store'],
];

/** The lines of a text that say something British, as "file:line: word → instead". */
export function british(text: string, name: string): string[] {
  const out: string[] = [];
  text.split('\n').forEach((line, i) => {
    for (const [re, instead] of BRITISH) {
      const m = re.exec(line);
      if (m) out.push(`${name}:${i + 1}: ${m[0]} → ${instead}`);
    }
  });
  return out;
}
