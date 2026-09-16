import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import About from "./pages/About";
import Admin from "./pages/Admin";
import BecomeVendor from "./pages/BecomeVendor";
import Contact from "./pages/Contact";
import Gifts from "./pages/Gifts";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import RequestQuote from "./pages/RequestQuote";
import VendorProfile from "./pages/VendorProfile";
import Vendors from "./pages/Vendors";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/become-a-vendor" component={BecomeVendor} />
      <Route path="/gifts" component={Gifts} />
      <Route path="/request-a-quote" component={RequestQuote} />
      <Route path="/admin" component={Admin} />
      <Route path="/vendors/:slug" component={VendorProfile} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
