import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const extDir = path.resolve(__dirname, '..');
const distDir = path.resolve(extDir, 'dist');

console.log('--- Building sharedom Chrome Extension ---');

execSync(`node ${path.resolve(__dirname, 'generate-icons.mjs')}`, { stdio: 'inherit', cwd: rootDir });

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log('Compiling TypeScript bundles with tsup...');

execSync(
  `npx tsup ${path.resolve(extDir, 'src/content/content.ts')} --format iife --target es2022 --no-splitting --out-dir ${distDir}`,
  { stdio: 'inherit', cwd: rootDir }
);

if (fs.existsSync(path.join(distDir, 'content.global.js'))) {
  fs.renameSync(path.join(distDir, 'content.global.js'), path.join(distDir, 'content.js'));
}

execSync(
  `npx tsup ${path.resolve(extDir, 'src/content/page-tracker.ts')} --format iife --target es2022 --no-splitting --out-dir ${distDir}`,
  { stdio: 'inherit', cwd: rootDir }
);

if (fs.existsSync(path.join(distDir, 'page-tracker.global.js'))) {
  fs.renameSync(path.join(distDir, 'page-tracker.global.js'), path.join(distDir, 'page-tracker.js'));
}

execSync(
  `npx tsup ${path.resolve(extDir, 'src/background/service-worker.ts')} --format esm --target es2022 --no-splitting --out-dir ${distDir}`,
  { stdio: 'inherit', cwd: rootDir }
);

execSync(
  `npx tsup ${path.resolve(extDir, 'src/popup/popup.ts')} --format iife --target es2022 --no-splitting --out-dir ${distDir}`,
  { stdio: 'inherit', cwd: rootDir }
);

if (fs.existsSync(path.join(distDir, 'popup.global.js'))) {
  fs.renameSync(path.join(distDir, 'popup.global.js'), path.join(distDir, 'popup.js'));
}

execSync(
  `npx tsup ${path.resolve(extDir, 'src/offscreen/offscreen.ts')} --format iife --target es2022 --no-splitting --out-dir ${distDir}`,
  { stdio: 'inherit', cwd: rootDir }
);

execSync(
  `npx tsup ${path.resolve(extDir, 'src/permission/microphone.ts')} --format iife --target es2022 --no-splitting --out-dir ${distDir}`,
  { stdio: 'inherit', cwd: rootDir }
);

if (fs.existsSync(path.join(distDir, 'microphone.global.js'))) {
  fs.renameSync(path.join(distDir, 'microphone.global.js'), path.join(distDir, 'microphone.js'));
}

if (fs.existsSync(path.join(distDir, 'offscreen.global.js'))) {
  fs.renameSync(path.join(distDir, 'offscreen.global.js'), path.join(distDir, 'offscreen.js'));
}

console.log('Copying static assets...');

fs.copyFileSync(path.resolve(extDir, 'manifest.json'), path.resolve(distDir, 'manifest.json'));
fs.copyFileSync(path.resolve(extDir, 'src/popup/popup.html'), path.resolve(distDir, 'popup.html'));
fs.copyFileSync(path.resolve(extDir, 'src/popup/popup.css'), path.resolve(distDir, 'popup.css'));
fs.copyFileSync(path.resolve(extDir, 'src/offscreen/offscreen.html'), path.resolve(distDir, 'offscreen.html'));
fs.copyFileSync(path.resolve(extDir, 'src/permission/microphone.html'), path.resolve(distDir, 'microphone.html'));
fs.copyFileSync(path.resolve(extDir, 'src/permission/microphone.css'), path.resolve(distDir, 'microphone.css'));

const iconsSrc = path.resolve(extDir, 'icons');
const iconsDest = path.resolve(distDir, 'icons');
if (!fs.existsSync(iconsDest)) {
  fs.mkdirSync(iconsDest, { recursive: true });
}

const iconFiles = fs.readdirSync(iconsSrc);
for (const file of iconFiles) {
  fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDest, file));
}

console.log('✅ Chrome Extension build complete! Output is in extension/dist');
