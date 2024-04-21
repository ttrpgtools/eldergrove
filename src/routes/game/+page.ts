import { getGames } from '$lib/data/games';
import type { PageLoad } from './$types';

export const load: PageLoad = async function () {
	return {
		games: await getGames()
	};
};
