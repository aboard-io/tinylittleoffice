/**
 * The calculator's templates: Blank is the app's own page (an empty tape); these are the rest, each a real
 * piece of working in TLO, canonical as the kernel writes it so each round-trips byte for byte (the corpus
 * test holds every one). The everyday sums first, then the ones about money over time and the body, then the
 * graphs. A line of words ending in a full stop or a colon is a note on the tape (model.ts, isNote): the dose
 * template says plainly that it is arithmetic, not advice. What each is for: templates.md.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const BILL = `---
title: Dinner for six
---
food = 164.50
drinks = 58
tip = (food + drinks) * 18%
total = food + drinks + tip
total / 6
`;

const SHOPPING = `---
title: Saturday at the market
---
eggs = 6.50
bread = 7
apples = 2.4 * 3.29
cheese = 0.35 * 28
coffee = 16
flowers = 12
spent = eggs + bread + apples + cheese + coffee + flowers
60 - spent
`;

const TAX = `---
title: Sales tax in New York City
---
rate = 8.875%
laptop = 1299
laptop * rate
laptop * (1 + rate)
receipt = 86.40
before_tax = receipt / (1 + rate)
receipt - before_tax
`;

const PERCENT = `---
title: The rent is going up
---
last_year = 1450
this_year = 1595
rise = this_year - last_year
rise / last_year * 100
rise * 12
raise = 3.5%
pay = 4800 * (1 + raise)
share = this_year / pay * 100
`;

const KITCHEN = `---
title: Kitchen conversions
---
2 cups to ml
180 celsius to fahrenheit
3 tbsp + 2 tsp to ml
450 g to lb
8 floz to ml
`;

const RECIPE = `---
title: Banana bread for twelve
---
serves = 8
want = 12
scale = want / serves
flour = 250 g * scale
butter = 115 g * scale
sugar = 2/3 cup * scale
bananas = 3 * scale
eggs = 2 * scale
The oven stays at 175 °C: check the loaf at 55 minutes.
`;

const UNITS = `---
title: Lengths, weights and temperatures
---
6 ft + 2 inch to cm
26.2 mi to km
5 km to mi
70 kg to lb
14 lb to kg
98.6 fahrenheit to celsius
-10 celsius to fahrenheit
1 acre to m^2
`;

const CURRENCY = `---
title: Four days in Lisbon, in dollars
---
rate = 1.17
hotel = 4 * 138
meals = 4 * 65
trains = 2 * 24.80
museums = 3 * 15
euros = hotel + meals + trains + museums
dollars = euros * rate
dollars * 3%
dollars / 4
`;

const FUEL = `---
title: Gas for the drive to Montreal
---
miles = 2 * 312
mpg = 31
price = 3.39
gallons = miles / mpg
cost = gallons * price
cost / 4
`;

const PAINT = `---
title: Painting the front room
---
walls = 2 * (4.2 + 3.6) * 2.4
doors = 0.9 * 2.1
windows = 1.4 * 1.2 * 2
area = walls - doors - windows
litres = area * 2 / 12
ceil(litres / 2.5)
`;

const ZONES = `---
title: A 9 a.m. call on Monday 2 November
---
new_york = 9
london = new_york + 5
berlin = new_york + 6
mumbai = new_york + 10.5
tokyo = mod(new_york + 14, 24)
sydney = mod(new_york + 16, 24)
Hours on a 24-hour clock: .5 is half past, and in Sydney it is already Tuesday.
`;

const PACE = `---
title: Pace for the Prospect Park 10K
---
time = 52 minute + 30 s
distance = 10 km
pace = time / distance
pace to minute / km
pace to minute / mi
pace * 21.0975 km to h
pace * 42.195 km to h
`;

const BMI = `---
title: Body mass index
---
weight = 72
height = 1.78
weight / height^2
pounds = 160
inches = 70
703 * pounds / inches^2
A guide, not a diagnosis: 18.5 to 25 is the usual range for adults.
`;

const DOSE = `---
title: A child's dose of acetaminophen
---
Arithmetic only: check every dose with a doctor, a pharmacist or the label.
weight = 18 kg
dose = weight * 15 mg / kg
strength = 160 mg / 5 mL
dose / strength
4 * dose
No more than four doses in 24 hours, at least four hours apart.
`;

const POWER = `---
title: What the space heater costs
---
power = 1500 W
hours = 6 h * 30
energy = power * hours to kWh
price = 0.28
cost = energy / kWh * price
cost * 5
`;

const LOAN = `---
title: A car loan over five years
---
principal = 24000
r = 6.9% / 12
n = 60
payment = principal * r / (1 - (1 + r)^-n)
total = payment * n
total - principal
`;

const SAVINGS = `---
title: Saving for ten years
---
start = 5000
monthly = 200
rate = 5% / 12
months = 10 * 12
grown = start * (1 + rate)^months
added = monthly * ((1 + rate)^months - 1) / rate
grown + added
start + monthly * months
`;

const BREAK_EVEN = `---
title: Break-even for a coffee cart
mode: graph
---
x from 0 to 400
1200 + 1.1x
4.5x
`;

const SLOPE = `---
title: A curve and its slope
mode: graph
---
x from -2.5 to 2.5
x^3 - 3x
3x^2 - 3
-2
`;

const WAVES = `---
title: Waves adding up
mode: graph
---
x from -6.3 to 6.3
sin(x)
sin(3x)/3
sin(x) + sin(3x)/3 + sin(5x)/5
`;

export const templates = (): Template[] => [
  { id: 'bill', name: t('Splitting the bill'), blurb: t('Food, drinks and an 18% tip, shared six ways, each step kept by name.'), doc: BILL },
  { id: 'shopping', name: t('A shopping total'), blurb: t('A tape of the market: apples and cheese by weight, the total, and the change from $60.'), doc: SHOPPING },
  { id: 'tax', name: t('Tax on a price'), blurb: t('New York City sales tax added to a price, and taken back out of a receipt.'), doc: TAX },
  { id: 'percent', name: t('Percentage change'), blurb: t('The rent up from $1,450 to $1,595: by how much, by what percent, and against a raise.'), doc: PERCENT },
  { id: 'kitchen', name: t('Kitchen conversions'), blurb: t('Cups, ovens, spoons and weights, from one measure to another.'), doc: KITCHEN },
  { id: 'recipe', name: t('Scaling a recipe'), blurb: t('Banana bread for eight made for twelve: every amount times one and a half.'), doc: RECIPE },
  { id: 'units', name: t('Unit conversions'), blurb: t('Feet to centimetres, miles to kilometres, pounds to kilograms, Fahrenheit to Celsius.'), doc: UNITS },
  { id: 'currency', name: t('Currency at a rate you type'), blurb: t('A trip costed in euros and turned into dollars, with the card fee on top.'), doc: CURRENCY },
  { id: 'fuel', name: t('Fuel for a trip'), blurb: t('Boston to Montreal and back: miles, miles per gallon, the price, four ways.'), doc: FUEL },
  { id: 'paint', name: t('Paint for a room'), blurb: t('Walls less the door and windows, two coats, in 2.5 litre tins.'), doc: PAINT },
  { id: 'zones', name: t('Time zones'), blurb: t('One call at 9 in New York, and the hour it is in London, Berlin, Mumbai, Tokyo and Sydney.'), doc: ZONES },
  { id: 'pace', name: t('Running pace'), blurb: t('A 10K in 52:30: minutes a kilometre and a mile, and the half and full marathon at that pace.'), doc: PACE },
  { id: 'bmi', name: t('Body mass index'), blurb: t('Weight over height squared, in kilograms and metres or in pounds and inches.'), doc: BMI },
  { id: 'dose', name: t('Dose by weight'), blurb: t('Milligrams a kilogram, turned into millilitres of a syrup; check every dose with a pharmacist.'), doc: DOSE },
  { id: 'power', name: t('Electricity for an appliance'), blurb: t('Watts, hours a day and the price of a kilowatt-hour: what a heater costs a month.'), doc: POWER },
  { id: 'loan', name: t('Loan payment'), blurb: t('$24,000 at 6.9% over sixty months: the monthly payment and the interest in all.'), doc: LOAN },
  { id: 'savings', name: t('Compound interest'), blurb: t('$5,000 and $200 a month at 5% for ten years, against what went in.'), doc: SAVINGS },
  { id: 'break-even', name: t('Break-even'), blurb: t('Costs against takings for a coffee cart: where the lines cross is the cups a day it needs.'), doc: BREAK_EVEN },
  { id: 'slope', name: t('A curve and its slope'), blurb: t('x³ − 3x, its derivative, and the flat tangent at the bottom of the dip.'), doc: SLOPE },
  { id: 'waves', name: t('Waves adding up'), blurb: t('Sine waves summed, on their way to a square wave.'), doc: WAVES },
];
