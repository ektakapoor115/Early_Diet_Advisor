import fs from 'fs';

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

const newColors = `
              --color-red-50: #fef2f2 !important;
              --color-red-100: #fee2e2 !important;
              --color-red-500: #ef4444 !important;
              --color-red-600: #dc2626 !important;
              --color-red-800: #991b1b !important;
              --color-orange-500: #f97316 !important;
              --color-green-50: #f0fdf4 !important;
              --color-green-400: #4ade80 !important;
              --color-green-500: #22c55e !important;
              --color-green-600: #16a34a !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-200: #a7f3d0 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-700: #047857 !important;
              --color-blue-400: #60a5fa !important;
              --color-purple-400: #c084fc !important;
              --color-pink-400: #f472b6 !important;
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-600: #4b5563 !important;
              --color-black: #000000 !important;
              --color-white: #ffffff !important;
              --color-transparent: transparent !important;`;

const regex = /--color-red-50: #fef2f2 !important;[\s\S]*?--color-transparent: transparent !important;/g;

content = content.replace(regex, newColors.trim());

fs.writeFileSync(appFile, content);
console.log('Updated colors in App.tsx');
