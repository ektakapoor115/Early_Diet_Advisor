import fs from 'fs';
import path from 'path';

const appPath = path.join(process.cwd(), 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf-8');

const target = `              --color-transparent: transparent !important;
            }`;

const replacement = `              --color-transparent: transparent !important;
            }
            .bg-red-50\\/30 { background-color: rgba(254, 242, 242, 0.3) !important; }
            .bg-red-50\\/50 { background-color: rgba(254, 242, 242, 0.5) !important; }
            .text-red-800\\/70 { color: rgba(153, 27, 27, 0.7) !important; }
            .text-slate-900\\/40 { color: rgba(15, 23, 42, 0.4) !important; }
            .text-white\\/60 { color: rgba(255, 255, 255, 0.6) !important; }
            .bg-black\\/20 { background-color: rgba(0, 0, 0, 0.2) !important; }
            .bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4) !important; }
            .bg-white\\/80 { background-color: rgba(255, 255, 255, 0.8) !important; }
            .border-green-500\\/30 { border-color: rgba(34, 197, 94, 0.3) !important; }
            .border-red-500\\/30 { border-color: rgba(239, 68, 68, 0.3) !important; }
            .focus\\:ring-emerald-500\\/20:focus { --tw-ring-color: rgba(16, 185, 129, 0.2) !important; }
            `;

appContent = appContent.split(target).join(replacement);
fs.writeFileSync(appPath, appContent);
