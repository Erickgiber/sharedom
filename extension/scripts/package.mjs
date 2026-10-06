import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const distDir = path.resolve(__dirname, '../dist');
const zipFile = path.resolve(rootDir, 'sharedom-extension.zip');

console.log('--- Packaging Chrome Extension for Web Store ---');

execSync('npm run build:extension', { stdio: 'inherit', cwd: rootDir });

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

execSync(`cd "${distDir}" && zip -r "${zipFile}" ./*`, { stdio: 'inherit' });

console.log(`\n✅ Extension packaged successfully: ${zipFile}`);
console.log('You can now upload this ZIP file directly to the Chrome Developer Dashboard.');
