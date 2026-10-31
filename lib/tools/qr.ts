export const MAX_QR_BYTES=2000;
export function validateQr(text:string){if(!text.trim())throw new Error('Enter text or a URL to generate a QR code.');if(new TextEncoder().encode(text).length>MAX_QR_BYTES)throw new Error('Keep QR content within 2,000 UTF-8 bytes. Shorter content is easier to scan.');return text}
