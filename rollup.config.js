import svelte from 'rollup-plugin-svelte';
import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';

const production = process.env.NODE_ENV !== 'dev';

const aliases = alias({
  resolve: ['.svelte', '.js'], //optional, by default this will just look for .js files or folders
  entries: [
    { find: 'App.svelte', replacement: './App.svelte' },
    { find: /^pages\/(.*)/, replacement: 'src/pages/$1' },
    { find: /^containers\/(.*)/, replacement: 'src/containers/$1' },
    { find: /^components\/(.*)/, replacement: 'src/components/$1' },
    { find: 'util', replacement: 'src/util' }
  ]
});

export default [{
  // client
	input: 'src/client.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'src/server/public/build/bundle.js'
	},
	plugins: [
		svelte({
      hydratable: true,
			// enable run-time checks when not in production
      dev: !production,
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css: css => {
				css.write('src/server/public/build/bundle.css');
			}
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve(),
		commonjs(),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser(),

    // allow relative path finding
    aliases
	],
	watch: {
		clearScreen: false
	}
}, {
  // ssr
  input: 'src/App.svelte',
  output: {
    sourcemap: true,
    format: 'cjs',
    file: 'src/server/public/build/ssr.js'
  },
  plugins: [
    svelte({
      generate: 'ssr'
    }),

    resolve(),

    commonjs(),

    // allow relative path finding
    aliases
  ]
}];
