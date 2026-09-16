import { Facebook, Instagram, Menu, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";

const logo = "/manus-storage/cannery-marketplace-logo_659f3936.png";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/become-a-vendor", label: "Become a vendor" },
];

function NavigationLink({ href, label, currentPath, close }: { href: string; label: string; currentPath: string; close?: () => void }) {
  return (
    <Link href={href} className={`nav-link ${currentPath === href ? "active" : ""}`} onClick={close}>
      {label}
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="site-container navbar-inner">
        <div aria-hidden="true" />
        <Link href="/" onClick={close} aria-label="The Cannery Marketplace home">
          <img className="brand-mark" src={logo} alt="The Cannery Marketplace — Gilroy, California" />
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          {navigation.map((item) => <NavigationLink key={item.href} {...item} currentPath={location} />)}
        </nav>
        <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={18} strokeWidth={1.9} /> : <Menu size={19} strokeWidth={1.9} />}
        </button>
      </div>
      {open && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          {navigation.map((item) => <NavigationLink key={item.href} {...item} currentPath={location} close={close} />)}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-main">
        <div className="footer-brand">
          <img className="footer-mark" src={logo} alt="The Cannery Marketplace" />
          <p>A dedicated space in Gilroy where local makers and artisans can share their handcrafted work.</p>
        </div>
        <div>
          <p className="footer-heading">Explore</p>
          <ul className="footer-list">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About the marketplace</Link></li>
            <li><Link href="/become-a-vendor">Become a vendor</Link></li>
            <li><Link href="/contact">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <p className="footer-heading">Connect</p>
          <ul className="footer-list">
            <li><a href="tel:+14083371620">(408) 337-1620</a></li>
            <li><a href="mailto:thecannerymarketplace@gmail.com">Email the marketplace</a></li>
          </ul>
          <div className="footer-socials" aria-label="Social media">
            <a className="social-link" href="https://www.instagram.com/the_cannery_marketplace_/" target="_blank" rel="noreferrer" aria-label="The Cannery Marketplace on Instagram"><Instagram size={16} /></a>
            <a className="social-link" href="https://www.facebook.com/events/downtown-gilroy/cannery-marketplace/188143524348078/" target="_blank" rel="noreferrer" aria-label="The Cannery Marketplace on Facebook"><Facebook size={16} /></a>
          </div>
        </div>
      </div>
      <div className="site-container footer-base">
        <span>© {new Date().getFullYear()} The Cannery Marketplace. All rights reserved.</span>
        <span>7488 Monterey Road, Gilroy, California 95020</span>
      </div>
    </footer>
  );
}

export default function SiteShell({ children }: { children: ReactNode }) {
  return <div className="site-shell"><Header />{children}<Footer /></div>;
}
