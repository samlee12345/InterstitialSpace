// "Pass through or gather": each experience can say how people use the space.
// Designers use it to find thresholds that have grown into gathering places.
export const USE_OPTIONS = ['Just passed through', 'People stop a while', 'Became a gathering spot'];
export const GATHERING = USE_OPTIONS[2];

export function gatheringOf(spaceId, comments) {
  const said = comments.filter((c) => c.spaceId === spaceId && !c.archived && c.answers?.use);
  const counts = Object.fromEntries(USE_OPTIONS.map((o) => [o, said.filter((c) => c.answers.use === o).length]));
  // Half or more of the people who answered call it a gathering spot.
  const isGathering = said.length > 0 && counts[GATHERING] * 2 >= said.length;
  return { total: said.length, counts, isGathering };
}

export function gatheringSummary(g) {
  if (!g.total) return 'Not answered yet';
  return USE_OPTIONS.filter((o) => g.counts[o]).reverse()
    .map((o) => `${o.toLowerCase()}: ${g.counts[o]}`).join(', ')
    .replace(/^./, (c) => c.toUpperCase()) + ` (of ${g.total})`;
}
