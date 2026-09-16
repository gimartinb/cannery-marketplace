import { ChevronDown, Facebook, Instagram, Menu, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { readSiteImages } from "@/lib/siteImages";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/vendors", label: "Makers" },
  { href: "/contact", label: "Contact" },
  { href: "/become-a-vendor", label: "Become a vendor" },
];
const giftingLinks = [{ href: "/gifts", label: "Gift boxes", description: "Ready-to-order gifts for thoughtful moments" }, { href: "/request-a-quote", label: "Corporate gifting", description: "Custom bulk gifts for teams and clients" }];

function NavigationLink({ href, label, currentPath, close }: { href: string; label: string; currentPath: string; close?: () => void }) {
  return <Link href={href} className={`nav-link ${currentPath === href ? "active" : ""}`} onClick={close}>{label}</Link>;
}

function GiftingMenu({ currentPath, close, mobile = false }: { currentPath: string; close?: () => void; mobile?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = currentPath === "/gifts" || currentPath === "/request-a-quote";
  return <div className={`${mobile ? "mobile-gifting" : "nav-gifting"} ${menuOpen ? "menu-open" : ""}`}><button type="button" className={`nav-link nav-gifting-trigger ${active ? "active" : ""}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>Gifting <ChevronDown size={14} /></button><div className={mobile ? "mobile-gifting-links" : "nav-gifting-menu"}>{giftingLinks.map((item) => <Link key={item.href} href={item.href} className={`gifting-menu-link ${currentPath === item.href ? "active" : ""}`} onClick={() => { setMenuOpen(false); close?.(); }}><strong>{item.label}</strong><small>{item.description}</small></Link>)}</div></div>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [images] = useState(readSiteImages);
  const logo = images.find((image) => image.id === "logo")?.url || "/manus-storage/cannery-marketplace-logo_659f3936.png";
  const [location] = useLocation();
  const close = () => setOpen(false);
  return <header className="navbar"><div className="site-container navbar-inner"><div aria-hidden="true" /><Link href="/" onClick={close} aria-label="The Cannery Marketplace home"><img className="brand-mark" src={logo} alt="The Cannery Marketplace — Gilroy, California" /></Link><nav className="nav-links" aria-label="Primary navigation">{navigation.slice(0, 3).map((item) => <NavigationLink key={item.href} {...item} currentPath={location} />)}<GiftingMenu currentPath={location} />{navigation.slice(3).map((item) => <NavigationLink key={item.href} {...item} currentPath={location} />)}</nav><button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={18} strokeWidth={1.9} /> : <Menu size={19} strokeWidth={1.9} />}</button></div>{open && <nav className="mobile-menu" aria-label="Mobile navigation">{navigation.slice(0, 3).map((item) => <NavigationLink key={item.href} {...item} currentPath={location} close={close} />)}<GiftingMenu currentPath={location} close={close} mobile />{navigation.slice(3).map((item) => <NavigationLink key={item.href} {...item} currentPath={location} close={close} />)}</nav>}</header>;
}

export function Footer() {
  const [images] = useState(readSiteImages);
  const logo = images.find((image) => image.id === "logo")?.url || "/manus-storage/cannery-marketplace-logo_659f3936.png";
  return <footer className="site-footer"><div className="site-container footer-main"><div className="footer-brand"><img className="footer-mark" src={logo} alt="The Cannery Marketplace" /><p>A dedicated space in Gilroy where local makers and artisans can share their handcrafted work.</p></div><div><p className="footer-heading">Explore</p><ul className="footer-list"><li><Link href="/">Home</Link></li><li><Link href="/about">About the marketplace</Link></li><li><Link href="/vendors">Meet the makers</Link></li><li><Link href="/gifts">Gift boxes</Link></li><li><Link href="/request-a-quote">Corporate gifting</Link></li><li><Link href="/become-a-vendor">Become a vendor</Link></li><li><Link href="/contact">Contact us</Link></li></ul></div><div><p className="footer-heading">Connect</p><ul className="footer-list"><li><a href="tel:+14083371620">(408) 337-1620</a></li><li><a href="mailto:thecannerymarketplace@gmail.com">Email the marketplace</a></li></ul><div className="footer-socials" aria-label="Social media"><a className="social-link" href="https://www.instagram.com/the_cannery_marketplace_/" target="_blank" rel="noreferrer" aria-label="The Cannery Marketplace on Instagram"><Instagram size={16} /></a><a className="social-link" href="https://www.facebook.com/events/downtown-gilroy/cannery-marketplace/188143524348078/" target="_blank" rel="noreferrer" aria-label="The Cannery Marketplace on Facebook"><Facebook size={16} /></a></div></div></div><div className="site-container footer-base"><span>© {new Date().getFullYear()} The Cannery Marketplace. All rights reserved.</span><span>7488 Monterey Road, Gilroy, California 95020</span></div></footer>;
}

export default function SiteShell({ children }: { children: ReactNode }) { return <div className="site-shell"><Header />{children}<Footer /></div>; }
