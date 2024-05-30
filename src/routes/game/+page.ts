import type { PageLoad } from './$types';
import { yearlings } from '$lib/games/yearlings';
import { discovery } from '$lib/games/discovery';

export const load: PageLoad = async function () {
	return {
		games: [yearlings, discovery]
	};
};
