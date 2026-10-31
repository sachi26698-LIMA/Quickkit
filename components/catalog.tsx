'use client';
import { useState } from 'react';
import { Search, X, Type, CaseSensitive, Braces, KeyRound, QrCode, ImageIcon, SlidersHorizontal } from 'lucide-react';
import { categories, filterTools, type Category } from '@/lib/catalog';
const icons = { text: Type, case: CaseSensitive, code: Braces, key: KeyRound, qr: QrCode, image: ImageIcon };
export default function Catalog() {
 const [query, setQuery] = useState('');
 const [category, setCategory] = useState<Category>('All tools');
 const results = filterTools(query, category);
 return <>
 <div className="search-wrap"><Search size={21} aria-hidden="true"/><label className="sr-only" htmlFor="tool-search">Search tools</label><input id="tool-search" type="search" placeholder="What can we help you with?" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');}}/>{query ? <button className="icon-button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={18}/></button> : <span className="search-hint">Search tools</span>}</div>
 <section id="tools" className="catalog" aria-labelledby="catalog-title">
 <div className="section-heading"><div><span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span><h2 id="catalog-title">Your everyday essentials</h2><p>Find the right tool. Get on with your day.</p></div><span className="catalog-count">6 thoughtfully chosen tools</span></div>
 <div className="filter-row"><div className="filters" aria-label="Filter tools by category">{categories.map(item=><button key={item} aria-pressed={category===item} className={category===item?'chip active':'chip'} onClick={()=>setCategory(item)}>{item}</button>)}</div><SlidersHorizontal size={18} aria-hidden="true" className="filter-decoration"/></div>
 <p className="sr-only" role="status">{results.length} tools found</p>
 <div className="tool-grid">{results.map(tool=>{const Icon=icons[tool.icon];return <article className="tool-card" key={tool.slug}><div className="card-top"><span className={`tool-icon ${tool.color}`}><Icon size={25} strokeWidth={1.7} aria-hidden="true"/></span><span className="category-label">{tool.category}</span></div><h3>{tool.name}</h3><p>{tool.description}</p><div className="card-footer"><span className="development-dot"/>Planned · Phase {tool.phase}</div></article>;})}</div>
 {!results.length && <div className="empty"><Search size={30} aria-hidden="true"/><h3>No tools found</h3><p>Try another search or explore the full collection.</p><button className="primary" onClick={()=>{setQuery('');setCategory('All tools');}}>Clear search & filters</button></div>}
 <p className="build-note">A toolkit in the making. Search and filters are ready; individual tools are being built in the next phases.</p>
 </section></>;
}
