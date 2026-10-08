import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('>>> [1/4] Installing server dependencies...');
execSync('npm --prefix server install', { stdio: 'inherit', cwd: rootDir });

console.log('>>> [2/4] Installing client dependencies...');
execSync('npm --prefix client install', { stdio: 'inherit', cwd: rootDir });

console.log('>>> [3/4] Building client production bundle...');
execSync('npm --prefix client run build', { stdio: 'inherit', cwd: rootDir });

console.log('>>> [4/4] Syncing build artifacts to root /dist and /build...');
const clientDist = path.join(rootDir, 'client', 'dist');
const rootDist = path.join(rootDir, 'dist');
const rootBuild = path.join(rootDir, 'build');

if (fs.existsSync(clientDist)) {
  fs.cpSync(clientDist, rootDist, { recursive: true });
  fs.cpSync(clientDist, rootBuild, { recursive: true });
  console.log('✓ Successfully populated client/dist, ./dist, and ./build');
} else {
  console.error('Warning: client/dist not found after build!');
}

console.log('>>> Build complete!');
