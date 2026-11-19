/**
 * Hindi copy used by the BioCraft studio.
 *
 * These are short, original lines written for this studio (not scraped
 * quotations), so the library can be used without attribution guesswork.
 * Every output is plain text: the typography comes from the selected real
 * Devanagari font file, not from Unicode look-alike characters.
 */

export type Vibe =
  | "Attitude"
  | "Love"
  | "Minimal"
  | "Student"
  | "Business"
  | "Travel"
  | "Creator";

export const VIBES: Vibe[] = [
  "Attitude",
  "Love",
  "Minimal",
  "Student",
  "Business",
  "Travel",
  "Creator",
];

export const BIO_LIBRARY: { vibe: Vibe; text: string; tags: string[] }[] = [
  {
    vibe: "Attitude",
    text: "सोच बड़ी, सबर ज़्यादा।\nबाकी सब मेहमान हैं। ✨",
    tags: ["short", "bold"],
  },
  {
    vibe: "Attitude",
    text: "शेर की तरह चलो,\nभीड़ खुद रास्ता देगी।",
    tags: ["short", "quote"],
  },
  {
    vibe: "Attitude",
    text: "ना तमाशा, ना शोर।\nकाम बोलता है, बस। 🖤",
    tags: ["minimal", "bold"],
  },
  {
    vibe: "Love",
    text: "तुम्हारे नाम की खुशबू,\nहर सुबह में बसी है। 🤍",
    tags: ["poetic"],
  },
  {
    vibe: "Love",
    text: "दिल की ज़ुबान पर\nसिर्फ़ तुम्हारा नाम है। ❤️",
    tags: ["short", "poetic"],
  },
  {
    vibe: "Minimal",
    text: "कम शब्द।\nगहरी बात।",
    tags: ["minimal"],
  },
  {
    vibe: "Minimal",
    text: "शांत इंसान,\nशोर भरी दुनिया। 🌿",
    tags: ["minimal"],
  },
  {
    vibe: "Student",
    text: "किताबें, कॉफ़ी और\nएक बड़ा सपना। 📚",
    tags: ["student"],
  },
  {
    vibe: "Student",
    text: "आज की मेहनत,\nकल की पहचान। ✍️",
    tags: ["motivation"],
  },
  {
    vibe: "Business",
    text: "छोटी शुरुआत,\nबड़े इरादे।\nBioCraft Studio",
    tags: ["business"],
  },
  {
    vibe: "Business",
    text: "काम से बात करो,\nशब्द खुद बोलेंगे। 💼",
    tags: ["business", "bold"],
  },
  {
    vibe: "Travel",
    text: "नक्शा जेब में,\nदिल किसी और गली में। 🧭",
    tags: ["travel"],
  },
  {
    vibe: "Travel",
    text: "हर सफ़र एक कहानी है,\nमैं कहानियाँ जोड़ता हूँ। 🚂",
    tags: ["travel", "poetic"],
  },
  {
    vibe: "Creator",
    text: "कहानी लिखता हूँ,\nकभी-कभी जीता हूँ। 🎬",
    tags: ["creator"],
  },
  {
    vibe: "Creator",
    text: "कैमरा, कलम और\nथोड़ा सा जुनून। 📷",
    tags: ["creator"],
  },
];

export const BIO_PREFIXES = ["✨ ", "🌿 ", "🖤 ", "☕ ", "📚 ", "🎬 ", "🌙 "];

export const BIO_TEMPLATES: Record<Vibe, string[]> = {
  Attitude: [
    "{name} — सोच बड़ी, सबर ज़्यादा।",
    "{name}\nना तमाशा, ना शोर। सिर्फ़ काम।",
    "मैं {name} हूँ,\nऔर मैं अपनी रफ़्तार से चलता हूँ।",
  ],
  Love: [
    "{name} — दिल की ज़ुबान,\nसिर्फ़ एक नाम।",
    "{name} ❤️\nतुमसे मिलकर अधूरी बातें पूरी लगती हैं।",
    "{name}\nहर सुबह तुम्हारे नाम की खुशबू।",
  ],
  Minimal: [
    "{name}\nकम शब्द। गहरी बात।",
    "{name}\nयहाँ सिर्फ़ ज़रूरी चीज़ें हैं।",
    "{name} · शांत इंसान,\nशोर भरी दुनिया।",
  ],
  Student: [
    "{name}\nकिताबें, कॉफ़ी और एक बड़ा सपना।",
    "{name} — आज पढ़ाई,\nकल पहचान।",
    "{name}\nनोट्स में उलझा,\nसपनों में खोया।",
  ],
  Business: [
    "{name}\nछोटी शुरुआत, बड़े इरादे।",
    "{name} — काम से बात करो,\nशब्द खुद बोलेंगे।",
    "{name}\nहिंदी में सोचते हैं,\nदुनिया के लिए बनाते हैं।",
  ],
  Travel: [
    "{name}\nनक्शा जेब में, दिल किसी और गली में।",
    "{name} — हर सफ़र\nएक कहानी है।",
    "{name}\nअगली ट्रेन कब है?",
  ],
  Creator: [
    "{name}\nकहानी लिखता हूँ, कभी जीता हूँ।",
    "{name} — कैमरा, कलम\nऔर थोड़ा सा जुनून।",
    "{name}\nयहाँ हर फ़्रेम में एक बात है।",
  ],
};

export const SHAYARI: { mood: Vibe; lines: [string, string] }[] = [
  {
    mood: "Love",
    lines: ["तुम्हारी यादों की बारिश में,", "आज भी मैं बिना छाता खड़ा हूँ।"],
  },
  {
    mood: "Love",
    lines: ["दिल कहता है तुम्हें लिख दूँ,", "कलम कहती है शब्द कम पड़ जाएँगे।"],
  },
  {
    mood: "Love",
    lines: ["तुमसे मिलने के बाद,", "हर रोज़ थोड़ा और घर लगने लगा।"],
  },
  {
    mood: "Attitude",
    lines: ["हम रास्ते बदलते हैं,", "मंज़िलें हमारा इंतज़ार करती हैं।"],
  },
  {
    mood: "Attitude",
    lines: ["जो लोग हमें आज़माते हैं,", "वो हमारी क़ीमत जानते हैं।"],
  },
  {
    mood: "Attitude",
    lines: ["शिकवा नहीं करते,", "हम तो आईना दिखाते हैं।"],
  },
  {
    mood: "Minimal",
    lines: ["कुछ बातें कहनी नहीं होतीं,", "समझने के लिए दिल चाहिए।"],
  },
  {
    mood: "Minimal",
    lines: ["मैंने शोर कम किया,", "और ज़िंदगी सुनाई दी।"],
  },
  {
    mood: "Student",
    lines: ["रात की पढ़ाई और सुबह की उम्मीद,", "यही तो मेरी कहानी है।"],
  },
  {
    mood: "Student",
    lines: ["डर के आगे जीत है,", "किताब के आगे परीक्षा।"],
  },
  {
    mood: "Business",
    lines: ["सपने बड़े हैं, हाथ छोटे,", "इसलिए आज काम ज़्यादा है।"],
  },
  {
    mood: "Business",
    lines: ["रोज़ थोड़ा बेहतर,", "एक दिन बहुत बेहतर।"],
  },
  {
    mood: "Travel",
    lines: ["घर की चारदीवारी से बाहर,", "एक पूरी दुनिया रखी है।"],
  },
  {
    mood: "Travel",
    lines: ["टिकट एक तरफ़ का,", "कहानी दोनों तरफ़ की।"],
  },
  {
    mood: "Creator",
    lines: ["कहानी काग़ज़ पर नहीं,", "नज़रों में शुरू होती है।"],
  },
  {
    mood: "Creator",
    lines: ["हर फ़्रेम एक सवाल है,", "और मैं जवाब ढूँढता हूँ।"],
  },
];

export const QUOTES: { theme: Vibe; text: string }[] = [
  {
    theme: "Attitude",
    text: "जो खुद पर भरोसा रखता है, उसे दुनिया का नक्शा नहीं चाहिए।",
  },
  { theme: "Attitude", text: "शांत रहो, तुम्हारा काम तुमसे ज़्यादा बोलेगा।" },
  {
    theme: "Love",
    text: "सच्चा प्यार शोर नहीं करता, वह बस रोज़ चुना जाता है।",
  },
  { theme: "Love", text: "किसी का हाथ थामना, उसकी हर कहानी में जगह बनाना है।" },
  { theme: "Minimal", text: "कम चीज़ें, साफ़ दिमाग़, लंबी साँस।" },
  { theme: "Minimal", text: "जितना छोड़ोगे, उतना हल्का चलोगे।" },
  {
    theme: "Student",
    text: "एक पन्ना रोज़ पढ़ो — साल के अंत में किताब बन जाएगी।",
  },
  {
    theme: "Student",
    text: "मेहनत का कोई शॉर्टकट नहीं, सिर्फ़ सही रास्ता होता है।",
  },
  { theme: "Business", text: "छोटी शुरुआत शर्म की बात नहीं, रुक जाना है।" },
  {
    theme: "Business",
    text: "जो लोग आपकी क़ीमत समझते हैं, उन्हें सौदा नहीं करना पड़ता।",
  },
  { theme: "Travel", text: "सफ़र वही अच्छा जहाँ लौटने का मन करे।" },
  {
    theme: "Travel",
    text: "दुनिया किताब है, और जो नहीं चलते वो एक पन्ना पढ़ते हैं।",
  },
  { theme: "Creator", text: "बनाना सबसे ईमानदार बातचीत है।" },
  {
    theme: "Creator",
    text: "जो आपके भीतर है, उसे बाहर आने दो — बाकी खुद जुड़ जाएगा।",
  },
];

export const CAPTIONS: { vibe: Vibe; text: string; tags: string[] }[] = [
  {
    vibe: "Love",
    text: "तुम्हारे साथ वक़्त रुक जाता है, बाकी सब भागता रहता है। ❤️",
    tags: ["#हिंदी", "#love", "#shayari"],
  },
  {
    vibe: "Attitude",
    text: "हम वो नहीं जो भीड़ चाहती है, हम वो हैं जो हम चुनते हैं। 🖤",
    tags: ["#attitude", "#hindi", "#motivation"],
  },
  {
    vibe: "Minimal",
    text: "सुबह की चाय, खुली खिड़की, और कोई जल्दी नहीं। ☕",
    tags: ["#minimal", "#slowmornings", "#hindi"],
  },
  {
    vibe: "Student",
    text: "आज का पन्ना कल का आत्मविश्वास है। 📚",
    tags: ["#student", "#padhai", "#hindi"],
  },
  {
    vibe: "Business",
    text: "काम छोटा हो या बड़ा, नीयत साफ़ रखो। 💼",
    tags: ["#business", "#hindi", "#entrepreneur"],
  },
  {
    vibe: "Travel",
    text: "ट्रेन लेट है, और मैं फिर भी खुश हूँ। 🚂",
    tags: ["#travel", "#safar", "#hindi"],
  },
  {
    vibe: "Creator",
    text: "नया वीडियो, नई कहानी, वही जुनून। 🎬",
    tags: ["#creator", "#reels", "#hindi"],
  },
];

export const USERNAME_SUFFIXES = [
  "hindi",
  "likhta",
  "quotes",
  "shayari",
  "studio",
  "official",
  "writes",
  "daily",
  "thecreator",
  "01",
];

export const STYLISH_LATIN: { name: string; map: string }[] = [
  {
    name: "Bold",
    map: "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳0123456789",
  },
  {
    name: "Italic",
    map: "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧0123456789",
  },
  {
    name: "Script",
    map: "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏0123456789",
  },
  {
    name: "Monospace",
    map: "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣0123456789",
  },
  {
    name: "Fullwidth",
    map: "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９",
  },
  {
    name: "Small caps",
    map: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ0123456789",
  },
];

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function stylishVariants(
  text: string,
): { name: string; value: string }[] {
  return STYLISH_LATIN.map((style) => {
    const output = [...text]
      .map((char) => {
        const index = LATIN.indexOf(char);
        return index >= 0 ? ([...style.map][index] ?? char) : char;
      })
      .join("");
    return { name: style.name, value: output };
  });
}

export function generateBios(
  vibe: Vibe,
  name: string,
  emoji: boolean,
): string[] {
  const safeName = name.trim() || "आपका नाम";
  const prefixOffset = VIBES.indexOf(vibe);
  return BIO_TEMPLATES[vibe].map((template, index) => {
    const text = template.replaceAll("{name}", safeName);
    if (!emoji) return text;
    const prefix = BIO_PREFIXES[(prefixOffset + index) % BIO_PREFIXES.length];
    return `${prefix}${text}`;
  });
}

export function generateShayari(mood: Vibe, seed = 0): string[] {
  const lines = SHAYARI.filter((item) => item.mood === mood);
  const output: string[] = [];
  for (const item of lines) output.push(`${item.lines[0]}\n${item.lines[1]}`);
  const others = SHAYARI.filter((item) => item.mood !== mood);
  for (let index = 0; index < Math.min(3, others.length); index += 1) {
    const a = others[(seed + index) % others.length];
    const b = others[(seed + index * 2 + 1) % others.length];
    if (a.lines[1] !== b.lines[1]) {
      output.push(`${a.lines[0]}\n${b.lines[1]}`);
    }
  }
  return output;
}

export function generateUsernames(name: string): string[] {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._]/g, "");
  const safe = base || "biocraft";
  const variants = new Set<string>();
  for (const suffix of USERNAME_SUFFIXES) {
    variants.add(`${safe}.${suffix}`);
    variants.add(`${safe}_${suffix}`);
  }
  variants.add(`the.${safe}`);
  variants.add(`hi.${safe}`);
  variants.add(`${safe}.hindi`);
  return [...variants]
    .map((value) => value.replace(/\.{2,}/g, ".").replace(/_{2,}/g, "_"))
    .filter((value) => value.length <= 30 && value.length >= 4)
    .slice(0, 14);
}
