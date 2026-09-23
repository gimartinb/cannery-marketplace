import { Facebook, Instagram, Menu, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { defaultSiteImages } from "@/lib/siteImages";
import { trpc } from "@/lib/trpc";

const leftNavigation = [
  { href: "/vendors", label: "Makers" },
  { href: "/about", label: "About" },
];

const rightNavigation = [
  { href: "/contact", label: "Contact" },
  { href: "/become-a-vendor", label: "Become a vendor" },
];

function NavigationLink({ href, label, currentPath, close }: { href: string; label: string; currentPath: string; close?: () => void }) {
  const active = currentPath === href || (href === "/vendors" && currentPath.startsWith("/vendors/"));
  return <Link href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={close}>{label}</Link>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { data: publicSettings } = trpc.settings.public.useQuery();
  const giftBoxesEnabled = publicSettings?.giftBoxesEnabled === true;
  const logo = defaultSiteImages.find((image) => image.id === "logo")?.url || "/manus-storage/cannery-marketplace-logo-brand_e839fd29.png";
  const close = () => setOpen(false);
  const rightLinks = giftBoxesEnabled ? [{ href: "/gifts", label: "Gifts" }, ...rightNavigation] : rightNavigation;

  useEffect(() => { close(); }, [location]);

  return <header className="navbar"><div className="site-container navbar-inner">
    <nav className="nav-links nav-links-left" aria-label="Primary navigation, first group">{leftNavigation.map((item) => <NavigationLink key={item.href} {...item} currentPath={location} />)}</nav>
    <Link className="brand-link" href="/" onClick={close} aria-label="The Cannery Marketplace home"><img className="brand-mark" src={logo} alt="The Cannery Marketplace — Gilroy, California" width="1173" height="618" /></Link>
    <nav className="nav-links nav-links-right" aria-label="Primary navigation, second group">{rightLinks.map((item) => <NavigationLink key={item.href} {...item} currentPath={location} />)}</nav>
    <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={18} strokeWidth={1.9} /> : <Menu size={19} strokeWidth={1.9} />}</button>
  </div>{open && <nav id="mobile-navigation" className="mobile-menu" aria-label="Mobile navigation">{[...leftNavigation, ...rightLinks].map((item) => <NavigationLink key={item.href} {...item} currentPath={location} close={close} />)}</nav>}</header>;
}

export function Footer() {
  const { data: publicSettings } = trpc.settings.public.useQuery();
  const logo = defaultSiteImages.find((image) => image.id === "logo")?.url || "/manus-storage/cannery-marketplace-logo-brand_e839fd29.png";
  return <footer className="site-footer"><div className="site-container footer-main"><div className="footer-brand"><img className="footer-mark" src={logo} alt="The Cannery Marketplace logo" width="1173" height="618" loading="lazy" decoding="async" /><p>A dedicated space in Gilroy where local makers and artisans can share their handcrafted work.</p></div><div><p className="footer-heading">Explore</p><ul className="footer-list"><li><Link href="/">Home</Link></li><li><Link href="/about">About the marketplace</Link></li><li><Link href="/vendors">Meet the makers</Link></li>{publicSettings?.giftBoxesEnabled === true && <li><Link href="/gifts">Gift boxes</Link></li>}<li><Link href="/become-a-vendor">Become a vendor</Link></li><li><Link href="/contact">Contact us</Link></li></ul></div><div><p className="footer-heading">Connect</p><ul className="footer-list"><li><a href="tel:+14083371620">(408) 337-1620</a></li><li><a href="mailto:thecannerymarketplace@gmail.com">Email the marketplace</a></li></ul><div className="footer-socials" aria-label="Social media"><a className="social-link" href="https://www.instagram.com/the_cannery_marketplace_/" target="_blank" rel="noreferrer" aria-label="The Cannery Marketplace on Instagram"><Instagram size={16} /></a><a className="social-link" href="https://www.facebook.com/events/downtown-gilroy/cannery-marketplace/188143524348078/" target="_blank" rel="noreferrer" aria-label="The Cannery Marketplace on Facebook"><Facebook size={16} /></a></div></div></div><div className="site-container footer-base"><span>© {new Date().getFullYear()} The Cannery Marketplace. All rights reserved.</span><span>7488 Monterey Road, Gilroy, California 95020</span></div></footer>;
}

export default function SiteShell({ children }: { children: ReactNode }) { return <div className="site-shell"><Header />{children}<Footer /></div>; }
