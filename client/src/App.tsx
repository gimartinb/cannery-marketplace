import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

const About = lazy(() => import("./pages/About"));
const SecureAdmin = lazy(() => import("./pages/SecureAdmin"));
const BecomeVendor = lazy(() => import("./pages/BecomeVendor"));
const Contact = lazy(() => import("./pages/Contact"));
const Gifts = lazy(() => import("./pages/Gifts"));
const MakerPortal = lazy(() => import("./pages/MakerPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RequestQuote = lazy(() => import("./pages/RequestQuote"));
const VendorProfile = lazy(() => import("./pages/VendorProfile"));
const Vendors = lazy(() => import("./pages/Vendors"));

function RouteLoading() {
  return <main className="route-loading" role="status" aria-live="polite">Loading page…</main>;
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return <Suspense fallback={<RouteLoading />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/about" component={About} />
    <Route path="/contact" component={Contact} />
    <Route path="/become-a-vendor" component={BecomeVendor} />
    <Route path="/gifts" component={Gifts} />
    <Route path="/request-a-quote" component={RequestQuote} />
    <Route path="/admin" component={SecureAdmin} />
    <Route path="/maker-portal" component={MakerPortal} />
    <Route path="/vendors/:slug" component={VendorProfile} />
    <Route path="/vendors" component={Vendors} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><Router /></ErrorBoundary>;
}
