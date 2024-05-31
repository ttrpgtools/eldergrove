import { locationReturn } from '$lib/actions/location';
import type { Choice, GameDef, Location } from '$lib/types';
import { encounterRandomNpc } from '../yearlings/encounter';

const BACK = (label = 'Leave') => ({ label, actions: [{ action: locationReturn }] }) as Choice;

export const locations: Location[] = [
	{
		id: 'opening',
		name: 'New Beginnings...',
		biome: 'beach',
		image: '/img/location/opening.webp',
		choices: [
			{ actions: [{ action: 'locationChange', arg: 'starting-beach' }], label: 'Walk Down Beach' },
			{ actions: [{ action: 'locationChange', arg: 'unknown-woods' }], label: 'Enter Woods' }
		],
		desc: `
    You wake up on a beach. Your head hurts. You don't recall who you
    are. You are wearing a torn, damp robe and you have a rusty dagger
    strapped to your leg. You feel... salty. You see a village not too
    far away, maybe someone knows you there. Behind you the beach ends
    at the edge of the woods.
    `
	},
	{
		id: 'starting-beach',
		name: 'Quaint Beach',
		biome: 'beach',
		image: '/img/location/starting-beach.webp',
		choices: [
			{
				actions: async (s) => await encounterRandomNpc(s, { table: ['crab', 'sandpiper'] }),
				label: 'Explore'
			},
			{ actions: [{ action: 'locationChange', arg: 'pylaim' }], label: 'Into Town' }
		],
		desc: `
    The sand is firm beneath your feet and the water is warm.
    A few creatures scuttle around. 
    `
	},
	{
		id: 'pylaim',
		name: 'Pylaim',
		biome: 'town',
		image: '/img/location/pylaim.webp',
		choices: [
			{ actions: [{ action: 'locationChange', arg: 'gentle-field' }], label: 'Leave Town' },
			{ actions: [{ action: 'locationChange', arg: 'pylaim/weapon' }], label: 'Weapons' },
			{ actions: [{ action: 'locationChange', arg: 'pylaim/armor' }], label: 'Armor' },
			{ actions: [{ action: 'locationChange', arg: 'pylaim/general' }], label: 'General' },
			{
				actions: [{ action: 'locationChange', arg: 'pylaim/teller' }],
				label: 'Mystic',
				show: { condition: `xpMoreThan`, arg: 0 }
			}
		],
		desc: `
		You take a look around the town. You see weapon and armour
		shops plus a general store. There appears to be a fortune
		tellers tent in a back alley.
		`
	},
	{
		id: 'gentle-field',
		name: 'Gentle Field',
		biome: 'meadow',
		image: '/img/location/good-field.webp',
		choices: [
			{
				actions: async (s) => await encounterRandomNpc(s, { table: ['rat', 'scorpion'] }),
				label: 'Explore'
			},
			{ actions: [{ action: 'locationChange', arg: 'pylaim' }], label: 'Town' }
		],
		desc: `
			A combination of farms, fields and grasslands,
			the area immediately outside of the town is easy
			enough to traverse, but you notice some creatures
			about. Best be careful. From here you can head into
			town.
			`
	},
	{
		id: 'pylaim/weapon',
		name: 'Weapon Shop',
		biome: 'town',
		image: '/img/location/weapon-shop.webp',
		parent: 'pylaim',
		choices: [
			{
				label: 'Browse Goods',
				actions: [{ action: 'shopStart', arg: `There isn't much but it's well made.` }]
			},
			BACK('Leave Shop')
		],
		shop: [{ item: 'iron-dagger', stock: 5, cost: 10, willBuy: true }],
		coins: 35,
		desc: `Weapons and a beautiful woman behind the counter.`
	},
	{
		id: 'pylaim/armor',
		name: 'Armor Shop',
		biome: 'town',
		image: '/img/location/armor-shop.webp',
		parent: 'pylaim',
		choices: [
			{
				label: 'Browse Goods',
				actions: [{ action: 'shopStart', arg: `Behold the finest armor around!` }]
			},
			BACK('Leave Shop')
		],
		shop: [{ item: 'wooden-shield', stock: 5, cost: 5, willBuy: true }],
		desc: `An oddly wide range of armor is available.`
	},
	{
		id: 'pylaim/general',
		name: 'General Store',
		biome: 'town',
		image: '/img/location/general-store.webp',
		parent: 'pylaim',
		choices: [BACK()],
		desc: `What will you have?`
	},
	{
		id: 'pylaim/teller',
		name: 'Fortune Teller',
		biome: 'town',
		image: '/img/location/fortune-teller.webp',
		parent: 'pylaim',
		choices: [BACK()],
		desc: `A mysterious woman in a mysterious tent. I'm sure this will be fine.`
	}
];

export const discovery: GameDef = {
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
};
