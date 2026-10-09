/**
 * Board's templates: Blank is the app's own page (To do, Doing, Done); these are the rest, each a real board
 * in TLO with real sample cards (the studio by the harbour), canonical as the kernel writes it so each
 * round-trips byte for byte (the corpus test holds every one).
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const PROJECT = `## To do {color=b}

- Write the words for the **About** page
  - [x] Interview Mara
  - [ ] First draft
  - [ ] Dee reads it
- Photograph the studio
- Set up the contact form

## Doing {limit=2 color=g}

- Build the home page
  - [x] Layout
  - [x] Header and footer
  - [ ] The gallery
- Choose the typeface

## Done {color=p}

- Pick the domain name
- Sign the contract
`;

const HIRING = `## Applied

- Ada Okafor, designer
- Ben Ruiz, designer
- Caro Lindqvist, illustrator

## Phone call {limit=3 color=s}

- Dev Patel, designer
  - [x] Call on Tuesday
  - [ ] Send the questions

## Visit the studio {limit=2 color=o}

- Eli Moss, illustrator
  - [ ] Show the portfolio
  - [ ] Lunch with the team

## Offer {color=g}

- Fay Adeyemi, designer
`;

const CONTENT = `## Ideas

- How we choose a typeface
- A day at the harbour studio
- Why the invoice is a letter

## Writing {limit=2 color=y}

- Notes from the launch call
  - [x] Outline
  - [ ] Draft
  - [ ] Pictures

## Review {limit=1 color=o}

- The **spring** newsletter

## Published {color=g}

- Hello from the studio
- Our new site
`;

export const templates = (): Template[] => [
  { id: 'project', name: t('A project'), blurb: t('To do, doing and done, with a limit on what is in hand and a checklist on a card.'), doc: PROJECT },
  { id: 'hiring', name: t('Hiring'), blurb: t('People from the first application to the offer, a stage for each step.'), doc: HIRING },
  { id: 'content', name: t('Content'), blurb: t('Ideas to published: what is being written, what is waiting for a read.'), doc: CONTENT },
];
