import type { NpcInstance, NpcTemplate } from '$lib/types';

export const npcTemplates: NpcTemplate[] = [
	{
		id: 'rat',
		name: 'rat',
		image: 'https://assets.codepen.io/2292558/ratt.webp',
		desc: 'It definitely sees you. You might want to hurry.',
		maxHp: 5,
		coins: 5,
		exp: 5
	},
	{
		id: 'crab',
		name: 'crab',
		image: '/img/npc/crab.webp',
		desc: `Ornery and pinchy, not a great combo.`,
		maxHp: 5,
		coins: 'd4',
		exp: 5
	},
	{
		id: 'sandpiper',
		name: 'sand piper',
		image: '/img/npc/sandpiper.webp',
		desc: `Just looking for something to eat in the sand.`,
		maxHp: 3,
		coins: 'd4',
		exp: 5
	},
	{
		id: 'goblin',
		name: 'goblin',
		image: '/img/npc/goblin.webp',
		desc: 'Oof. Why are there so many of these guys?',
		maxHp: 25,
		coins: 40,
		exp: 50
	},
	{
		id: 'scorpion',
		name: 'scorpion',
		image: '/img/npc/scorpion.webp',
		desc: `See the green? I bet that's poisonous.`,
		maxHp: 15,
		coins: 15,
		exp: 20
	}
];

export const npcInstances: NpcInstance[] = [
	{
		id: 'shopkeep-pylaim-weapon',
		name: 'Giselle',
		maxHp: 10,
		hp: 10,
		coins: `2d20`,
		exp: 10
	}
];
