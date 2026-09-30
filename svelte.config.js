import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: [vitePreprocess({})],

	kit: {
		adapter: adapter(),
		alias: {
			'$data/*': 'src/lib/data/*',
			'$state/*': 'src/lib/state/*',
			'$ui/*': 'src/lib/components/ui/*',
			'$util/*': 'src/lib/util/*'
		}
	}
};

export default config;
