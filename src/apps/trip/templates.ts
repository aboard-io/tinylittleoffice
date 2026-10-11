/**
 * Trip's templates: Blank is the app's own page (an empty map to tap); these are the rest, each a real route
 * written by the kernel, so each is canonical and round-trips byte for byte (the corpus test holds every one).
 * Blank first, then the everyday trips (a weekend, a road trip, an afternoon of food, a walk, a ride, a tour), the long
 * journeys, and the special ones (a pilgrimage, film locations, a wedding's places for its guests). Every way of
 * measuring is here: kilometers, miles, hours of driving, and places that are dots, not a route.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Head } from '../../doc/index.ts';
import { TRIP_HEAD } from './model.ts';

const trip = (head: Head, ...rows: string[][]) => write({ head, blocks: [{ k: 'table', cols: TRIP_HEAD.map(column), rows }] });

const PORTUGAL = trip(
  { units: 'km' },
  ['Lisbon', '38.7223', '-9.1393', 'Pastéis de nata in Belém, then the 28 tram up to Graça'],
  ['Sintra', '38.8029', '-9.3817', 'Pena Palace first thing, before the tour buses'],
  ['Óbidos', '39.3606', '-9.1571', 'Walk the town walls; ginjinha in a chocolate cup'],
  ['Coimbra', '40.2033', '-8.4103', 'The Joanina Library: book the 10 am slot'],
  ['Porto', '41.1579', '-8.6291', 'Port cellars across the river in Gaia'],
);

const COAST = trip(
  { units: 'miles' },
  ['San Francisco', '37.7749', '-122.4194', 'Pick up the car on Saturday morning'],
  ['Santa Cruz', '36.9741', '-122.0308', 'Lunch on the wharf'],
  ['Monterey', '36.6002', '-121.8947', 'The aquarium opens at 9:30'],
  ['Big Sur', '36.2704', '-121.8081', 'Fill up in Carmel: no gas for sixty miles'],
  ['San Simeon', '35.6852', '-121.1682', 'Elephant seals at Piedras Blancas'],
  ['Santa Barbara', '34.4208', '-119.6982', 'Two nights at the Agave Inn'],
  ['Los Angeles', '34.0522', '-118.2437', 'Car back at LAX by noon on Friday'],
);

const HIGHLANDS = trip(
  {},
  ['Edinburgh', '55.9533', '-3.1883', 'Pick up the rental car on Leith Walk'],
  ['Pitlochry', '56.7024', '-3.7349', 'The salmon ladder and a dram at Blair Athol'],
  ['Inverness', '57.4778', '-4.2247', 'Two nights; Loch Ness cruise on day two'],
  ['Portree', '57.4125', '-6.1964', 'Old Man of Storr at sunrise'],
  ['Fort William', '56.8198', '-5.1052', 'The Jacobite steam train, booked for 10:15 am'],
  ['Glencoe', '56.6826', '-5.1023', 'The Lost Valley walk, three hours'],
  ['Glasgow', '55.8642', '-4.2518', 'Drop the car at the airport'],
);

const ROME = trip(
  { route: 'dots' },
  ['Colosseum', '41.8902', '12.4922', 'Timed tickets include the Forum and the Palatine'],
  ['Pantheon', '41.8986', '12.4769', 'Free on the first Sunday; go when it rains'],
  ['Trevi Fountain', '41.9009', '12.4833', 'Before eight in the morning, or not at all'],
  ['Vatican Museums', '41.9065', '12.4536', 'Closed on Sundays; the Sistine Chapel is last'],
  ['Santa Maria in Trastevere', '41.8894', '12.4703', 'Dinner nearby at Da Enzo; no reservations, line up at seven'],
);

const WEEKEND = trip(
  { units: 'km' },
  ['Nyhavn', '55.6798', '12.5907', 'Friday, November 6, 6 pm: drop the bags, dinner on the quay'],
  ['Rosenborg Castle', '55.6858', '12.5773', 'Saturday at 10 am: the crown jewels are in the basement'],
  ['Torvehallerne', '55.6838', '12.5701', 'Smørrebrød for lunch at the market halls'],
  ['Tivoli Gardens', '55.6737', '12.5681', 'The Halloween lanterns are up into November; buy the ride pass'],
  ['Christiansborg', '55.6761', '12.58', 'Sunday morning: the tower is free and the view is the best in town'],
  ['Christiania', '55.6738', '12.5992', 'Walk, do not photograph; coffee at Månefiskeren'],
  ['Reffen', '55.6935', '12.6085', 'Street food by the water, then the harbor bus back for the 5:40 pm train'],
);

const ICELAND = trip(
  {},
  ['Reykjavík', '64.1466', '-21.9426', 'Pick up the 4×4 at Keflavík on Monday, June 1'],
  ['Vík', '63.4186', '-19.006', 'Reynisfjara black beach: stay well back from the waves'],
  ['Jökulsárlón', '64.0784', '-16.2306', 'Icebergs in the lagoon; Diamond Beach across the road'],
  ['Höfn', '64.2539', '-15.2082', 'Langoustine soup at Pakkhús; fill the tank'],
  ['Egilsstaðir', '65.2653', '-14.3948', 'The last supermarket before the north: stock up'],
  ['Mývatn', '65.6439', '-16.9118', 'Two nights; the Nature Baths after dark'],
  ['Akureyri', '65.6835', '-18.0878', 'Whale watching at 9 am, warm layers'],
  ['Borgarnes', '64.5383', '-21.9206', 'The Settlement Center, then lunch'],
  ['Reykjavík', '64.1466', '-21.9426', 'Car back by 4 pm on Wednesday, June 10'],
);

const CRAWL = trip(
  { units: 'km' },
  ['Leo Burdock', '53.3427', '-6.2707', 'Meet at noon, Saturday, March 14; fish and chips from Dublin’s oldest chipper'],
  ['Queen of Tarts', '53.3441', '-6.2672', 'A slice of the lemon meringue, to share'],
  ['Temple Bar Food Market', '53.3451', '-6.2652', 'Saturday stalls in Meeting House Square: crêpes and cheese'],
  ['Fallon & Byrne', '53.343', '-6.2644', 'The food hall: brown bread and a wedge of Irish cheddar'],
  ['The Pepper Pot', '53.3422', '-6.2622', 'Scones in the café over the Powerscourt courtyard'],
  ['Murphy’s Ice Cream', '53.3425', '-6.2604', 'Brown bread ice cream, a scoop each'],
  ['Bewley’s', '53.3415', '-6.2597', 'Hot chocolate under the Harry Clarke windows; taxis on Grafton Street'],
);

const YOSEMITE = trip(
  { units: 'miles' },
  ['Happy Isles', '37.7317', '-119.5585', 'Shuttle stop 16; start by 7:30 am on Saturday, June 20'],
  ['Vernal Fall footbridge', '37.7277', '-119.5502', 'Water and restrooms here, the last for a while'],
  ['Vernal Fall', '37.7276', '-119.5441', 'The Mist Trail: 600 granite steps, bring a rain shell'],
  ['Nevada Fall', '37.7249', '-119.5332', 'Lunch on the slabs above the fall, away from the edge'],
  ['Clark Point', '37.7277', '-119.5393', 'Down by the John Muir Trail: gentler on the knees'],
  ['Happy Isles', '37.7317', '-119.5585', 'About 7 miles and 2,000 feet; six hours with stops'],
);

const LOIRE = trip(
  { units: 'km' },
  ['Orléans', '47.903', '1.9093', 'Bikes from Loire Vélo Nature, Monday, September 7'],
  ['Beaugency', '47.7783', '1.6331', 'Coffee under the old bridge'],
  ['Blois', '47.5861', '1.3359', 'The château’s staircase; the night at Hôtel Anne de Bretagne'],
  ['Chaumont-sur-Loire', '47.4806', '1.1828', 'The garden festival runs until November 1'],
  ['Amboise', '47.4125', '0.9822', 'Clos Lucé, where Leonardo died; a rest day'],
  ['Tours', '47.3941', '0.6848', 'Rillettes and a Vouvray in Place Plumereau'],
  ['Villandry', '47.34', '0.5136', 'The kitchen gardens, then the levee all the way to Saumur'],
  ['Saumur', '47.26', '-0.0769', 'Bikes back by 6 pm on Saturday, September 12'],
);

const COLLEGES = trip(
  {},
  ['Yale', '41.3163', '-72.9223', 'Monday, April 13: tour at 10 am, info session at 11'],
  ['Brown', '41.8268', '-71.4025', 'Tuesday at 1 pm; lunch on Thayer Street first'],
  ['Harvard', '42.377', '-71.1167', 'Wednesday at 9:30 am; park at Harvard Square'],
  ['MIT', '42.3601', '-71.0942', 'Wednesday at 2 pm; the Infinite Corridor'],
  ['Dartmouth', '43.7044', '-72.2887', 'Thursday at 10 am; ask about the D-Plan'],
  ['Williams', '42.7128', '-73.2032', 'Friday at 11 am, then home on Route 2'],
);

const JAPAN = trip(
  { units: 'km' },
  ['Tokyo', '35.6812', '139.7671', 'Arrive Sunday, March 29, for the cherry blossoms; start the rail pass on day four'],
  ['Hakone', '35.2326', '139.1069', 'One night at a ryokan; Fuji from Lake Ashi if it is clear'],
  ['Kyoto', '34.9858', '135.7588', 'Four nights; Fushimi Inari before seven'],
  ['Nara', '34.6851', '135.843', 'A day trip; the deer bow if you bow first'],
  ['Osaka', '34.6687', '135.5013', 'Dōtonbori at night: takoyaki and okonomiyaki'],
  ['Hiroshima', '34.3955', '132.4536', 'The Peace Memorial Museum; give it the morning'],
  ['Miyajima', '34.2959', '132.3199', 'The floating torii at high tide, around 6 pm'],
);

const CAMINO = trip(
  { units: 'km' },
  ['Sarria', '42.781', '-7.414', 'Get the credencial stamped; the last 100 km begin here'],
  ['Portomarín', '42.8075', '-7.6159', 'Day 1, 22 km: down the steps into town over the reservoir'],
  ['Palas de Rei', '42.8735', '-7.869', 'Day 2, 25 km: the longest climb of the week'],
  ['Melide', '42.914', '-8.015', 'Day 3, 15 km: pulpo at Pulpería Ezequiel'],
  ['Arzúa', '42.9265', '-8.1636', 'Day 4, 14 km: buy the cheese'],
  ['O Pedrouzo', '42.905', '-8.363', 'Day 5, 19 km: early to bed'],
  ['Santiago de Compostela', '42.8806', '-8.5446', 'Day 6, 20 km: the pilgrims’ Mass at noon, the Compostela at the office'],
);

const FILMS = trip(
  { units: 'miles' },
  ['Tom’s Restaurant', '40.8054', '-73.9654', 'Seinfeld’s diner, 2880 Broadway; breakfast here'],
  ['The Dakota', '40.7766', '-73.9762', 'Rosemary’s Baby; look, do not knock'],
  ['Bow Bridge', '40.7756', '-73.9712', 'In more films than anyone has counted, and a dozen proposals a day'],
  ['Tiffany & Co.', '40.7625', '-73.9739', 'Breakfast at Tiffany’s: a croissant on Fifth Avenue at dawn'],
  ['90 Bedford Street', '40.7324', '-74.0054', 'The outside of the Friends building'],
  ['Katz’s Delicatessen', '40.7223', '-73.9874', 'When Harry Met Sally: the table has a sign over it'],
  ['Hook & Ladder 8', '40.7196', '-74.0066', 'The Ghostbusters firehouse, 14 North Moore Street'],
);

const WEDDING = trip(
  { route: 'dots' },
  ['Villa del Balbianello', '45.9663', '9.2027', 'The ceremony, Saturday, September 12, at 4 pm; the boat leaves Lenno at 3:15'],
  ['Villa Carlotta', '45.9862', '9.2316', 'Friday’s welcome drinks in the gardens, from 6:30 pm'],
  ['Bellagio', '45.9859', '9.261', 'Most rooms are held here: ask for “Asha and Marco” at Hotel Du Lac'],
  ['Varenna', '46.0098', '9.2848', 'Trains from Milano Centrale; the ferry is across the square'],
  ['Como San Giovanni', '45.8091', '9.0732', 'Trains from Milan in 40 minutes; the slow boat up the lake takes two hours'],
  ['Milan Malpensa', '45.6301', '8.7231', 'The nearest airport; a car to Lenno is about 90 minutes'],
);

export const templates = (): Template[] => [
  { id: 'weekend', name: t('A weekend in Copenhagen'), blurb: t('Friday night to Sunday’s train, on foot, in kilometers.'), doc: WEEKEND },
  { id: 'iceland', name: t('Iceland’s Ring Road'), blurb: t('Ten days around the island by car, each leg in hours of driving.'), doc: ICELAND },
  { id: 'crawl', name: t('A Dublin food crawl'), blurb: t('Seven places to eat in one afternoon, west to east, a short walk between each.'), doc: CRAWL },
  { id: 'hike', name: t('Yosemite’s Mist Trail loop'), blurb: t('Two waterfalls on a day hike from Happy Isles and back, in miles.'), doc: YOSEMITE },
  { id: 'cycling', name: t('The Loire by bike'), blurb: t('Orléans to Saumur in six days, château to château, in kilometers.'), doc: LOIRE },
  { id: 'colleges', name: t('A college tour'), blurb: t('Six campuses in New England in a week, a tour booked at each.'), doc: COLLEGES },
  { id: 'portugal', name: t('A week in Portugal'), blurb: t('Lisbon to Porto by car, in kilometers, a tip at every stop.'), doc: PORTUGAL },
  { id: 'coast', name: t('Down the Pacific coast'), blurb: t('San Francisco to Los Angeles on Highway 1, in miles.'), doc: COAST },
  { id: 'highlands', name: t('The Scottish Highlands'), blurb: t('A loop from Edinburgh, each leg in hours of driving.'), doc: HIGHLANDS },
  { id: 'rome', name: t('Rome, the places to see'), blurb: t('Places as dots, not a route: what to see and when to go.'), doc: ROME },
  { id: 'japan', name: t('Japan by rail'), blurb: t('Tokyo to Miyajima in the cherry blossom, by bullet train.'), doc: JAPAN },
  { id: 'camino', name: t('The last 100 km of the Camino'), blurb: t('Sarria to Santiago on foot, a stage a day.'), doc: CAMINO },
  { id: 'films', name: t('New York in the movies'), blurb: t('Seven film and TV locations, uptown to downtown, in a day.'), doc: FILMS },
  { id: 'wedding', name: t('A wedding on Lake Como'), blurb: t('For the guests: where the wedding is, where to sleep, how to get there.'), doc: WEDDING },
];
