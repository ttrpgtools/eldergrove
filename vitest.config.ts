import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Exercise browser rune/proxy semantics even though the engine tests need no DOM.
	plugins: [svelte({ dynamicCompileOptions: () => ({ generate: 'client' }) })],
	resolve: {
		conditions: ['browser'],
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			$state: fileURLToPath(new URL('./src/lib/state', import.meta.url)),
			$data: fileURLToPath(new URL('./src/lib/data', import.meta.url)),
			$util: fileURLToPath(new URL('./src/lib/util', import.meta.url)),
			'$app/environment': fileURLToPath(new URL('./tests/environment.ts', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts']
	}
});
