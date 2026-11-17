// Every page and view to review, for the Demo bar.
// kind: is the screen fully working (clickable) or a simulation?
// role: the demo role that can see it (the Demo bar switches to it).
// match: does an in-app path belong to this page? (used to count notes)
// views: variations of the same page; `id` is the suffix the Notes tool adds
// to the page key, and the first view is the default (no suffix).
const exact = (p) => (path) => path === p;
const re = (r) => (path) => r.test(path);

export const PAGE_GROUPS = [
  {
    group: 'Visitor and community',
    pages: [
      { id: 'landing', label: 'Landing', to: '/', kind: 'simulated', match: exact('/'), views: [{ id: '', label: 'Classic', choice: ['landingLayout', 'classic'] }, { id: 'map', label: 'Map first', choice: ['landingLayout', 'map'], control: 'locate' }] },
      { id: 'browse', label: 'Browse spaces', to: '/browse', kind: 'simulated', match: exact('/browse') },
      { id: 'space', label: 'Space page', to: '/space/s2', kind: 'clickable', match: re(/^\/space\/(?!new$)[^/]+$/), views: [{ id: '', label: 'One page', layout: 'single' }, { id: 'tabs', label: 'Tabs', layout: 'tabs' }], variants: [
        ['Approved', '/space/s2'], ['Pending', '/space/s7'], ['No contest', '/space/s7'], ['Ongoing contest', '/space/s2'],
        ['Judging contest', '/space/s5'], ['Closed contest', '/space/s4'], ['Has related spaces', '/space/s4'], ['No related spaces', '/space/s2'],
      ] },
      { id: 'space-new', label: 'Create new space', to: '/space/new', kind: 'simulated', role: 'community', match: exact('/space/new'), controls: 'create', views: [{ id: '', label: 'A: Nearby spaces in the questionnaire', choice: ['createFlow', 'inline'] }, { id: 'overlay', label: 'B: Upload photos first', choice: ['createFlow', 'overlay'] }, { id: 'confirm', label: 'C: Confirm nearby spaces after the map', choice: ['createFlow', 'confirm'] }] },
      { id: 'signup', label: 'Sign up', to: '/signup', kind: 'simulated', role: 'visitor', match: exact('/signup') },
      { id: 'login', label: 'Log in', to: '/login', kind: 'simulated', role: 'visitor', match: exact('/login') },
      { id: 'architects', label: 'For architects (verification)', to: '/architects', kind: 'simulated', role: 'visitor', match: exact('/architects') },
      { id: 'co-op', label: 'Co-op', to: '/co-op', kind: 'simulated', role: 'community', match: exact('/co-op') },
      { id: 'points', label: 'Points and membership', to: '/points', kind: 'simulated', match: exact('/points') },
      { id: 'contributions', label: 'Contributions', to: '/contributions', kind: 'simulated', match: exact('/contributions') },
      { id: 'profile', label: 'Profile (account settings)', to: '/profile', kind: 'simulated', match: exact('/profile') },
      { id: 'terms', label: 'Terms of Use', to: '/terms', kind: 'simulated', match: exact('/terms') },
    ],
  },
  {
    group: 'Architect',
    pages: [
      { id: 'upload-redesign', label: 'Upload redesign', to: '/space/s8/upload-redesign', kind: 'clickable', role: 'architect', match: re(/^\/space\/[^/]+\/upload-redesign$/) },
      { id: 'upload-diagram', label: 'Upload spatial diagram', to: '/space/s8/upload-diagram', kind: 'clickable', role: 'architect', match: re(/^\/space\/[^/]+\/upload-diagram$/) },
      { id: 'item', label: 'Redesign or model listing', to: '/item/r4', kind: 'clickable', role: 'architect', match: re(/^\/item\//) },
      { id: 'checkout', label: 'Checkout', to: '/checkout?item=r4', kind: 'clickable', role: 'architect', match: exact('/checkout') },
      { id: 'purchase', label: 'Purchase confirmed', to: '/purchase/p-seed1', kind: 'clickable', role: 'architect', match: re(/^\/purchase\//) },
      { id: 'purchases', label: 'My purchases', to: '/purchases', kind: 'clickable', role: 'architect', match: exact('/purchases') },
      { id: 'portfolio', label: 'Portfolio', to: '/portfolio', kind: 'clickable', role: 'architect', match: exact('/portfolio') },
      { id: 'architect', label: 'Architect public page', to: '/architect/u-a2', kind: 'clickable', match: re(/^\/architect\//) },
      { id: 'ranking', label: 'Architect ranking', to: '/ranking', kind: 'clickable', match: exact('/ranking') },
      { id: 'contests', label: 'Contests', to: '/contests', kind: 'clickable', match: exact('/contests') },
      { id: 'contest', label: 'Contest details', to: '/contest/c1', kind: 'clickable', match: re(/^\/contest\/(?!request$)/) },
      { id: 'earnings', label: 'Earnings and payout', to: '/earnings', kind: 'clickable', role: 'architect', match: exact('/earnings') },
      { id: 'notifications', label: 'Notifications', to: '/notifications', kind: 'clickable', match: exact('/notifications') },
    ],
  },
  {
    group: 'Moderator, co-host, owner',
    pages: [
      { id: 'moderation', label: 'Moderation list', to: '/moderation', kind: 'simulated', role: 'moderator', match: exact('/moderation') },
      { id: 'moderation-review', label: 'Review a space', to: '/moderation/s7', kind: 'simulated', role: 'moderator', match: re(/^\/moderation\//) },
      { id: 'flags', label: 'Flag queue', to: '/flags', kind: 'simulated', role: 'moderator', match: exact('/flags') },
      { id: 'contest-request', label: 'Host a contest', to: '/contest/request', kind: 'simulated', role: 'paid', match: exact('/contest/request') },
      { id: 'removal', label: 'Request removal', to: '/removal/s3', kind: 'simulated', role: 'owner', match: re(/^\/removal\//) },
    ],
  },
];

export const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.pages);
export const pageFor = (path) => ALL_PAGES.find((p) => p.match(path));
