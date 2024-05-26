import type { NpcInstance, NpcTemplate } from '$lib/types';

const npcTemplates: NpcTemplate[] = [
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
	},
	{
		id: 'yearlings/goblin',
		name: 'goblin',
		image: '/img/npc/goblin.webp',
		desc: 'Oof. Why are there so many of these guys?',
		maxHp: 26,
		coins: 70,
		exp: 42
	},
	{
		id: 'yearlings/rat',
		name: 'rat',
		image: 'https://assets.codepen.io/2292558/ratt.webp',
		desc: 'It definitely sees you. You might want to hurry.',
		maxHp: 5,
		coins: 10,
		exp: 7
	},
	{
		id: 'yearlings/wolf',
		name: 'wolf',
		image: '/img/npc/wolf.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 19,
		coins: 50,
		exp: 30
	},
	{
		id: 'yearlings/imp',
		name: 'imp',
		image: '/img/npc/imp.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 8,
		coins: 20,
		exp: 12
	},
	{
		id: 'yearlings/geist',
		name: 'geist',
		image: '/img/npc/geist.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 40,
		coins: 100,
		exp: 61
	},
	{
		id: 'yearlings/warlock',
		name: 'warlock',
		image: '/img/npc/warlock.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 23,
		coins: 60,
		exp: 35
	},
	{
		id: 'yearlings/fox',
		name: 'fox',
		image: '/img/npc/fox.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 11,
		coins: 30,
		exp: 20
	},
	{
		id: 'yearlings/xas',
		name: 'xas',
		image: '/img/npc/xas.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 37,
		coins: 90,
		exp: 52
	},
	{
		id: 'yearlings/mongoose',
		name: 'mongoose',
		image: '/img/npc/mongoose.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 15,
		coins: 40,
		exp: 25
	},
	{
		id: 'yearlings/bear',
		name: 'bear',
		image: '/img/npc/bear.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 32,
		coins: 80,
		exp: 50
	},
	{
		id: 'yearlings/druid',
		name: 'druid',
		image: '/img/npc/druid.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 41,
		coins: 88,
		exp: 60
	},
	{
		id: 'yearlings/demon',
		name: 'demon',
		image: '/img/npc/demon.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 52,
		coins: 105,
		exp: 75
	},
	{
		id: 'yearlings/dactyl',
		name: 'dactyl',
		image: '/img/npc/dactyl.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 67,
		coins: 130,
		exp: 100
	},
	{
		id: 'yearlings/cyclops',
		name: 'cyclops',
		image: '/img/npc/cyclops.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 87,
		coins: 170,
		exp: 125
	},
	{
		id: 'yearlings/t-rex',
		name: 't-rex',
		image: '/img/npc/t-rex.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 75,
		coins: 150,
		exp: 115
	},
	{
		id: 'yearlings/ogre',
		name: 'ogre',
		image: '/img/npc/ogre.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 71,
		coins: 142,
		exp: 105
	},
	{
		id: 'yearlings/troll',
		name: 'troll',
		image: '/img/npc/troll.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 60,
		coins: 125,
		exp: 85
	},
	{
		id: 'yearlings/sidewinder',
		name: 'sidewinder',
		image: '/img/npc/sidewinder.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 99,
		coins: 200,
		exp: 150
	},
	{
		id: 'yearlings/cave-monkey',
		name: 'cave monkey',
		image: '/img/npc/cave-monkey.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 59,
		coins: 120,
		exp: 90
	},
	{
		id: 'yearlings/paramanthis',
		name: 'paramanthis',
		image: '/img/npc/paramanthis.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 30,
		coins: 250,
		exp: 10
	}
];

const namedNpcs: NpcInstance[] = [
	{
		id: 'shopkeep-pylaim-weapon',
		name: 'Giselle',
		maxHp: 10,
		hp: 10,
		coins: `2d20`,
		exp: 10
	},
	{
		id: 'yearlings/morlin',
		name: 'Morlin',
		image: '/img/npc/morlin.webp',
		maxHp: 110,
		hp: 110,
		coins: `2d20`,
		exp: 200,
		items: ['yearlings/dragon-bane'],
		exit: [
			{
				action: 'flagSet',
				arg: 'beat-morlin',
				valid: { condition: 'ctxWasVictory' }
			},
			{
				action: 'locationChange',
				arg: 'yearlings/rocky-area',
				valid: { condition: 'ctxWasVictory' }
			}
		],
		desc: `A powerful wizard, gone a bit stir crazy alone in this cave for so long. Violently guards his collection of artifacts.`
	},
	{
		id: 'yearlings/kamul',
		name: 'Kamul',
		image: '/img/npc/kamul.webp',
		maxHp: 180,
		hp: 180,
		coins: 0,
		exp: 0
	}
];

const templateMap = new Map<string, NpcTemplate>(npcTemplates.map((npc) => [npc.id, npc]));
const instanceMap = new Map<string, NpcInstance>(namedNpcs.map((npc) => [npc.id, npc]));

export async function getNpcInstance(id: string): Promise<NpcInstance> {
	const instance = instanceMap.get(id);
	if (instance) return Promise.resolve(instance);
	const template = templateMap.get(id);
	if (!template) throw `Unknown NPC ${id}`;
	return Promise.resolve({ ...template, hp: template.maxHp });
}
