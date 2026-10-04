import { mkdir, readFile, readdir, writeFile, rm, rename } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const mode = process.argv[2] || 'crazygames';
if (!['standalone', 'crazygames'].includes(mode)) throw new Error('Expected standalone or crazygames mode');
const root = resolve(mode === 'standalone' ? 'dist' : 'dist-crazygames');
await mkdir('releases', { recursive: true });
const version = JSON.parse(await readFile('package.json')).version;
const zip = resolve(`releases/flappybugs-${version}-${mode}.zip`);
// zip creates an archive containing index.html at its root, no source/config files.
const temporaryZip = zip.replace(/\.zip$/, '.tmp.zip');
await rm(temporaryZip, { force: true });
execFileSync('zip', ['-q', '-r', '-X', temporaryZip, '.'], { cwd: root });
await rename(temporaryZip, zip);
const data = await readFile(zip);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(relative(root, path));
  }
}
await walk(root);
const manifest = { version, mode, zip: relative(process.cwd(), zip), bytes: data.length,
  sha256: createHash('sha256').update(data).digest('hex'), files: files.sort(),
  ...(mode === 'crazygames' ? { platformPreview: 'pending', uploaded: false } : {}) };
await writeFile(zip.replace(/\.zip$/, '.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
