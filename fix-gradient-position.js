import fs from 'fs';

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const newOverrides = `
            .bg-gradient-to-t { --tw-gradient-position: to top !important; }
            .focus\\:ring-emerald-500\\/20:focus { --tw-ring-color: rgba(16, 185, 129, 0.2) !important; }`;

content = content.replace(/\.focus\\:ring-emerald-500\\\/20:focus \{ --tw-ring-color: rgba\(16, 185, 129, 0\.2\) !important; \}/g, newOverrides.trim());

fs.writeFileSync(appFile, content);
console.log('Updated gradient position in App.tsx');
