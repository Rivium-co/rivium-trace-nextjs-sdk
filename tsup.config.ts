import { defineConfig } from 'tsup';

export default defineConfig([
  // Main SDK bundle
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    external: ['react', 'next'],
    splitting: false,
  },
  // React-specific bundle
  {
    entry: {
      'react/index': 'src/react/index.tsx',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    minify: false,
    external: ['react', 'next'],
    splitting: false,
  },
]);
