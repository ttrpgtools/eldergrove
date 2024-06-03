import { discovery } from '$lib/games/discovery';
import type { PageLoad } from './$types';
import { getGameState } from '$state/game.svelte';
export const ssr = false;
export const load: PageLoad = async function () {
	return {
		gamestate: await getGameState(discovery)
	};
};
