import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { 'client/index': 'src/index.ts' },
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2022',
  external: ['react'],
  banner: { js: '"use client";' },
});
