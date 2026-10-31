'use client';
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
export default function CopyButton({text}:{text:string}){const [status,setStatus]=useState('');return <div className="copy-control"><button className="secondary" disabled={!text} onClick={async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(text);setStatus('Copied to clipboard.')}catch{setStatus('Copy unavailable. Select the output and copy it manually.')}}}>{status==='Copied to clipboard.'?<Check size={15}/>:<Copy size={15}/>} Copy</button><span className="copy-status" role="status">{status}</span></div>}
