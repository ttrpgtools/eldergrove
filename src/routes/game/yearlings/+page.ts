import { yearlings } from '$lib/games/yearlings';
import type { PageLoad } from './$types';
import { getGameState } from '$state/game.svelte';

export const load: PageLoad = async function () {
	return {
		gamestate: await getGameState(yearlings)
	};
};
