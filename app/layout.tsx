import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import './globals.css';
export const metadata: Metadata = { title: 'QUICKKIT — Handy tools. Zero hassle.', description: 'Small tasks. Quick solutions. Discover a thoughtful collection of everyday text, developer, security, and image tools.', robots: { index: false, follow: false } };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="container header-inner"><Link href="/" className="brand" aria-label="QUICKKIT home"><span className="brand-mark">Q<span/></span><span>QUICK<span className="brand-purple">KIT</span></span></Link><nav aria-label="Main navigation"><Link href="/#tools" className="nav-active">Tools</Link><Link href="/#about">About</Link><Link href="/#tools" className="header-cta">Explore tools <ArrowUpRight size={15} aria-hidden="true"/></Link></nav></div></header><main id="main" tabIndex={-1}>{children}</main><footer className="site-footer"><div className="container footer-inner"><div><Link href="/" className="brand footer-brand">QUICK<span className="brand-purple">KIT</span></Link><p>Handy tools. Zero hassle.</p></div><div className="footer-right"><Link href="/#tools">Tools</Link><Link href="/#about">About the project</Link><span>Built for the little things.</span></div></div></footer></body></html>;
}
