import { Route, Routes } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import { Button, Empty, Page } from './components/ui.jsx';
import { Landing, Browse, Signup, Terms } from './pages/Public.jsx';
import Space from './pages/Space.jsx';
import { UploadRedesign, UploadDiagram } from './pages/Uploads.jsx';
import { Item, Checkout, Purchase, Purchases } from './pages/Buying.jsx';
import { Portfolio, ArchitectPage, Ranking, Earnings, Notifications } from './pages/Architect.jsx';
import { Contests, Contest, ContestRequest } from './pages/Contests.jsx';
import SpaceNew from './pages/SpaceNew.jsx';
import { Moderation, ModerationReview, Flags } from './pages/Moderation.jsx';
import { Points, Coop, Profile, Removal } from './pages/Account.jsx';

function NotFound() {
  return (
    <Page narrow>
      <Empty title="This page does not exist">
        <p>The link may be from before the demo data was reset.</p>
        <div><Button to="/browse">Browse spaces</Button></div>
      </Empty>
    </Page>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/space/new" element={<SpaceNew />} />
        <Route path="/space/:id" element={<Space />} />
        <Route path="/space/:id/upload-redesign" element={<UploadRedesign />} />
        <Route path="/space/:id/upload-diagram" element={<UploadDiagram />} />
        <Route path="/item/:id" element={<Item />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/purchase/:id" element={<Purchase />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/architect/:id" element={<ArchitectPage />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/contest/request" element={<ContestRequest />} />
        <Route path="/contest/:id" element={<Contest />} />
        <Route path="/moderation" element={<Moderation />} />
        <Route path="/moderation/:id" element={<ModerationReview />} />
        <Route path="/flags" element={<Flags />} />
        <Route path="/points" element={<Points />} />
        <Route path="/co-op" element={<Coop />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/removal/:spaceId" element={<Removal />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
