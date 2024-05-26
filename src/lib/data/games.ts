import type { GameDef } from '$lib/types';

const games: GameDef[] = [
	{
		id: 'yearlings',
		name: 'Yearlings',
		start: 'yearlings/grassy-field',
		baseChar: {
			hp: 130,
			coin: 15000,
			str: 14,
			dex: 3,
			wil: 3,
			exp: 0,
			level: 1,
			inventory: [['yearlings/cure-potion', 5]],
			equip: [['yearlings/rapier', 'right']]
		},
		desc: `
    This is the OG game that inspired this game engine and while this isn't fully faithful to the
    original version, it is pretty close. The images are new obviously.
    `
	},
	{
		id: 'discovery',
		name: 'Discovery',
		start: 'opening',
		baseChar: {
			hp: 10,
			coin: 30,
			str: 4,
			dex: 3,
			wil: 3,
			exp: 0,
			level: 1,
			inventory: [['mystery-object', 1]],
			equip: [
				['rusty-dagger', 'right'],
				['tattered-robes', 'torso']
			]
		},
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
