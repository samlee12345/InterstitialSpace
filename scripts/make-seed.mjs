// Regenerates src/data/seed.json. Run with: npm run seed
// Everything here is PLACEHOLDER content for the class demo.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../src/data/seed.json', import.meta.url));

const users = [
  { id: 'u-a1', name: 'Architect A (you)', role: 'architect', points: 38, verified: false, licence: 'Licensed architect (placeholder no.)', reviewsThisYear: 0, paidOut: 64 },
  { id: 'u-a2', name: 'Architect B', role: 'architect', points: 62, verified: true, licence: 'Licensed architect (placeholder no.)', reviewsThisYear: 6, paidOut: 0 },
  { id: 'u-a3', name: 'Architect C', role: 'architect', points: 51, verified: true, licence: 'Licensed architect (placeholder no.)', reviewsThisYear: 11, paidOut: 0 },
  { id: 'u-a4', name: 'Architect D (student)', role: 'architect', points: 12, verified: false, licence: 'Accredited student (placeholder)', reviewsThisYear: 0, paidOut: 0 },
  { id: 'u-c1', name: 'Community member 1 (you)', role: 'community', points: 6.5 },
  { id: 'u-c2', name: 'Community member 2', role: 'community', points: 14.25 },
  { id: 'u-c3', name: 'Community member 3', role: 'community', points: 3.125 },
  { id: 'u-p1', name: 'Heritage Trust (placeholder org)', role: 'paid', points: 120, paid: true, freeModelsLeft: 10 },
].map((u) => ({ lifetime: u.points, ...u }));

const photographers = ['u-c1', 'u-c2', 'u-c3', 'u-a2', 'u-a4'];
const photos = (spaceId, n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${spaceId}-ph${i + 1}`,
    credit: photographers[(i + spaceId.length + Number(spaceId.slice(1))) % photographers.length],
    onSite: i % 4 !== 3,
  }));

const q = (feelings, transition, materiality, sensory) => ({ feelings, transition, materiality, sensory });
const props = (activity, materials, climate, authorship) => ({ activity, materials, climate, authorship });

// [id, name, type, lat, lng, status, photoCount, diagram, uploadedBy, votes, extra]
const spaceRows = [
  ['s1', 'Stepwell landing, Amer Road side', 'stepwell', 26.9512, 75.8478, 'approved', 12, { source: 'ai' }, 'u-c2', 41],
  ['s2', 'Haveli courtyard, Chandpole lane', 'courtyard', 26.9268, 75.8094, 'approved', 9, { source: 'architect', by: 'u-a2' }, 'u-c1', 33],
  ['s3', 'Chowk steps, Badi Chaupar corner', 'chowk steps', 26.9239, 75.8267, 'approved', 11, { source: 'ai' }, 'u-c3', 57],
  ['s4', 'Gateway threshold, Jaipur Darwaza (east side)', 'gateway threshold', 26.9196, 75.8312, 'approved', 8, { source: 'architect', by: 'u-a3' }, 'u-c2', 28],
  ['s5', 'Stepwell terrace, Nahargarh foothill', 'stepwell', 26.9361, 75.8153, 'approved', 10, { source: 'ai' }, 'u-c1', 22],
  ['s6', 'Temple plinth steps, Johari Bazaar lane', 'chowk steps', 26.9214, 75.8243, 'approved', 7, { source: 'architect', by: 'u-a2' }, 'u-c3', 19],
  ['s7', 'Courtyard passage, Kishanpole lane', 'courtyard', 26.9207, 75.8139, 'pending', 6, { source: 'architect', by: 'u-a3' }, 'u-c2', 9],
  ['s8', 'Gateway niche, Jaipur Darwaza (west side)', 'gateway threshold', 26.9194, 75.8301, 'pending', 6, null, 'u-c1', 12],
  ['s9', 'Shopfront otla, Tripolia Bazaar', 'threshold', 26.9247, 75.8221, 'pending', 3, null, 'u-c3', 4],
  ['s10', 'Chowk well platform, Chhoti Chaupar', 'chowk steps', 26.9243, 75.8176, 'pending', 11, null, 'u-c2', 15],
  ['s11', 'Haveli entrance steps, Gangori Bazaar', 'gateway threshold', 26.9291, 75.8201, 'pending', 4, null, 'u-a2', 2, { private: true }],
  ['s12', 'Stepwell side steps, Nahargarh foothill', 'stepwell', 26.9363, 75.8155, 'pending', 10, { source: 'ai' }, 'u-c3', 6],
  // Two spaces right by the east gateway, so "nearby" and "spaces within spaces" have examples.
  ['s13', 'Bench ledge inside the Jaipur Darwaza arch', 'threshold', 26.91965, 75.83105, 'approved', 7, { source: 'architect', by: 'u-a1' }, 'u-c2', 14, { parentId: 's4' }],
  ['s14', 'Chai stall steps outside Jaipur Darwaza', 'chowk steps', 26.91952, 75.83085, 'pending', 4, null, 'u-c1', 5],
];

const qa = [
  q('Calm, a place to pause out of the traffic', 'A sudden drop from the street into shade', 'Worn sandstone, lime plaster', 'Cool air, echo, pigeons'),
  q('Protected, slightly hidden', 'Narrow lane opens into light', 'Painted plaster, stone paving', 'Cooking smells, quiet at noon'),
  q('Busy and social', 'Steps lift you above the bazaar', 'Pink-washed masonry, stone treads', 'Horns, vendors, warm stone'),
  q('In between — neither inside nor outside the walled city', 'Compression under the arch', 'Sandstone, iron studs on the door', 'Draft through the gate, dust'),
];

const spaces = spaceRows.map(([id, name, type, lat, lng, status, n, diagram, uploadedBy, votes, extra], i) => {
  const ph = photos(id, n);
  return {
    id, name, type, lat, lng, status,
    readyForApproval: status === 'pending' && !!diagram,
    uploadedBy, votes,
    photos: ph,
    questionnaire: qa[i % qa.length],
    properties: props(
      ['Waiting and resting', 'Children playing', 'Selling and sitting', 'Passing through'][i % 4],
      ['Sandstone', 'Lime plaster', 'Stone paving', 'Brick and plaster'][i % 4],
      ['Shaded most of the day', 'Hot at midday', 'Breezy in the evening', 'Floods in monsoon'][i % 4],
      'Unknown / vernacular',
    ),
    diagram: diagram
      ? { ...diagram, credits: diagram.source === 'ai' ? [...new Set(ph.map((p) => p.credit))] : [] }
      : null,
    city: 'Jaipur',
    country: 'India',
    // Spread over the summer and autumn so "Latest added" has something to sort.
    addedAt: new Date(Date.UTC(2026, 5, 1) + ((i * 37) % 160) * 86400000).toISOString().slice(0, 10),
    removed: false,
    removal: null,
    private: false,
    parentId: null,
    ...(extra || {}),
  };
});

const seed = {
  _note: 'PLACEHOLDER DATA — invented for a class demo. Not real documentation, people, prices or organisations.',
  config: {
    priceLabel: '$XX', priceValue: 40, fullRightsMultiplier: 10,
    modelPointsCost: 100, architectShare: 0.8, hostingShare: 0.15,
    paidFreeModels: 10, paidTierPointsCost: 50,
    duplicateRadiusM: 50, aiDiagramMinPhotos: 10, manualDiagramMinPhotos: 5,
    moderatorPoints: 50, reviewsRequired: 10, surplusPoolPlaceholder: 10000,
  },
  users,
  spaces,
  redesigns: [
    { id: 'r1', spaceId: 's1', architectId: 'u-a1', title: 'Shaded rest ledges for the stepwell landing', description: 'Stone ledges and a light canopy so people can sit out of the sun without blocking the steps.', files: ['plans.pdf', 'sections.pdf', 'model.3dm'], version: 1, published: true, takenDown: false, sales: 3 },
    { id: 'r2', spaceId: 's3', architectId: 'u-a1', title: 'Chowk steps as evening seating', description: 'Widened treads, a handrail and low lighting for the hours when the chowk is busiest.', files: ['drawings.pdf', 'model.skp'], version: 1, published: true, takenDown: false, sales: 1 },
    { id: 'r3', spaceId: 's2', architectId: 'u-a2', title: 'Courtyard water channel and jaali screen', description: 'Brings back a shallow water channel and adds a screen for shade and privacy.', files: ['set-v2.pdf', 'model.3dm'], version: 2, published: true, takenDown: false, sales: 5 },
    { id: 'r4', spaceId: 's4', architectId: 'u-a3', title: 'Threshold benches and drinking water point', description: 'Two benches inside the gate and a public water point for people waiting.', files: ['drawings.pdf'], version: 1, published: true, takenDown: false, sales: 2 },
    { id: 'r5', spaceId: 's1', architectId: 'u-a4', title: 'Stepwell handrail and night lighting', description: 'A continuous handrail and shielded lights along the main descent.', files: ['student-set.pdf'], version: 1, published: true, takenDown: false, sales: 0 },
    { id: 'r6', spaceId: 's2', architectId: 'u-a1', title: 'Shade sails over the haveli courtyard', description: 'Two tensioned sails anchored to the existing parapets, with a ground-level bench along the north wall.', files: ['sails-plan.pdf', 'section.pdf'], version: 1, published: true, takenDown: false, sales: 0 },
  ],
  models: [
    { id: 'm1', spaceId: 's1', title: 'Measured model — Stepwell landing, Amer Road side', files: ['plan.dwg', 'section.dwg', 'model.obj'], takenDown: false },
    { id: 'm2', spaceId: 's2', title: 'Measured model — Haveli courtyard, Chandpole lane', files: ['plan.dwg', 'section.dwg', 'model.obj'], takenDown: false },
    { id: 'm3', spaceId: 's4', title: 'Measured model — Gateway threshold, Jaipur Darwaza (east side)', files: ['plan.dwg', 'section.dwg'], takenDown: false },
  ],
  contests: [
    {
      id: 'c1', spaceId: 's2', status: 'live', title: 'A shared courtyard for Chandpole lane',
      brief: 'Residents voted this courtyard their top priority. Propose a low-cost redesign that keeps it open to the lane, adds shade and seating, and can be built in phases.',
      prize: '$2,500', deadline: '2026-12-20', coHost: 'Heritage Trust (placeholder org)', coHostId: 'u-p1',
      eligibility: 'Licensed architects and accredited architecture students',
      criteria: ['Responds to what residents asked for', 'Buildable within the stated budget', 'Respects the existing structure'],
      entries: [
        { id: 'e1', architectId: 'u-a3', title: 'Courtyard of four thresholds', submittedAt: '2026-11-09' },
        { id: 'e2', architectId: 'u-a4', title: 'Shade first', submittedAt: '2026-11-14' },
      ],
    },
    {
      id: 'c3', spaceId: 's3', status: 'live', title: 'Evening seating for the Badi Chaupar steps',
      brief: 'The chowk steps fill up every evening, but there is nowhere to sit that is not a step. Propose seating and lighting that work with the bazaar, not against it.',
      prize: '$3,000', deadline: '2027-01-15', coHost: 'Walled City heritage cell (placeholder)', coHostId: null,
      eligibility: 'Licensed architects and accredited architecture students',
      criteria: ['Keeps the steps open for passing through', 'Lighting that is safe and not glaring', 'Survives heavy daily use'],
      entries: [
        { id: 'e6', architectId: 'u-a2', title: 'Steps that become seats', submittedAt: '2026-11-10' },
      ],
    },
    {
      id: 'c2', spaceId: 's5', status: 'judging', title: 'Stepwell terrace, Nahargarh foothill',
      brief: 'Make the terrace safe and usable after dark without changing the stepwell itself.',
      prize: '$1,800', deadline: '2026-11-01', coHost: "Ward residents' association (placeholder)", coHostId: null,
      eligibility: 'Licensed architects and accredited architecture students',
      criteria: ['Safety after dark', 'Low maintenance', 'Leaves the stepwell untouched'],
      entries: [
        { id: 'e3', architectId: 'u-a2', title: 'Lantern terrace', submittedAt: '2026-10-18' },
        { id: 'e4', architectId: 'u-a3', title: 'Edge and rail', submittedAt: '2026-10-25' },
        { id: 'e5', architectId: 'u-a4', title: 'Night steps', submittedAt: '2026-10-30' },
      ],
    },
    {
      id: 'c4', spaceId: 's6', status: 'judging', title: 'Plinth steps that drain in the monsoon',
      brief: 'Water pools on the temple plinth steps for weeks every monsoon. Propose a fix for drainage that keeps the steps usable for sitting and selling.',
      prize: '$1,500', deadline: '2026-11-10', coHost: "Johari Bazaar traders' association (placeholder)", coHostId: null,
      eligibility: 'Licensed architects and accredited architecture students',
      criteria: ['Drains within an hour of heavy rain', 'Keeps the steps usable', 'Can be built in the dry season'],
      entries: [
        { id: 'e7', architectId: 'u-a3', title: 'Channels under the treads', submittedAt: '2026-10-28' },
        { id: 'e8', architectId: 'u-a4', title: 'Raised plinth edge', submittedAt: '2026-11-08' },
      ],
    },
    {
      id: 'c5', spaceId: 's4', status: 'closed', title: 'A place to wait at Jaipur Darwaza',
      brief: 'People wait inside the gateway for buses with nowhere to sit and no water. Design benches and a water point that leave the arch clear for traffic on foot.',
      prize: '$2,000', deadline: '2026-08-30', coHost: 'Walled City NGO (placeholder)', coHostId: null,
      eligibility: 'Licensed architects and accredited architecture students',
      criteria: ['Seats at least 12 people', 'Keeps the arch clear', 'Drinking water that is easy to maintain'],
      winner: 'e9',
      entries: [
        { id: 'e9', architectId: 'u-a2', title: 'Benches in the arch', submittedAt: '2026-08-12' },
        { id: 'e10', architectId: 'u-a3', title: 'Waiting wall', submittedAt: '2026-08-20' },
        { id: 'e11', architectId: 'u-a1', title: 'Threshold shade', submittedAt: '2026-08-28', statement: 'A perforated stone canopy over the waiting ledge, with a drinking-water point set into the arch wall.', files: ['entry-boards.pdf', 'canopy-section.pdf'], units: 'Metric (m / mm)', scope: ['Canopy and shade', 'Water and drainage'], cost: '$5,000 to $25,000' },
      ],
      plans: [
        { when: 'Sep 2026', text: 'Winner announced; the co-host bought the design.', done: true },
        { when: 'Oct to Dec 2026', text: 'Design development with the architect and people who wait here.', done: true },
        { when: 'Feb 2027', text: 'Construction of the benches and the water point.', done: false },
        { when: 'Apr 2027', text: 'Opening, then a follow-up survey on the platform.', done: false },
      ],
    },
    {
      id: 'c6', spaceId: 's1', status: 'closed', title: 'Shade for the Amer Road stepwell landing',
      brief: 'The landing is unusable in May and June. Propose shade that can go up in a season and does not hide the stepwell.',
      prize: '$2,200', deadline: '2026-06-30', coHost: "Amer Road residents' welfare association (placeholder)", coHostId: null,
      eligibility: 'Licensed architects and accredited architecture students',
      criteria: ['Shade for the hottest hours', 'Built within one season', 'Keeps views of the stepwell'],
      winner: 'e12',
      entries: [
        { id: 'e12', architectId: 'u-a4', title: 'Canopy of stretched cotton', submittedAt: '2026-06-14' },
        { id: 'e13', architectId: 'u-a2', title: 'Stone pergola', submittedAt: '2026-06-25' },
      ],
      plans: [
        { when: 'Jul 2026', text: 'Winner announced; the co-host bought the design.', done: true },
        { when: 'Sep 2026', text: 'Canopy built by the residents’ association.', done: true },
        { when: 'Dec 2026', text: 'Check-in with residents on how the shade is working.', done: false },
      ],
    },
  ],
  comments: [
    { id: 'cm1', spaceId: 's1', userId: 'u-c2', text: 'We sit here every evening. It needs shade in May and June.', onSite: true },
    { id: 'cm2', spaceId: 's1', userId: 'u-c3', text: 'The lower steps are slippery after rain.', onSite: false },
    { id: 'cm3', spaceId: 's1', userId: 'u-a2', text: 'The landing proportions are worth keeping exactly as they are.', onSite: true },
    { id: 'cm4', spaceId: 's2', userId: 'u-c1', text: 'Children play here after school. Please keep it open to the lane.', onSite: true },
    { id: 'cm5', spaceId: 's2', userId: 'u-c2', text: 'A water tap would change everything.', onSite: true },
    { id: 'cm6', spaceId: 's3', userId: 'u-c3', text: 'Best place to watch the bazaar. Nowhere to sit that is not a step.', onSite: true },
    { id: 'cm7', spaceId: 's3', userId: 'u-c1', text: 'Too dark at night.', onSite: false },
    { id: 'cm8', spaceId: 's4', userId: 'u-c2', text: 'People wait here for buses with no bench.', onSite: true },
    { id: 'cm9', spaceId: 's8', userId: 'u-c1', text: 'This niche is used by a tea seller every morning.', onSite: true },
    { id: 'cm10', spaceId: 's10', userId: 'u-c2', text: 'The well platform is where the lane meets. It deserves attention.', onSite: true },
  ],
  coopDecisions: [
    { id: 'd1', title: 'Should next year’s paid-tier price stay the same?', status: 'open', closes: '2026-12-15', result: null, votes: {} },
    { id: 'd2', title: 'Use part of the 2026 surplus to lend out scanning equipment', status: 'closed', closes: '2026-10-01', result: 'Passed — 64% yes', votes: { 'u-a1': 'Yes', 'u-c1': 'Yes', 'u-a2': 'No', 'u-p1': 'Yes' } },
    { id: 'd3', title: 'Let off-site comments and votes earn half points', status: 'closed', closes: '2026-08-12', result: 'Passed — 71% yes', votes: { 'u-a1': 'No', 'u-c1': 'Yes', 'u-a2': 'Yes', 'u-p1': 'Yes' } },
  ],
  notifications: [
    { id: 'n1', to: 'u-a1', type: 'sale', text: 'Your redesign “Shaded rest ledges for the stepwell landing” was bought. You earn 80% of $XX.', read: false },
    { id: 'n2', to: 'u-a1', type: 'contest', text: 'Results are in for “Stepwell terrace, Nahargarh foothill”: judging has started.', read: false },
    { id: 'n3', to: 'u-a1', type: 'points', text: '+5 points for publishing “Chowk steps as evening seating”.', read: true },
    { id: 'n4', to: 'u-a1', type: 'ranking', text: 'You moved up to rank 3 of 4 architects.', read: true },
    { id: 'n5', to: 'u-a1', type: 'coop', text: 'New co-op decision open for voting: paid-tier price.', read: false },
    { id: 'n6', to: 'u-a1', type: 'removal', text: 'Removal request for a space you contributed to is under team review.', read: true },
    { id: 'n7', to: 'u-a1', type: 'sale', text: '“Courtyard water channel and jaali screen” has an edited version. Update it from My purchases.', read: false },
    { id: 'n8', to: 'u-c1', type: 'points', text: 'Your photos of “Haveli courtyard, Chandpole lane” qualified. +4.5 points.', read: false },
    { id: 'n9', to: 'u-c1', type: 'coop', text: 'New co-op decision open for voting: paid-tier price.', read: false },
    { id: 'n10', to: 'u-a2', type: 'points', text: '+2 points for a moderator review.', read: false },
    { id: 'n11', to: 'u-a2', type: 'sale', text: 'Your redesign “Courtyard water channel and jaali screen” was bought.', read: true },
    { id: 'n12', to: 'u-p1', type: 'contest', text: 'Your contest “A shared courtyard for Chandpole lane” has 2 entries.', read: false },
    { id: 'n13', to: 'u-p1', type: 'coop', text: 'New co-op decision open for voting: paid-tier price.', read: true },
  ],
  moderation: [
    { spaceId: 's7', yes: 2, no: 1, voted: [], duplicates: [], mergeVotes: 0 },
    { spaceId: 's12', yes: 1, no: 0, voted: [], duplicates: ['s5'], mergeVotes: 2 },
    { spaceId: 's8', yes: 0, no: 0, voted: [], duplicates: ['s4'], mergeVotes: 0 },
    { spaceId: 's9', yes: 0, no: 0, voted: [], duplicates: [], mergeVotes: 0 },
    { spaceId: 's10', yes: 0, no: 0, voted: [], duplicates: [], mergeVotes: 0 },
    { spaceId: 's11', yes: 0, no: 0, voted: [], duplicates: [], mergeVotes: 0 },
  ],
  flags: [
    { id: 'f1', itemId: 'r5', reason: 'Handrail dimensions do not match the measured diagram.', status: 'open' },
    { id: 'f2', itemId: 'm3', reason: 'Section appears to be drawn at the wrong scale.', status: 'open' },
  ],
  purchases: [
    { id: 'p-seed1', userId: 'u-a1', itemId: 'r3', kind: 'redesign', title: 'Courtyard water channel and jaali screen', rights: 'licence', method: 'card', amount: '$XX', version: 1, date: '2026-10-28', receipt: 'ISP-000117' },
  ],
  ledger: [
    { id: 'l1', userId: 'u-a1', text: 'Published a redesign', pts: 5 },
    { id: 'l2', userId: 'u-a1', text: 'Published a redesign', pts: 5 },
    { id: 'l3', userId: 'u-a1', text: 'Comment (on site)', pts: 0.25 },
    { id: 'l4', userId: 'u-c1', text: 'Photos qualified (9 × 0.5)', pts: 4.5 },
    { id: 'l5', userId: 'u-p1', text: 'Paid tier, one month', pts: -50 },
  ],
  payouts: [{ id: 'po1', userId: 'u-a1', amount: 64, date: '2026-10-31' }],
  diagramUploads: [{ id: 'm-s13', spaceId: 's13', userId: 'u-a1', date: '2026-10-12', files: ['plan.dwg', 'section.dwg', 'model.obj'], notes: 'Measured with a tape and laser distance meter, cross-checked against a phone scan.' }],
};

// Every photo belongs to an experience (a comment plus optional photos).
// Photographers with no comment on a space get a short placeholder one.
const PHOTO_TEXT = [
  'Took these on my way through in the morning.',
  'Busiest in the late afternoon; these show it then.',
  'Shared these so the AI has enough to draw a diagram.',
  'There is always someone sitting here. Photos from today.',
  'The shade moves fast here. Photos from midday.',
];
seed.spaces.forEach((sp, si) => {
  const byUser = {};
  sp.photos.forEach((ph) => { (byUser[ph.credit] = byUser[ph.credit] || []).push(ph.id); });
  Object.entries(byUser).forEach(([userId, ids], ui) => {
    let c = seed.comments.find((x) => x.spaceId === sp.id && x.userId === userId);
    if (!c) {
      c = { id: `cm-${sp.id}-${userId}`, spaceId: sp.id, userId, text: PHOTO_TEXT[(si + ui) % PHOTO_TEXT.length], onSite: true };
      seed.comments.push(c);
    }
    c.photoIds = ids;
  });
});
seed.comments.forEach((c) => { c.photoIds = c.photoIds || []; });

// When each seeded redesign was published (drives the one-a-week limit).
['2026-08-02', '2026-10-05', '2026-09-14', '2026-07-21', '2026-10-30', '2026-09-20'].forEach((d, i) => { seed.redesigns[i].createdAt = Date.parse(d); });
// Upload details (units, scope, cost) for the seeded redesigns.
const DETAILS = [
  { units: 'Metric (m / mm)', scope: ['Surface and seating', 'Canopy and shade'], cost: '$1,000 to $5,000' },
  { units: 'Metric (m / mm)', scope: ['Surface and seating', 'Lighting'], cost: '$5,000 to $25,000' },
  { units: 'Metric (m / mm)', scope: ['Water and drainage', 'Full spatial reconfiguration'], cost: 'Over $25,000' },
  { units: 'Imperial (ft / in)', scope: ['Tactical / low-cost', 'Surface and seating'], cost: 'Under $1,000' },
  { units: 'Metric (m / mm)', scope: ['Lighting'], cost: 'Not sure' },
  { units: 'Metric (m / mm)', scope: ['Canopy and shade'], cost: '$1,000 to $5,000' },
];
seed.redesigns.forEach((r, i) => { r.details = { ...DETAILS[i], agency: true }; });
// Where each seeded notification leads.
const links = { n1: '/earnings', n2: '/contest/c2', n3: '/points', n4: '/ranking', n5: '/co-op', n6: '/profile', n7: '/purchases', n8: '/space/s2', n9: '/co-op', n10: '/moderation', n11: '/earnings', n12: '/contest/c1', n13: '/co-op' };
seed.notifications.forEach((n) => { n.link = links[n.id]; });

writeFileSync(out, JSON.stringify(seed, null, 2));
console.log(`Wrote ${out}: ${spaces.length} spaces, ${seed.redesigns.length} redesigns, ${seed.models.length} models`);
