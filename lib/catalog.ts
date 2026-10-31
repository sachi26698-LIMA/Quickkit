export const categories = ['All tools', 'Text', 'Developer', 'Security', 'Image & QR'] as const;
export type Category = typeof categories[number];
export const tools = [
  { slug: 'word-counter', name: 'Word Counter', category: 'Text', description: 'Make every word count. Check words, characters, and reading time as you type.', keywords: 'writing sentences paragraphs length', icon: 'text', color: 'purple', phase: 2 },
  { slug: 'case-converter', name: 'Case Converter', category: 'Text', description: 'From ALL CAPS to just right. Change your text case in a couple of clicks.', keywords: 'uppercase lowercase title sentence writing', icon: 'case', color: 'blue', phase: 2 },
  { slug: 'json-formatter', name: 'JSON Formatter', category: 'Developer', description: 'Bring order to your data. Format, validate, and minify JSON without the fuss.', keywords: 'code pretty print validator developer', icon: 'code', color: 'mint', phase: 2 },
  { slug: 'password-generator', name: 'Password Generator', category: 'Security', description: 'Create strong, random passwords with the length and characters you choose.', keywords: 'secure random crypto credentials', icon: 'key', color: 'peach', phase: 2 },
  { slug: 'qr-generator', name: 'QR Code Generator', category: 'Image & QR', description: 'Turn a link or a little text into a scannable QR code. Ready to share.', keywords: 'url scan png download', icon: 'qr', color: 'pink', phase: 3 },
  { slug: 'image-compressor', name: 'Image Compressor', category: 'Image & QR', description: 'Less file size, more possibilities. Compress images right in your browser.', keywords: 'photo picture jpeg webp optimize resize', icon: 'image', color: 'yellow', phase: 3 },
] as const;
export function filterTools(query: string, category: Category) {
 const search = query.trim().toLocaleLowerCase();
 return tools.filter(tool => (category === 'All tools' || tool.category === category) && `${tool.name} ${tool.description} ${tool.keywords}`.toLocaleLowerCase().includes(search));
}
