const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.error('Error: .next/standalone does not exist. Run "npm run build" first.');
  process.exit(1);
}

// 1. Copy .next/static to .next/standalone/.next/static
const srcStatic = path.join(rootDir, '.next', 'static');
const destStatic = path.join(standaloneDir, '.next', 'static');
console.log('Copying static assets...');
copyDirSync(srcStatic, destStatic);

// 2. Copy public to .next/standalone/public
const srcPublic = path.join(rootDir, 'public');
const destPublic = path.join(standaloneDir, 'public');
if (fs.existsSync(srcPublic)) {
  console.log('Copying public folder...');
  copyDirSync(srcPublic, destPublic);
}

// 3. Prepare clean data directory (copy official references, omit personal databases & files)
const destData = path.join(standaloneDir, 'data');
fs.mkdirSync(destData, { recursive: true });

// Clean up any previously copied personal database files
['pedagogen.db', 'pedagogen.db-shm', 'pedagogen.db-wal', 'generation.log'].forEach((file) => {
  const filePath = path.join(destData, file);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});

// Clean up any previously copied personal generated or attachment folders
['attachments', 'generated', 'images'].forEach((dir) => {
  const dirPath = path.join(destData, dir);
  if (fs.existsSync(dirPath)) {
    try { fs.rmSync(dirPath, { recursive: true, force: true }); } catch (_) {}
  }
  fs.mkdirSync(dirPath, { recursive: true });
});

// Copy official curriculum references only
const srcReferences = path.join(rootDir, 'data', 'references');
const destReferences = path.join(destData, 'references');
if (fs.existsSync(srcReferences)) {
  console.log('Copying official curriculum references...');
  copyDirSync(srcReferences, destReferences);
}

// 4. Copy node.exe into standalone/bin for zero-dependency standalone execution
const binDir = path.join(standaloneDir, 'bin');
fs.mkdirSync(binDir, { recursive: true });
const destNode = path.join(binDir, 'node.exe');
if (process.platform === 'win32' && fs.existsSync(process.execPath)) {
  console.log(`Copying node runtime (${process.execPath}) to ${destNode}...`);
  fs.copyFileSync(process.execPath, destNode);
}

console.log('Standalone preparation complete!');
