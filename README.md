# Interstitial Spaces Platform — grayscale prototype

Clickable wireframe for the Dec 4 class demo. No backend: all data comes from
`src/data/seed.json` and lives in memory. Reloading the page (or "Reset demo
data") puts everything back.

All content is placeholder: spaces, people, organisations and prices are invented.

## Run it

Needs Node 18 or newer.

```
cd interstitial-prototype
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

- `npm run build` then `npm run preview` serves the built version.
- `npm run seed` regenerates `src/data/seed.json` from `scripts/make-seed.mjs`.

## Share it online (GitHub Pages)

Every push to `main` builds the site and publishes it with GitHub Actions
(`.github/workflows/deploy.yml`). One-time setup in the GitHub repo:
Settings > Pages > Build and deployment > Source: **GitHub Actions**.

The link is https://samlee12345.github.io/InterstitialSpace/ . Pages use
`#/` addresses (for example `…/InterstitialSpace/#/space/s1`) so any page can
be shared directly. Each visitor gets their own copy of the demo data, which
resets when they reload.

## Component sandbox

`sandbox.html` (Demo bar, "Open component sandbox") shows versions of a
component side by side, built from the real components, tokens and seed data:
space card layouts and the landing section under the hero. "Preview in the
app" switches the prototype to that version in your browser only. The
defaults everyone sees are in `src/design/choices.js`. To add another
component, follow the comment at the top of `src/sandbox.jsx`.

## Notes and discussions

Press **N** on any page (or "Turn on notes" in the Demo bar) to start the
notes tool, ported from the portfolio. Press N again, click any text, type a
note, then ⌘↵. Press **D** instead for a **discussion**: a point to raise
with the team. Notes are purple and round, discussions are teal and square,
and each kind has its own numbering and its own Copy and Clear menus, each
offering "This page" or "All pages" (so you can clear every note and keep
the discussions). "Copy everything" and "Clear everything" cover both kinds
on every page; clearing asks for confirmation. Both are kept per page in
your browser and survive reloads. Copies are labelled by page and section,
so testers can paste them into a message. Notes never leave the
tester's browser. Each view keeps its own notes (for example the Tabs view of
a space page), and the Demo bar shows the count per page and per view.

## How it is put together

- `src/styles/tokens.css` holds every visual value (grays, type, spacing,
  radius, shadow, layout sizes). `app.css` and the components only read these
  variables. Swap this one file to restyle. The one exception is the 48rem
  breakpoint in `app.css`, because CSS variables can't be used in media queries.
- `src/state/DemoContext.jsx` is the whole "backend": one reducer for roles,
  points, purchases, uploads, votes and notifications.
- `src/lib/points.js` has every point rule.
- **Space page, two views.** The main view is one page: a photo header, a
  contest card (only if the space has a contest; the whole card opens it),
  Spatial diagram, Redesigns, then Experiences (an AI summary of what people
  said, then each person's comment with their photos). The alternative is
  four tabs. Switch in the Demo bar under Space page.
- **Landing, two layouts.** Classic (hero, How it works, co-op, recent
  spaces) and Map first, like OpenCelliD: the map fills the screen with a
  search box and short description. Clicking a pin or a search result zooms
  in and shows that space's card in the panel, with other spaces within
  50 m; the card opens the space. "Use my location" is simulated: under
  Landing > Map first in the Demo bar, choose whether it finds a new place
  (offer to document it) or an existing space (Stepwell terrace). Searching
  for a name that isn't there offers "Add this place".
- **Create new space, three versions** (Demo bar, under Create new space).
  A: Photos, Area, Questionnaire (opens with "Is it one of these nearby
  spaces?"), Review. B: an overlay asks for photos first, then Area, Nearby
  spaces (only if any), Questionnaire, Review, with your photo thumbnails
  (delete, add more) in a side panel. C: like A, but Continue on the Area
  step opens an "Is it one of these nearby spaces?" confirmation overlay.
  Photos must carry location data. On the Area step the photo point stays
  fixed; zoom in and out, and draw the space with four draggable corners or
  a circle (handles also move with the arrow keys, Shift for 5 m steps).
  Nearby spaces are the documented spaces inside the drawn area or within
  5 m of its edge, not a fixed radius around the photo. For each you say:
  same space (adds your photos and a comment to it instead), it is inside my
  new space, my new space is inside it, or not related. Demo bar switches:
  whether the photos have location data, and whether they were taken next
  to documented spaces (by the east Jaipur Darwaza gateway).
- **Spaces within spaces.** A space can be part of another. Its header says
  "Part of …", and the space page lists related spaces (a section on the
  one-page view, a tab on the tabs view). Tabs show counts, e.g.
  "Experiences (5)".
- **Contests** are grouped into Open for entries, Judging and Closed.
  Closed contests show the winner and the co-host's plans (a short
  timeline), on the contest page and on the space page.
- **Map pins** are plain: solid for approved spaces, dashed and hollow for
  pending ones. Space cards show votes, redesigns and photos.
- **Upload redesign / contest entry** is one three-step flow: files and
  description; details and licence (units, scaled to the Base Library,
  intervention scope, optional cost bracket and agency contact, one
  combined attestation); then price and payout with the copyright and buyer
  licence terms. From a live contest ("Submit an entry") the licence
  statement becomes the contest rights transfer and the last step shows the
  prize and rights instead of price.
- **Sign-up.** The header for visitors shows "For architects" and "Log in".
  For architects asks licensed architect or student. Licensed: country,
  register number looked up in that country's register (India CoA, US
  state boards via NCARB, UK ARB), then an ID whose name must match the
  register. Student: school email code, programme checked against
  accreditation lists, graduation year (sets re-verification), and proof of
  enrolment this term. Community sign-up ("Create a free account") stays
  for everyone else.
- **Account.** Contributions lists every space you documented, commented on
  or uploaded to (and removed spaces). Profile is account settings only:
  photo, name and email, plan and verification, Delete account.
- Account pages (Portfolio, Earnings, My purchases, Contributions, Points &
  membership, Profile, plus Moderation, Flag queue and Host a contest for those
  roles) are in the dropdown under your name, top right.
- Demo-only information lives in the Demo bar, not on the pages: whether a
  page is Clickable or Simulated, view switches, and the placeholder notice.
- Confirmations: small pop-ups appear bottom left for six seconds. A
  submission (redesign, diagram, contest entry, experience) also shows a
  banner at the top of the space page, and the contribution is marked "Yours".
- **Demo bar.** The "Demo" pill (bottom right) opens a drawer; the page makes
  room for it instead of being covered. It has the role switcher, **Pages to
  review** (every page and view, marked Clickable or Simulated, with your
  note and discussion counts; opening one switches to a role that can see it; variations such
  as Landing: Classic / Map first and Space page: One page / Tabs are nested
  under their page; Space page also links straight to a space that is
  approved, pending, without a contest, with an ongoing, judging or closed
  contest, and with or without related spaces), and controls: "Make the next payment fail", "Skip ahead
  one week", notes, the sandbox and "Reset demo data". The page list is in
  `src/demo/pages.js`.

Two routes were added to the list in the brief, because uploads start from a
space: `/space/:id/upload-redesign` and `/space/:id/upload-diagram`.

## Demo script (about 8 minutes of the 15)

Navigate with clicks, not the address bar: a page reload resets the data.

1. **Visitor** (1 min). Landing, Browse spaces: list on the left sorted by
   votes, map on the right; hover a card to find its pin. Open "Stepwell
   landing, Amer Road side". No points badges; redesigns are a blurred
   teaser. "See redesigns" opens the sign-up prompt. Choose "Not now", go
   back to Browse: 10 spaces, the rest blurred. (Signing up from a prompt
   returns you to the page you were on.)
2. **Architect** (4 min, the clickable core).
   - Browse, "Gateway niche, Jaipur Darwaza (west side)" (pending, 6 photos,
     no diagram). **Upload redesign**: title, description, "Use sample
     files", then details (units, scaled, scope, attestation), then price
     and licence, Publish. You land back
     on the space with a "Redesign published" banner, the card marked
     "Yours", and +5 points. The upload button is replaced by the
     one-a-week notice ("Skip ahead one week" in the Demo bar lifts it).
   - Same page, **Upload spatial diagram**. Banner, +2 points, the space
     becomes "Ready for approval" and gets a measured model.
   - Open the Demo bar and tick "Make the next payment fail". Open "Gateway
     threshold, Jaipur Darwaza (east side)", "Threshold benches…". Show
     "Full design rights": by agreement, "Ask the architect". Then choose the
     licence, check out, "Fill test card", Pay. **Payment failed**, Retry,
     then the receipt and download.
   - My purchases (name menu): "Update to version 2" on the seeded purchase.
   - Optional: "Haveli courtyard, Chandpole lane", View measured model,
     checkout: 100 points is disabled (not enough points), pay by card.
   - Portfolio: Edit a redesign (new version), Unpublish another.
   - "Haveli courtyard, Chandpole lane" has a **contest banner**: prize,
     entries, Contest details. "Submit an entry" runs the same upload flow with
     the contest rights transfer, then back on the space with your entry
     marked "Yours".
   - Earnings (80% share, Request payout). Notifications: each one opens the
     page it is about.
3. **Community member** (1 min). Browse, "Create new interstitial space" (or the Demo
   bar page list): photos, draw the area around the
   photo point, "Is it one of these nearby spaces?", questionnaire, submit:
   Pending. "Add your experience" opens a three-step overlay: share
   location (on site earns full points), a comment with optional photos,
   then five quick questions ending with "What needs fixing most?". The
   post shows "Needs fixing: …" under the comment. Then vote on site (+0.25).
   On Browse, search by an address or "lat, lon" (e.g. 26.9239, 75.8267)
   to list spaces within 500 m, nearest first.
4. **Moderator** (1 min). Moderation lists only spaces that are ready for
   approval. Review "Courtyard passage" and vote yes: third yes approves it.
   Review "Stepwell side steps": duplicate suggestion, then "No" needs a
   public reason. Flag queue: verify, take down.
5. **Paid account / co-host** (30 s). Points & membership: 10 free downloads.
   Host a contest: private space needs the deed, "Under manual team review",
   skip ahead to judging, pick a winner, escrow and payment summary.
6. **Private owner** (30 s). Any space, "Request removal" at the bottom, upload
   deed, Team review, "Team decides: remove". Switch to Community member,
   Contributions, Removed spaces.
7. Finish on Co-op and Terms. For the AI diagram: open "Chowk well platform,
   Chhoti Chaupar": "Processing…" then a diagram crediting photographers.

For architect testers: set the role to Architect, collapse the Demo bar, and
start them on Browse spaces.

## Decisions I had to assume

Agreed before building:

1. A missing geotag warns and halves points; it does not block (brief wins over the spec).
2. Prices show as "$XX". Earnings needs numbers, so it uses a labelled placeholder of $40 per sale. Contest hosting share placeholder: 15%.
3. The location prompt for comments and votes is simulated with three buttons.
4. The Moderator role is a verified architect (Architect B); their own uploads are hidden from their list.
5. Layout only from the design skill; grayscale, system font, tokens only.

Changed on Nov 16 after review:

6. Full design rights have no fixed price: the buyer messages the architect and they agree price and terms. Only the use + adapt licence goes through checkout.
7. One redesign per architect per week. Spatial diagrams, experiences and contest entries are not limited.
8. Contest prizes show placeholder amounts ($2,500 and $1,800) so the prize is visible.
9. "Most relevant" experiences means contributors with more points first.
10. The moderation list shows only spaces that are ready for approval.

Made while building:

11. Measured models exist for 3 seeded spaces; other diagrams say the model is being prepared. Uploading a diagram creates a model for that space.
12. Architect ranking is ordered by points (open question Q5 in the spec).
13. Unpublished redesigns stay in the architect's own Portfolio under "Unpublished", with "Publish again". Editing creates a new version; buyers see "Update".
14. A space is approved as soon as it has 3 yes votes, and marked "Did not qualify" at 3 no votes. Upload points are awarded to the contributor at approval.
15. Paid tier costs "$XX" a month or 50 points (placeholder rate). The surplus estimate uses a placeholder pool of $10,000 split by lifetime points.
16. Visitors who dismiss the sign-up prompt see the first 10 spaces; the others are blurred.
17. "Is this the same place?" is driven by a simulation control in the create flow and always offers the east-side gateway entry.
18. Contest judging and payout use the seeded judging contest, whichever space was requested.
19. Sign-up signs you in as the demo Community member or Architect A.
20. Downloads are small placeholder text files.
21. Photos added with an experience earn photo points only on spaces that have already qualified.
22. The phone layout is not designed yet.
