import fs from 'fs';

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const newOverrides = `
            .focus\\:ring-emerald-500\\/20:focus { --tw-ring-color: rgba(16, 185, 129, 0.2) !important; }
            .from-black\\/80 { --tw-gradient-from: rgba(0, 0, 0, 0.8) !important; }
            .via-black\\/20 { --tw-gradient-via: rgba(0, 0, 0, 0.2) !important; }`;

content = content.replace(/\.focus\\:ring-emerald-500\\\/20:focus \{ --tw-ring-color: rgba\(16, 185, 129, 0\.2\) !important; \}/g, newOverrides.trim());

fs.writeFileSync(appFile, content);
console.log('Updated gradients in App.tsx');
