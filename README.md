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

## How it is put together

- `src/styles/tokens.css` holds every visual value (grays, type, spacing,
  radius, shadow, layout sizes). `app.css` and the components only read these
  variables. Swap this one file to restyle. The one exception is the 48rem
  breakpoint in `app.css`, because CSS variables can't be used in media queries.
- `src/state/DemoContext.jsx` is the whole "backend": one reducer for roles,
  points, purchases, uploads, votes and notifications.
- `src/lib/points.js` has every point rule.
- **Space page, two views.** The main view is one page: contest banner (only
  if the space has a contest), Spatial diagram, Redesigns, then Experiences.
  The alternative is the original four tabs. Switch with "View: One page /
  Tabs" at the top right of any space page, or in the Demo bar.
- Account pages (Portfolio, Earnings, My purchases, Create new space, Points &
  membership, Profile, plus Moderation, Flag queue and Host a contest for those
  roles) are in the dropdown under your name, top right.
- Each screen has a small tag at the top right: CLICKABLE or SIMULATED.
- Confirmations: small pop-ups appear bottom left for six seconds. A
  submission (redesign, diagram, contest entry, experience) also shows a
  banner at the top of the space page, and the contribution is marked "Yours".
- The Demo bar (bottom right) opens the role switcher, the space-page view
  switch, "Make the next payment fail", "Skip ahead one week" and "Reset demo
  data". It starts collapsed so it does not cover the page.

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
     files", price ($XX, set by the platform), terms, Publish. You land back
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
     entries, Contest details. "Submit an entry", then back on the space with
     your entry listed and marked "Yours".
   - Earnings (80% share, Request payout). Notifications: each one opens the
     page it is about.
3. **Community member** (1 min). Name menu, "Create new space": photos, "no
   geotag" (half-points warning), "Is this the same place?", questionnaire,
   submit: Pending. "Add your experience" with a photo, choose "Don't allow"
   on the location prompt (+0.125), then vote on site (+0.25).
4. **Moderator** (1 min). Moderation lists only spaces that are ready for
   approval. Review "Courtyard passage" and vote yes: third yes approves it.
   Review "Stepwell side steps": duplicate suggestion, then "No" needs a
   public reason. Flag queue: verify, take down.
5. **Paid account / co-host** (30 s). Points & membership: 10 free downloads.
   Host a contest: private space needs the deed, "Under manual team review",
   skip ahead to judging, pick a winner, escrow and payment summary.
6. **Private owner** (30 s). Any space, "Request removal" at the bottom, upload
   deed, Team review, "Team decides: remove". Switch to Community member,
   Profile, Removed spaces.
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
