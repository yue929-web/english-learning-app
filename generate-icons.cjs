const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, 'public', 'icon.svg'));

async function generate() {
  // 192x192
  await sharp(svg).resize(192, 192).png().toFile(path.join(__dirname, 'public', 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 512x512
  await sharp(svg).resize(512, 512).png().toFile(path.join(__dirname, 'public', 'icon-512.png'));
  console.log('Generated icon-512.png');

  // maskable 512x512 (加 padding)
  const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f6ef7"/>
      <stop offset="100%" stop-color="#6a5af9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(128, 120) scale(0.8) translate(32, 28)">
    <rect x="0" y="0" width="120" height="180" rx="10" fill="#fff" opacity="0.95"/>
    <rect x="130" y="0" width="120" height="180" rx="10" fill="#fff" opacity="0.8"/>
    <rect x="118" y="0" width="14" height="180" fill="#fff"/>
    <line x1="20" y1="40" x2="100" y2="40" stroke="#4f6ef7" stroke-width="8" stroke-linecap="round"/>
    <line x1="20" y1="70" x2="100" y2="70" stroke="#4f6ef7" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
    <line x1="150" y1="40" x2="230" y2="40" stroke="#4f6ef7" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
    <line x1="150" y1="70" x2="230" y2="70" stroke="#4f6ef7" stroke-width="8" stroke-linecap="round" opacity="0.35"/>
    <circle cx="200" cy="200" r="34" fill="#52c41a"/>
    <path d="M184 200 L196 212 L218 188" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(__dirname, 'public', 'icon-512-maskable.png'));
  console.log('Generated icon-512-maskable.png');

  // favicon
  await sharp(svg).resize(64, 64).png().toFile(path.join(__dirname, 'public', 'favicon.png'));
  console.log('Generated favicon.png');
}

generate().then(() => console.log('All icons generated')).catch(e => console.error(e));
