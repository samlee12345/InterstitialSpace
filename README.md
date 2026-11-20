# ReSpace (Interstitial Spaces) Platform — grayscale prototype

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

## End-to-end test

`tests/test_pages.py` (Python Playwright) clicks through every flow and every route for every role. Build, serve and run:

```
npm run build
mkdir -p /tmp/site && rm -rf /tmp/site/InterstitialSpace && cp -r dist /tmp/site/InterstitialSpace
(cd /tmp/site && python3 -m http.server 8099 &)
python3 tests/test_pages.py      # ends with "ERRORS: 0"
```

## Current state and gaps

What the prototype does today, what's missing and what's undecided lives in the Claude Doc "Interstitial Spaces prototype: current state and gaps" (copy: `03 - Design Project/Interstitial Spaces prototype - current state and gaps.md`). Update it after every round.

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
the discussions). Each discussion card has "Respond": add the team's
answer under it, and it counts as discussed (its number turns hollow).
Tallies show discussions as discussed/total, e.g. 1/5, in the toolbar and in
the Demo bar, where a page's count is the sum of its views and each space
link shows that space's own count. Copies include the responses.
"Copy everything" and "Clear everything" cover both kinds
on every page; clearing asks for confirmation. Both are kept per page in
your browser and survive reloads. Copies are labelled by page and section,
so testers can paste them into a message. Notes never leave the
tester's browser. Each view keeps its own notes (for example the photo strip
header of a space page), and the Demo bar shows the count per page and per view.

**Discussions tab** in the Demo controls lists every discussion from every
page, grouped by page (and layout) in the same order as the Pages tab, with
discussed/total per page. "Needs a response" shows only open ones; "All"
shows everything with its responses. Select a discussion to go to its page
(switching role and layout if needed); notes turn on and its card flashes.
"Add a response" writes one right there, without leaving the page you're on.

**Fill fields** in the notes toolbar puts sample answers into every empty
field on the page (or in the open dialog): text, selects, radio groups,
"I agree" boxes, the test card and sample files, plus one photo if none has
been added. Use it to click through long forms quickly in the demo.

## How it is put together

- `src/styles/tokens.css` holds every visual value (grays, type, spacing,
  radius, shadow, layout sizes). `app.css` and the components only read these
  variables. Swap this one file to restyle. The one exception is the 48rem
  breakpoint in `app.css`, because CSS variables can't be used in media queries.
- `src/state/DemoContext.jsx` is the whole "backend": one reducer for roles,
  points, purchases, uploads, votes and notifications.
- `src/lib/points.js` has every point rule.
- **Space page: tabs.** Experiences, Spatial diagrams, 3D model, Redesigns,
  Connected spaces, Contests and Archived, each with a count. The header
  reads top to bottom: name and details (with "Designed by" when known),
  the pending notice with a **Moderate** button for architects, then one
  line with the votes to redesign, "Add your experience" and an Options menu (Report an update, Designate
  designer for architects, Request removal of space on platform). Three
  header layouts to compare in the Demo bar under Space page: a portrait
  photo beside the title (default), a photo strip under it, or compact with
  a thumbnail in the title row.
  - Experiences: one per person per space. Posting again updates yours
    until the space is rebuilt. The overlay has four steps: location (two
    choices: "Share location: I'm here" or "I'm not there: continue"), your
    experience (take or choose photos), quick questions, and "Is this space
    working well, or should it be redesigned?" on a 0–10 scale; 6 or more
    asks why (Unused, Unsafe, Underutilized). Contributors show a Verified
    badge if verified, and when they posted ("3 days ago"); no points.
  - Spatial diagrams: as many as architects upload. 3D model: one per space,
    generated by AI from all the photos, diagrams and uploaded models or
    scans; buy it from the tab, or upload a model or scan to improve it.
  - Votes to redesign come from experiences: rating the redesign need 6 or
    more counts as a vote (there's no separate vote button).
  - Designate designer: an architect names who designed the space (an
    architect on the platform, or someone who isn't); a moderator confirms it under Spaces pending
    approval, then "Designed by" shows in the header.
  - Report an update: someone shows (text and photos) that the space changed
    on the ground ("Submit update", then a confirmation that it went to the
    moderators). A moderator confirms it under Spaces pending approval, then
    every past contribution (votes, photos, experiences, diagrams, redesigns,
    the model) moves to the Archived tab and the counts start again at zero.
    A sample report on Temple plinth steps is waiting for the Moderator.
- **Landing: map first.** For visitors, the first visit opens "What is an
  interstitial space?" with a link to About us. Search takes a place name
  or "lat, lon" (spaces within 500 m). "Use my location" next to an
  existing space still offers "Document a new space here". Clicking a pin shows the
  space's card in the search panel, under the search, with its connected
  spaces (the space it sits in and the spaces inside it). The map fills the screen with a
  search box and short description. Clicking a pin or a search result zooms
  in and shows that space's card in the panel, with other spaces within
  50 m; the card opens the space. "Use my location" is simulated: under
  Landing > Map first in the Demo bar, choose whether it finds a new place
  (offer to document it) or an existing space (Stepwell terrace). Searching
  for a name that isn't there offers "Add this place".
- **About us** explains what an interstitial space is, what the platform is
  trying to do and who it is for. Linked from the visitor header and the
  footer.
- **Create new space, four versions** (Demo bar, under Create new space).
  D is first and the default (round 13). A: Photos, Area, Questionnaire (opens with "Is it one of these nearby
  spaces?"), Review. B: an overlay asks for photos first, then Area, Nearby
  spaces (only if any), Questionnaire, Review, with your photo thumbnails
  (delete, add more) in a side panel. C: like A, but Continue on the Area
  step opens an "Is it one of these nearby spaces?" confirmation overlay.
  D: choose on the map. Select an existing space's dot to open a popover
  and say how it relates (the same choices are listed under the map). "It
  is inside my new space" grows your area to cover it; "my new space is
  inside it" grows your area to reach a little into it; "same space" asks
  to add your experience there instead, then opens that space's experience
  flow with your photos. Continue is blocked until every overlapping space
  has an answer, and the questionnaire skips the nearby-spaces question.
  In D the map shows only the spaces whose area overlaps yours; each gets a
  numbered, colour-coded pin that matches its row in the list. "Not related"
  isn't offered for an overlap: the fourth choice is "They share part of the
  area", shown on both spaces under Connected spaces. Materiality is a
  filterable multi-select of building materials (type to add one that's
  missing). The 3D-scans note is on the Photos step. After "Submit space"
  the header points badge pops and a "+N pending" chip counts up.
  Photos must carry location data. On the Area step the photo point stays
  fixed; zoom in and out, and draw the space with four draggable corners or
  a circle (handles also move with the arrow keys, Shift for 5 m steps).
  The map also draws other spaces' areas. Nearby spaces are those whose
  area overlaps the drawn area (or comes within 5 m of it), not a fixed
  radius around the photo. For each you say:
  same space (adds your photos and a comment to it instead), it is inside my
  new space, my new space is inside it, or not related. Demo bar switches:
  whether the photos have location data, and whether they were taken next
  to documented spaces (by the east Jaipur Darwaza gateway). The
  questionnaire shows a points meter: each optional detail adds 0.25 points.
  Type can be "Other" with a name for the new type. Photos can be taken or
  chosen; surroundings photos and 3D scans are left out for now (scanning
  is planned for the mobile app).
- **Approvals.** Architects approve new spaces: every pending space is
  listed (with its contributor) as soon as it is created, with no diagram
  needed, and can be filtered by city. You can't review a space you
  created. The review page shows four photos, a map of the drawn area with
  any overlapping spaces, the questionnaire and reviewers' notes (visible
  to other reviewers). The vote has a checklist of criteria, can be edited
  later, and a no vote can name an existing space it belongs to; the
  Moderator role can then decline it and move its photos, experiences and
  votes there. The same form opens from "Moderate" on the space page. The header shows "Approvals 3/10": architects keep
  their status by approving 10 spaces every 6 months.
- **Spaces within spaces.** A space can be part of another. Its header says
  "Part of …", and the Related spaces tab lists them.
- **Browse** filters by country and city; the type list only offers types
  found in that place.
- **Contests** are grouped into Open for entries, Judging and Closed. A
  contest page shows how many entries there are, not who entered. Who can
  enter has three versions (Demo bar, under Contest details): licensed
  architects and students, licensed architects only, or students only
  (paired with a licensed architect after). A Demo bar switch makes the
  signed-in architect licensed or a student, to see the entry gate.
  Closed contests show the winner and the co-host's plans (a short
  timeline), on the contest page and on the space page.
- **Map pins** are plain: solid for approved spaces, dashed and hollow for
  pending ones. Space cards show votes, redesigns and photos.
- **Round 22: Jawahar Kala Kendra kund (/space/s16).** A real place, set up
  accurately for the demo: the open-to-sky central square (the Sun square,
  used as the open-air theatre, Madhyavarti) of Charles Correa's nine-square
  arts centre in Jaipur (1986–92), with its red sandstone steps, 8 m walls
  and white marble coping. Location is the centre of the main square in the
  OpenStreetMap outline (26.87632, 75.80914); its size, about 31 m square, is
  a third of that ~94 m main square. It has a real experience photo
  (public/demo/jkk-kund-steps.jpg) and a real spatial diagram
  (public/demo/jkk-spatial-diagram.png). Photos and diagrams in the seed can
  now carry `src` (and `alt`); `ImageBox` shows the image when there is one
  and the labelled placeholder otherwise. The two experiences and the people
  posting them are demo personas.
- **Round 21: real map, ReSpace.** The map on the landing page, Browse and
  the contest space picker is a real map: Leaflet with OpenStreetMap tiles shown
  in greyscale (src/components/RealMap.jsx; `MapBox` keeps its old
  props). Pins are still our own buttons and links placed at each space's
  coordinates; pins only metres apart are nudged so each stays clickable.
  Scroll-wheel zoom is off so the page scrolls; use the +/- buttons or drag.
  The search radius around a "lat, lon" search is drawn to scale. The area
  map when documenting a space and the map on Review a space are still
  placeholders. The product is now called ReSpace (header, footer, page
  titles). Approvals, notifications and the account menu in the header are
  styled like the nav links instead of buttons. Tests serve a blank tile for
  map tile requests, so they run offline.
- **Round 20: Editorial theme (optional).** Demo controls › Controls ›
  Theme switches between "Grayscale (default)" and "Editorial": a serif type
  stack, black pill buttons, 24px rounded cards with a soft shadow, pill tabs
  and badges, and soft gradient image placeholders. The theme lives in
  src/styles/theme-editorial.css, scoped to `html[data-theme="editorial"]`;
  the attribute is set from the `theme` design choice in
  src/design/choices.js. The choice is kept in this browser only, so the
  shared link still opens in grayscale. Its source is "DESIGN - Editorial
  theme.md" in the Design Project folder, whose last section lists where the
  prototype differs from the analysis. To remove the theme, delete the CSS
  file, its two imports and the Theme control.
- **Round 19.** Add your experience asks "Do people pass through here, or
  stay?" (Just passed through, People stop a while, Became a gathering spot).
  The space summary tallies the answers; when half or more say "Became a
  gathering spot" the space gets a "Gathering spot" badge on its page and
  card, and Browse has a "Gathering spots only" filter, so designers can find
  thresholds that grew into third places (logic in src/lib/gathering.js).
  Optional questions and fields show an inline "Optional" marker after the
  label (the Opt component, or `optional` on Field, Input and Select);
  "(optional)" and "Optional." text is gone, and the one required quick
  question shows "Required" the same way. The architect page has two tabs,
  Redesigns and Contributions; Contributions is the same block as a member
  profile (spaces documented, experiences, photos).
- **Round 18.** Host a contest uses the full page width for every field,
  with a larger map beside the space list (the intro keeps a reading
  width). The location step of Add your experience offers two choices, with
  the points rule as a smaller line. The rate table on Points and membership
  is built from the point constants, so it matches what the app awards.
- **Two-round contests (round 17; replaces round 16's pay-every-entry).**
  Round 1 is open to every eligible architect with a light concept (one
  sheet, a statement of up to 300 words). Paid members enter free; others pay
  a $25 entry fee. The co-host shortlists (we suggest 5) and each shortlisted
  architect is paid to develop a full proposal in round 2; the winner gets
  the prize and sells the design to the co-host, and everyone else keeps
  their rights and can publish in the Redesign Library. Contest pages show
  both deadlines, a four-step timeline and "Who is paid". Hosts enter a
  total budget, the shortlist size and the payment per shortlisted architect
  (suggested 10% of the total each); the prize is what's left. Judging runs
  twice: pick the shortlist (comment on each concept), then, after round 2,
  score the shortlist's proposals and pick the winner. A "Demo · Skip to the
  round 2 deadline" button moves a contest along.
- **Points for everyone (round 16; replaces round 13's ghost points).**
  Free and paid members both earn real points and can spend them on 3D-model
  and diagram downloads (Points and Earnings show how many downloads they're
  worth). Only paid members get a year-end surplus share and payouts; free
  members see their would-be share as "ghost dollars". Points earned on the
  free tier don't count toward a surplus share after upgrading. The payout
  rule is a hover hint on the disabled "Request payout" button.
- **Every contest entry is paid.** Contests have a per-entry payment next
  to the prize (contest page, cards, entry form, Terms); hosts set it in
  "Payment per entry" when they request a contest.
- **Login** says "Create an account" and opens Free and paid membership.
  The header now reads Architect ranking, then Contests. File uploads have
  an inline "Demo · Add sample file" button styled apart from the UI.
- **Hosting and judging contests (round 15).** "Host a contest" ends at
  "Send request": pick the space with a search and a small map of the
  matches, the prize field keeps its "$", and a confirmation says the team
  will review it. Judging is a separate flow: Contributions › Hosted
  contests lists your contests (and requests under review) with a "Ready
  to judge" badge, also shown as "N to judge" in the account menu and on
  the contest page for the co-host. The judging page lists every entry;
  open each to see its drawings and description, score it 1–5 per
  criterion, leave a comment, pick a winner and announce it.
- **Demo-only help** (sample files, test card, "any 6 digits work",
  "switch role") lives in a dashed purple "Demo only" tray above the Demo
  button, never inline with the page. Copy that mentioned the demo or
  "simulated" is gone from the pages.
- **Free and paid** (/membership) compares the two tiers; every "See the
  paid tier" link goes there.
- **Names open profiles.** A person's name opens their architect portfolio,
  or a member profile (/member/:id: spaces documented, experiences, photos;
  points and tier stay private). Experiences show every answer under short
  labels, the free text as "Comments", and the date before "off site".
  "Moderate" on a pending space opens its review page.
- **For architects (round 14).** Choices are whole cards that move you on,
  no radio buttons. Students: "Send code" sits beside the school email
  field, the code checks itself once six digits are in, and Next stays
  disabled until it's confirmed; step 2 asks for the school, graduation
  year and this term's class registration (to see architecture courses).
  Every path ends on "Your account": full name, email, create and confirm
  password, website and LinkedIn. The step's Back and Next live in a footer
  pinned to the bottom of the page, with "Not an architect?" under them, so
  they never move when hints or errors appear. Profile has "Convert to an
  architect account" for community members.
- **Dialogs** all have a close X in the title row (focus still starts on the
  first real control). **Log in** has "Remember me" (off by default) and a
  tooltip on "get verified as an architect". **Browse** has no header
  button; an empty search shows a small heading and "Create new
  interstitial space", prefilled with what you searched.
- **Ghost points (round 13).** Only paid members collect points, and only
  they are paid out (surplus share and redesign sales). Free members see
  ghost points: a dashed badge in the header and dashed cards on Points,
  with an "Unrealized year-end surplus share". Ghost points can't be spent
  and don't convert on upgrade; the paid tier starts the count at zero.
  Other people's badges show plain points, since tier is private. The
  public architect page no longer shows points.
- **Buy spatial diagrams.** Each diagram on a space has "Buy this diagram",
  a Base Library listing (item page, checkout, receipt, My purchases).
- **Fully populated space.** Haveli courtyard, Chandpole lane (/space/s2,
  Demo bar variant "Fully populated") has something in every tab:
  experiences with ratings, three diagrams (one by AI), the 3D model with
  uploaded scans, redesigns, a connected space, a contest and an archived
  round. "No connected spaces" now points at /space/s1.
- **Terms of Use** were rewritten for the current model, in sections with a
  contents list.
- **Collaborators.** Uploading a redesign, a contest entry or a spatial
  diagram has "Add collaborator": find people by name, or invite someone by
  email. They're credited ("by Architect A with …") and notified.
- **Upload redesign / contest entry** is one three-step flow: files and
  description (.dwg, .dxf, .skp and .3dm only); details and terms (units,
  optional agency contact, then the full terms with "I have read and agree
  to these terms" at the bottom); then price and payout. From a live
  contest the terms become the contest terms (including the rights transfer
  if you win) and the last step shows the prize.
- **Contest entries** have their own page (/contest/:id/enter) from
  "Submit an entry". If you have published redesigns for that space, pick
  one to start from: its files and details are copied in and stay editable.
  Architect A can try this on both live contests.
- **Spatial diagram upload** is two steps: drawings (previews appear only
  after files are added) and the Base Library licence, since diagrams are
  sold as downloads.
- **Portfolio** shows redesigns, spatial diagrams and contest entries in the
  same format: image, badges, description, details and files.
- **Space ranking** (top bar) sorts spaces by most voted to rebuild or latest
  added, and filters by country and city. The sample data only covers Jaipur.
- **Footer** on every page: explore links, for architects, host a contest,
  co-op, About us, Contact us, Terms of Use, Privacy policy. Terms left the
  top bar.
- **Sign-up.** The header for visitors shows "For architects" and "Log in".
  For architects asks "I'm an architect" or "I'm an architecture student".
  Architects then choose Licensed or Licence pending; both upload a diploma
  first (required). Licensed: country, register number looked up in that
  country's register (India CoA, US state boards via NCARB, UK ARB), then an
  ID whose name must match the register. Licence pending: an application or
  exam number is optional. Student: school email code, programme checked against
  accreditation lists, graduation year (sets re-verification), and proof of
  enrolment this term. Community sign-up ("Create a free account") stays
  for everyone else.
- **Buying.** Full design rights have a set price ($X,XXX). A checkbox,
  "Connect me with the architect to build the space", notifies the
  architect in the platform and by email after you buy. Checkout has its
  back link at the top; the purchase confirmation spans the page.
- **Account.** Contributions lists every space you documented, commented on
  or uploaded to, with a status icon (grey question mark pending, red
  crossed circle declined, green tick approved: the only colour in the
  prototype) and the date of your latest contribution. Profile is account settings: photo, name, email, city and
  country, LinkedIn, Instagram and website (shown on your architect page),
  plan and verification, Delete account (you lose your points). Earnings:
  payouts open when the financial year ends; you can still request one if
  you downgrade to the free tier.
- Account pages (Portfolio, Earnings, My purchases, Contributions, Points &
  membership, Profile, plus Spaces to approve, Flag queue and Host a contest for those
  roles) are in the dropdown under your name, top right.
- Demo-only information lives in the Demo bar, not on the pages: whether a
  page is Clickable or Simulated, view switches, and the placeholder notice.
- Confirmations: small pop-ups appear bottom left for six seconds. A
  submission (redesign, diagram, contest entry, experience) also shows a
  banner at the top of the space page, and the contribution is marked "Yours".
- **Demo bar.** The "Demo" pill (bottom right) opens a drawer; the page makes
  room for it instead of being covered. It has the role switcher, **Pages to
  review** (every page and view, marked Clickable or Simulated, with your
  note and discussion counts; opening one switches to a role that can see it; variations such as the Space page header layouts and Contest details eligibility are nested
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
     no diagram). Redesigns tab, **Upload redesign**: title, description,
     "Use sample files" (.dwg and .skp), then units and the terms with
     "I have read and agree", then price and payout, Publish. You land back
     on the space with a "Redesign published" banner, the card marked
     "Yours", and +5 points. The upload button is replaced by the
     one-a-week notice for this space ("Skip ahead one week" in the Demo bar
     lifts it); other spaces stay open.
   - Same page, Spatial diagrams tab, **Upload spatial diagram**: drawings,
     then the Base Library licence. Banner, +2 points, and the 3D model tab
     shows a model built from the photos and diagrams. Upload a second one:
     diagrams add up, the model stays one.
   - Open the Demo bar and tick "Make the next payment fail". Open "Gateway
     threshold, Jaipur Darwaza (east side)", "Threshold benches…". Show
     "Full design rights": by agreement, "Ask the architect". Then choose the
     licence, check out, "Fill test card", Pay. **Payment failed**, Retry,
     then the receipt and download.
   - My purchases (name menu): "Update to version 2" on the seeded purchase.
   - Optional: "Haveli courtyard, Chandpole lane", 3D model tab, View 3D model,
     checkout: 100 points is disabled (not enough points), pay by card.
   - Portfolio: Edit a redesign (new version), Unpublish another.
   - "Haveli courtyard, Chandpole lane", Contests tab: prize and entry
     count. "Submit an entry" runs the same upload flow with the contest
     terms, then back on the space with your entry marked "Yours".
   - "Approvals 3/10" in the header opens Spaces to approve.
   - Earnings (80% share; payout opens at year end). Notifications (bell):
     each one opens the page it is about.
3. **Community member** (1 min). Browse, "Create new interstitial space" (or the Demo
   bar page list): photos, draw the area around the
   photo point, "Is it one of these nearby spaces?", questionnaire, submit:
   Pending. Your first experience is already there ("Update your
   experience"). On another space, "Add your experience" opens a four-step
   overlay: share location or continue as not there (on site earns full points), a comment with
   photos, quick questions, then "should it be redesigned?" from 0 to 10
   and why. "Vote to redesign" in the header (+0.25 on site). Options,
   "Report an update" sends proof to moderators.
   On Browse, search by an address or "lat, lon" (e.g. 26.9239, 75.8267)
   to list spaces within 500 m, nearest first.
4. **Moderator** (1 min). Spaces to approve lists every pending space
   (filter by city). Review "Courtyard passage" and vote yes: third yes
   approves it. Review "Stepwell side steps": duplicate suggestion, then
   "No" needs a public reason. Reported updates: confirm the Temple plinth
   steps report, then open that space: counts are back to zero and the
   Archived tab holds everything from before. Flag queue: verify, take down.
5. **Paid account / co-host** (30 s). Points & membership: 10 free downloads.
   Host a contest: private space needs the deed, "Under manual team review",
   skip ahead to judging, pick a winner, escrow and payment summary.
6. **Private owner** (30 s). Any space, Options, "Remove space from the
   platform", upload deed, Team review, "Team decides: remove". Contributors
   are notified.
7. Finish on Co-op and Terms. For the AI diagram: open "Chowk well platform,
   Chhoti Chaupar": "Processing…" then a diagram crediting photographers.

For architect testers: set the role to Architect, collapse the Demo bar, and
start them on Browse spaces.

## Decisions I had to assume

Agreed before building:

1. A missing geotag warns and halves points; it does not block (brief wins over the spec).
2. Prices show as "$XX". Earnings needs numbers, so it uses a labelled placeholder of $40 per sale. Contest hosting share placeholder: 15%.
3. The location prompt for experiences is simulated with two buttons: share location (on site) or continue as not there (off site).
4. The Moderator role is a verified architect (Architect B); their own uploads are hidden from their list.
5. Layout only from the design skill; grayscale, system font, tokens only.

Changed on Nov 16 after review:

6. Full design rights have no fixed price: the buyer messages the architect and they agree price and terms. Only the use + adapt licence goes through checkout.
7. One redesign per space per architect each week; other spaces stay open. Spatial diagrams, experiences and contest entries are not limited.
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
