// Jawahar Kala Kendra walkthrough (round 23): the real photo, diagram and details used
// when the kund is documented live during the demo. See DemoContext JKK_* actions and
// the Walkthrough section of Demo controls.
export const JKK_NAME = 'Kund (Madhyavarti), Jawahar Kala Kendra';
export const isJkk = (space) => !!space && /Jawahar Kala Kendra/i.test(space.name || '');

// Where the photo was taken: the centre of the kund (OpenStreetMap outline, way 1146531080).
export const JKK_POINT = { lat: 26.87632, lng: 75.80914, label: 'at Jawahar Kala Kendra, JLN Marg' };
// About 31 m square: a third of the ~94 m main square of Correa's nine-square plan.
export const JKK_SHAPE = { mode: 'rect', pts: [{ x: -15.5, y: 15.5 }, { x: 15.5, y: 15.5 }, { x: 15.5, y: -15.5 }, { x: -15.5, y: -15.5 }], r: 17 };

export const JKK_PHOTO = {
  id: 'jkk-photo',
  src: 'demo/jkk-kund-steps.jpg',
  alt: 'A person reading on the red sandstone steps of the kund at Jawahar Kala Kendra, with the high sandstone wall behind',
};
export const JKK_DIAGRAM_FILE = 'jkk-axonometric-and-plan.png';
export const JKK_DIAGRAM = {
  src: 'demo/jkk-spatial-diagram.png',
  label: 'Axonometric of the kund over the nine-square plan',
  alt: 'Exploded axonometric drawing: the stepped central square of Jawahar Kala Kendra lifted above the full nine-square plan, with the pivoted entrance square at the bottom',
};

// What "Fill with Jawahar Kala Kendra details" puts in the questionnaire.
export const JKK_FIELDS = {
  name: JKK_NAME,
  type: 'courtyard',
  feelings: 'Calm and open between events; full and loud at festivals. Enclosed on all sides by the 8 m walls of the squares around it.',
  transition: 'From the shaded galleries of the surrounding squares you step out into the open-to-sky centre and down its stepped platforms.',
  materiality: ['Sandstone', 'Marble'],
  sensory: 'Glare and heat off the sandstone at midday; sound carries between the high walls',
  activity: 'Performances, festivals and craft fairs; between events people sit on the steps to read or wait',
  materials: 'Open to the sky with little shade. Designed by Charles Correa for the Government of Rajasthan, 1986–92',
};

// Experiences from other members (the "lots of votes" step).
export const JKK_COMMUNITY = [
  { userId: 'u-c2', onSite: true, text: 'Came for an evening performance. Every step was taken and people stood along the top edge.', answers: { use: 'Became a gathering spot', feel: ['Busy', 'Welcoming'], senses: ['Noisy'], access: 'Some difficulty', fix: 'Shade', need: 7, why: ['Underutilized'] } },
  { userId: 'u-c3', onSite: true, text: 'At midday it is empty and the stone is too hot to sit on. It needs shade if it is going to be used outside events.', answers: { use: 'Just passed through', feel: ['Exposed'], senses: ['Too hot'], access: 'Easy', fix: 'Shade', need: 8, why: ['Unused'] } },
  { userId: 'u-a2', onSite: true, text: 'During Lokrang the steps fill completely. With that many people the 8 m walls trap the heat and sound; most of the year it sits empty.', answers: { use: 'Became a gathering spot', feel: ['Busy'], senses: ['Noisy', 'Too hot'], access: 'Some difficulty', fix: 'Shade', need: 6, why: ['Underutilized'] } },
];
export const JKK_EXTRA_VOTES = 24; // other members' votes, so the space ranks high

// The contest the local authority hosts.
export const JKK_CONTEST = {
  brief: 'Make the kund usable every day, not only during festivals: shade, air movement and seating that keep the stepped amphitheatre and Correa’s open-to-sky centre intact.',
  budget: '6000',
  shortlistPay: '400',
  criteria: 'Keeps the open-to-sky centre and the steps\nShade and cooling that work at midday in May\nBuildable within the budget',
};
// Concepts from other architects, so the host has something to shortlist.
export const JKK_ENTRIES = [
  { architectId: 'u-a2', title: 'Shade sails on the top edge', summary: 'Four tensioned sails rigged from the 8 m walls, raised for festivals and lowered at midday.' },
  { architectId: 'u-a3', title: 'A cooling channel in the lowest step', summary: 'A shallow water channel around the bottom tier, fed by rainwater stored under the stage.' },
];
