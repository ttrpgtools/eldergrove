import { getGame } from '$lib/data/games';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getGameState } from '$lib/util/game.svelte';

export const load: PageLoad = async function ({ params }) {
	const game = await getGame(params.gameid);

	if (!game) {
		error(404, {
			message: `No game with ID ${params.gameid} found.`
		});
	}
	return {
		game,
		state: await getGameState(game)
	};
};
