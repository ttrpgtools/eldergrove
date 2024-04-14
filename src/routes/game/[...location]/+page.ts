import { getGameState } from '$lib/util/game.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = async function () {
	return {
		state: await getGameState()
	};
};
