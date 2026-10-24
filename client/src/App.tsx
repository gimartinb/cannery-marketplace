import { lazy, Suspense, useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import { SiteTextProvider } from "./lib/siteText";

const About = lazy(() => import("./pages/About"));
const Apply = lazy(() => import("./pages/Apply"));
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

  // "/admin/" and "/admin" are the same page: drop a trailing slash so routes match.
  if (location.length > 1 && location.endsWith("/")) {
    const trimmed = location.replace(/\/+$/, "") || "/";
    window.history.replaceState(window.history.state, "", trimmed + window.location.search + window.location.hash);
    return <Redirect to={trimmed} replace />;
  }

  return <Suspense fallback={<RouteLoading />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/about" component={About} />
    <Route path="/contact" component={Contact} />
    <Route path="/apply" component={Apply} />
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
  // Toaster: the small confirmation and error pop ups used across the site (see lib/notify.ts).
  return <ErrorBoundary><SiteTextProvider><Router /></SiteTextProvider><Toaster position="top-right" richColors closeButton theme="light" toastOptions={{ className: "cannery-toast" }} /></ErrorBoundary>;
}
