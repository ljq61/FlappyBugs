import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

export default defineConfig({
  define: { __GAME_VERSION__: JSON.stringify(version) },
  base: './',
  plugins: [{
    name: 'distribution-licenses',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'application-version', content: version }, injectTo: 'head' }];
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: readFileSync('LICENSE', 'utf8') });
      const licenses = [['three', 'LICENSE'], ['vite', 'LICENSE.md']].map(([name, file]) => `${name}\n${readFileSync(`node_modules/${name}/${file}`, 'utf8')}`);
      this.emitFile({ type: 'asset', fileName: 'THIRD-PARTY-LICENSES.txt', source: licenses.join('\n\n') });
    },
  }],
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
