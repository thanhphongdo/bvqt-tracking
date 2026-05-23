import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = `<?xml version='1.0'?>
<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'>
  <rect width='512' height='512' rx='80' fill='#0a0a0a'/>
  <g fill='white' transform='translate(256,256)'>
    <rect x='-15' y='-130' width='30' height='220' rx='8'/>
    <rect x='-125' y='-20' width='250' height='30' rx='8'/>
  </g>
  <text x='256' y='420' font-family='sans-serif' font-size='80' font-weight='bold' fill='white' text-anchor='middle'>BVQ7</text>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(buf).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(buf).resize(180, 180).png().toFile('public/apple-touch-icon.png');

console.log('Generated PWA icons: 192, 512, apple-touch (180)');
