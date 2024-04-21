import type { Entity } from '$lib/types';

interface GameDef extends Entity {
	start: string;
}

const games: GameDef[] = [
	{
		id: 'yearlings',
		name: 'Yearlings',
		start: 'yearlings/grassy-field',
		desc: `
    This is the OG game that inspired this game engine and while this isn't fully faithful to the
    original version, it is pretty close. The images are new obviously.
    `
	},
	{
		id: 'discovery',
		name: 'Discovery',
		start: 'opening',
		desc: `This is the temporary (or not) title of the reboot game being created for this engine.`
	}
];
const gameMap = new Map<string, GameDef>(games.map((game) => [game.id, game]));

export async function getGames() {
	return Promise.resolve(games);
}

export async function getGame(id: string) {
	const game = gameMap.get(id);
	return Promise.resolve(game);
}
