import { getGameState } from '$lib/util/game.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = async function ({ params }) {
	return {
		state: await getGameState(params.location),
		scene: params.location
	};
};
