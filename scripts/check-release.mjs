import { lstat, readdir, readFile } from 'node:fs/promises';
import { resolve, join, relative, dirname, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

// This checks the built tree. Browser/network and Portal acceptance are separate.
const root = resolve(process.argv[2] || 'dist');
const sdkUrl = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const namespaces = new Set(['http://www.w3.org/1999/xhtml', 'http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink']);
const allowedExtensions = new Set(['.html', '.js', '.css', '.svg', '.woff', '.woff2']);
const licenseFiles = new Set(['LICENSE.txt', 'THIRD-PARTY-LICENSES.txt']);
const errors = [], files = [], references = [], remote = new Set();
const checkedReferences = new Set();
const fail = (file, message) => errors.push(`${file}: ${message}`);
const digest = data => createHash('sha256').update(data).digest('hex');

async function walk(directory) {
  for (const name of (await readdir(directory)).sort()) {
    const path = join(directory, name), stat = await lstat(path);
    const file = relative(root, path).split(sep).join('/');
    if (stat.isSymbolicLink()) { fail(file, 'symlinks are not uploadable assets'); continue; }
    if (stat.isDirectory()) {
      if (/^(?:\.|node_modules|src|tests|docs|scripts|releases|artifacts|cache)/i.test(name)) fail(file, 'source/cache/development directory');
      await walk(path);
    } else if (stat.isFile()) {
      const data = await readFile(path);
      files.push({ path: file, bytes: data.length, sha256: digest(data), data });
    } else fail(file, 'non-regular file');
  }
}

function reference(value, file, kind = 'asset') {
  value = value.trim();
  if (!value || value.startsWith('#')) return;
  const key = `${file}\0${value}\0${kind}`;
  if (checkedReferences.has(key)) return;
  checkedReferences.add(key);
  if (value === sdkUrl && kind === 'script') { remote.add(value); return; }
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) { fail(file, `remote/inline ${kind} reference: ${value.slice(0, 100)}`); return; }
  if (value.startsWith('/') || value.includes('\\')) { fail(file, `non-relative reference: ${value}`); return; }
  let local;
  try { local = decodeURIComponent(value.split(/[?#]/)[0]); }
  catch { fail(file, `invalid URL encoding: ${value}`); return; }
  const path = resolve(root, dirname(file), local);
  const target = relative(root, path).split(sep).join('/');
  if (target === '..' || target.startsWith('../')) { fail(file, `reference escapes build root: ${value}`); return; }
  if (!files.some(entry => entry.path === target)) fail(file, `missing ${kind} reference: ${value}`);
  references.push({ from: file, to: target, kind });
}

function cssReferences(source, file) {
  for (const match of source.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)) reference(match[2], file);
  for (const match of source.matchAll(/@import\s+(["'])(.*?)\1/gi)) reference(match[2], file);
}

try { await walk(root); }
catch (error) { fail('.', `cannot read build: ${error.message}`); }
if (!files.some(file => file.path === 'index.html')) fail('.', 'index.html must be at build/ZIP root');
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
if (bytes > 5 * 1024 * 1024) fail('.', `build exceeds 5 MiB: ${bytes} bytes`);
if (files.length > 100) fail('.', `build exceeds 100 files: ${files.length}`);

for (const { path: file, data } of files) {
  const extension = extname(file).toLowerCase();
  if (!allowedExtensions.has(extension) && !licenseFiles.has(file)) fail(file, 'unexpected file type (source/config/raster/audio/map not allowed)');
  if (/(?:^|\/)(?:\.|package(?:-lock)?\.|vite\.config|tsconfig|AGENTS|README|hero-data|bootstrap-v\d|game-v\d)|flappyTest|hurt-v\d|239437|portable-toilet/i.test(file)) fail(file, 'development or legacy resource filename');
  const source = data.toString('utf8');
  if (extension === '.svg') {
    if (!/<svg\b/i.test(source) || !/\bviewBox\s*=/i.test(source)) fail(file, 'SVG root/viewBox missing');
    if (/<\s*(?:[\w-]+:)?(?:image|script|foreignObject)\b|\b(?:[\w-]+:)?href\s*=|\bon[\w-]+\s*=|\bdata\s*:|<!ENTITY|<!DOCTYPE/i.test(source)) fail(file, 'SVG has embedded content, href, event handler or entity');
    for (const match of source.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)) if (!match[2].trim().startsWith('#')) fail(file, `SVG external style URL: ${match[2]}`);
    // XML namespaces are identifiers, never downloads. Other remote values fail.
    for (const match of source.matchAll(/(["'])((?:https?:)?\/\/[^"'\s]+)\1/g)) if (!namespaces.has(match[2])) fail(file, `SVG external URL: ${match[2]}`);
    if (/@import|@font-face/i.test(source)) fail(file, 'SVG imports/fonts are forbidden');
  } else if (extension === '.html') {
    for (const match of source.matchAll(/<([\w-]+)\b[^>]*>/g)) {
      for (const attribute of match[0].matchAll(/\b(src|href|poster)\s*=\s*(["'])(.*?)\2/gi)) reference(attribute[3], file, match[1].toLowerCase() === 'script' ? 'script' : 'asset');
      for (const attribute of match[0].matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gi)) for (const candidate of attribute[2].split(',')) reference(candidate.trim().split(/\s+/)[0], file);
    }
    for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) cssReferences(match[1], file);
    if (/\bdata:image\//i.test(source)) fail(file, 'embedded raster data');
  } else if (extension === '.css') cssReferences(source, file);
  else if (extension === '.js') {
    for (const match of source.matchAll(/new\s+URL\s*\(\s*(["'`])([^"'`]*?)\1\s*,/g)) if (!match[2].includes('${')) reference(match[2], file);
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(["'`])([^"'`]*?)\1/g)) reference(match[2], file, 'script');
    for (const match of source.matchAll(/(["'`])([^"'`\s]*\.(?:svg|css|m?js|png|jpe?g|webp|gif|avif|mp3|ogg|wav|woff2?)(?:[?#][^"'`\s]*)?)\1/gi)) reference(match[2], file, /\.m?js(?:[?#]|$)/i.test(match[2]) ? 'script' : 'asset');
    for (const match of source.matchAll(/(["'`])((?:https?:)?\/\/[^"'`\s]+)\1/g)) {
      if (match[2] === sdkUrl) remote.add(match[2]);
      else if (!namespaces.has(match[2])) fail(file, `non-allowlisted remote URL: ${match[2]}`);
    }
    // A renderer's data-URL format strings are not embedded photos; require payload.
    if (/data:image\/(?:png|jpe?g|webp|gif|avif)[^,]*,[a-z0-9+/=]{32,}/i.test(source)) fail(file, 'embedded raster payload');
    if (/hero-data|flappyTestBest|hurt-v\d\.mp3|HTMLCanvasElement\.prototype\.getContext/.test(source)) fail(file, 'legacy source/resource mechanism');
  }
}
const manifest = files.map(({ data, ...file }) => file).sort((a, b) => a.path.localeCompare(b.path));
console.log(JSON.stringify({ directory: root, passed: errors.length === 0, files: files.length, bytes,
  buildSha256: digest(manifest.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')),
  localReferences: references.length, remoteUrlLiterals: [...remote], errors, manifest }, null, 2));
if (errors.length) process.exitCode = 1;
