import type { NpcInstance, NpcTemplate } from '$lib/types';

const npcTemplates: NpcTemplate[] = [
	{
		id: 'rat',
		name: 'Rat',
		image: 'https://assets.codepen.io/2292558/ratt.webp',
		desc: 'It definitely sees you. You might want to hurry.',
		maxHp: 5,
		coins: 5,
		exp: 5
	},
	{
		id: 'goblin',
		name: 'Goblin',
		image: '/img/goblin.webp',
		desc: 'Oof. Why are there so many of these guys?',
		maxHp: 25,
		coins: 40,
		exp: 50
	},
	{
		id: 'scorpion',
		name: 'Scorpion',
		image: '/img/scorpion.webp',
		desc: `See the green? I bet that's poisonous.`,
		maxHp: 15,
		coins: 15,
		exp: 20
	},
	{
		id: 'wolf',
		name: 'Wolf',
		image: '/img/wolf.webp',
		desc: `Don't these things hunt in packs? Are you sure it's alone?`,
		maxHp: 30,
		coins: 45,
		exp: 70
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
