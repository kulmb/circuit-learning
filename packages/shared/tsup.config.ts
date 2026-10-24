import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    levels: 'src/levels/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: true,
  target: 'es2022',
});
