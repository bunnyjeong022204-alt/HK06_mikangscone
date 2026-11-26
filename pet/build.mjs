import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { build } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, '..', 'dist-pet');
const external = ['electron', ...builtinModules, ...builtinModules.map((name) => `node:${name}`)];

await build({
  configFile: false,
  root: path.join(root, 'src', 'renderer'),
  base: './',
  build: { outDir: path.join(output, 'renderer'), emptyOutDir: true },
});

for (const target of ['main', 'preload']) {
  await build({
    configFile: false,
    root,
    build: {
      outDir: path.join(output, target),
      emptyOutDir: true,
      lib: { entry: path.join(root, 'src', target, 'index.ts'), formats: ['cjs'], fileName: () => 'index.cjs' },
      rolldownOptions: { external },
    },
  });
}

if (process.platform === 'darwin') {
  // Both macOS packages are built from the same dist-pet directory.
  const headers = path.resolve(path.dirname(process.execPath), '../include/node');
  execFileSync('xcrun', ['clang', '-bundle', '-undefined', 'dynamic_lookup',
    '-arch', 'arm64', '-arch', 'x86_64', '-framework', 'AppKit', '-I', headers,
    path.join(root, 'StationaryWindow.m'), '-o', path.join(output, 'main', 'stationary.node')],
    { stdio: 'inherit' });
}
