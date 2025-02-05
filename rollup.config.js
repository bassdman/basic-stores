import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript'; // Für die JS-Bundles
import dts from 'rollup-plugin-dts';

export default defineConfig([{
  input: "src/index.ts",
  output: [
    {
      file: 'dist/basic-stores.es.js',
      format: 'es',
    },
    {
      file: 'dist/basic-stores.iife.js',
      format: 'iife',
      name: 'BasicStores'
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
    file: 'dist/basic-stores.d.ts',
    format: 'es',
  },
  plugins: [
    dts(),
  ],
},]);