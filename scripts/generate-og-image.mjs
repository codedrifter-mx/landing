import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0b0e14"/>
  <text x="80" y="200" font-family="ui-monospace,monospace" font-size="28" fill="#5bd1a0">$ whoami</text>
  <text x="80" y="290" font-family="ui-monospace,monospace" font-size="56" font-weight="bold" fill="#e6edf3">Alfredo Flores Garcia</text>
  <text x="80" y="340" font-family="ui-monospace,monospace" font-size="28" fill="#8b98a9">Software Engineer &#183; IAM / Keycloak</text>
  <text x="80" y="560" font-family="ui-monospace,monospace" font-size="20" fill="#5bd1a0">alfredoflores.dev</text>
</svg>`;

const outPath = 'public/og-image.png';
mkdirSync(dirname(outPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log(`Generated ${outPath}`);
