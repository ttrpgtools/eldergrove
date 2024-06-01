import type { PageLoad } from './$types';
import yearlings from '$lib/games/yearlings/info';
import discovery from '$lib/games/discovery/info';

export const load: PageLoad = async function () {
	return {
		games: [yearlings, discovery]
	};
};
