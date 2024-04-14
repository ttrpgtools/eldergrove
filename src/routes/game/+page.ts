import { loadCachedValue } from '$lib/util/storage.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = async function ({ params }) {
	return {
		gameState: loadCachedValue<GameState>('GAME_STATE', null)
	};
};
