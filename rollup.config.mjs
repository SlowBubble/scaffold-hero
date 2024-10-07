import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';


function genConfig(input, outputFile) {
	return {
		input: input,
		output: {
			file: outputFile,
			format: 'iife',
			sourcemap: true,
		},
		plugins: [
			nodeResolve(),
			commonjs(),
			typescript(),
		],
	};
}
export default [
	genConfig('src/webMain.ts', 'build/webMain.js'),
]