import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript'; // Für die JS-Bundles
import dts from 'rollup-plugin-dts';

export default defineConfig([{
  input: "src/index.ts",
  output: [
    {
      file: 'dist/rstore.es.js',
      format: 'es',
    },
    {
      file: 'dist/rstore.iife.js',
      format: 'iife',
      name: 'rstore'
    },
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json', // Verwende deine tsconfig.json
    }),
  ]
},{
  input: 'src/index.ts',
  output: {
    file: 'dist/rstore.d.ts',
    format: 'es',
  },
  plugins: [
    dts(),
  ],
},]);