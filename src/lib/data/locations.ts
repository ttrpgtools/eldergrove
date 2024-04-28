import { ActionName } from '$lib/const';
import type { Action, Location } from '$lib/types';

const BACK: (l?: string) => Action = (label = 'Leave') => ({ action: ActionName.GoBack, label });

const locations: Location[] = [
	{
		id: 'opening',
		name: 'New Beginnings...',
		biome: 'beach',
		image: '/img/location/opening.webp',
		actions: [
			{ action: 'navigate', arg: 'starting-beach', label: 'Walk Down Beach' },
			{ action: 'navigate', arg: 'unknown-woods', label: 'Enter Woods' }
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
		encounters: ['crab', 'sandpiper'],
		actions: [
			{ action: 'randomEncounter', label: 'Explore' },
			{ action: 'navigate', arg: 'pylaim', label: 'Into Town' }
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
		actions: [
			{ action: 'navigate', arg: 'gentle-field', label: 'Leave Town' },
			{ action: 'navigate', arg: 'pylaim/weapon', label: 'Weapons' },
			{ action: 'navigate', arg: 'pylaim/armor', label: 'Armor' },
			{ action: 'navigate', arg: 'pylaim/general', label: 'General' },
			{
				action: 'navigate',
				arg: 'pylaim/teller',
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
		encounters: ['rat', 'scorpion'],
		actions: [
			{ action: 'randomEncounter', label: 'Explore' },
			{ action: 'navigate', arg: 'pylaim', label: 'Town' }
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
		actions: [
			{ action: 'shop', label: 'Browse Goods', arg: `There isn't much but it's well made.` },
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
		actions: [
			{ action: 'shop', label: 'Browse Goods', arg: `Behold the finest armor around!` },
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
		actions: [BACK()],
		desc: `What will you have?`
	},
	{
		id: 'pylaim/teller',
		name: 'Fortune Teller',
		biome: 'town',
		image: '/img/location/fortune-teller.webp',
		parent: 'pylaim',
		actions: [BACK()],
		desc: `A mysterious woman in a mysterious tent. I'm sure this will be fine.`
	},
	{
		id: 'yearlings/grassy-field',
		name: 'Grassy Field',
		biome: 'meadow',
		image: '/img/location/grassy-field.webp',
		encounters: [
			'yearlings/rat',
			'yearlings/imp',
			'yearlings/fox',
			'yearlings/mongoose',
			'yearlings/wolf',
			'yearlings/warlock',
			'yearlings/goblin',
			'yearlings/bear',
			'yearlings/xas',
			'yearlings/geist'
		],
		actions: [
			{ action: 'randomEncounter', label: 'Explore' },
			{ action: 'navigate', label: 'To Rocky Area', arg: 'yearlings/rocky-area' },
			{
				action: 'navigate',
				label: 'To Forest',
				arg: 'yearlings/doomed-woods',
				show: { condition: `atLeastLevel`, arg: 13 }
			},
			{ action: 'navigate', label: 'Into Town', arg: 'yearlings/pylaim' }
		],
		desc: `You are in the field. The town, forest, and rocky area border the field.`
	},
	{
		id: 'yearlings/rocky-area',
		name: 'Rocky Area',
		biome: 'rocky',
		image: '/img/location/rocky-area.webp',
		encounters: [
			'yearlings/druid',
			'yearlings/demon',
			'yearlings/dactyl',
			'yearlings/cyclops',
			'yearlings/t-rex',
			'yearlings/ogre',
			'yearlings/troll',
			'yearlings/sidewinder',
			'yearlings/cave-monkey',
			'yearlings/paramanthis'
		],
		actions: [
			{ action: 'randomEncounter', label: 'Explore' },
			{ action: 'navigate', label: 'To The Field', arg: 'yearlings/grassy-field' },
			{ action: 'navigate', label: 'Into Town', arg: 'yearlings/pylaim' }
		],
		desc: `
    A large barren scrubland, this area has a rough edge to it. Be careful to mind
    your step here. The field and town are not too far.
    `
	},
	{
		id: 'yearlings/pylaim',
		name: 'Pylaim',
		biome: 'town',
		image: '/img/location/pylaim.webp',
		actions: [
			{ action: 'navigate', arg: 'yearlings/grassy-field', label: 'Leave Town' },
			{ action: 'navigate', arg: 'yearlings/pylaim/weapon', label: 'Weapons' },
			{ action: 'navigate', arg: 'yearlings/pylaim/armor', label: 'Armor' },
			{ action: 'navigate', arg: 'yearlings/pylaim/general', label: 'General' },
			{
				action: 'navigate',
				arg: 'yearlings/pylaim/teller',
				label: 'Fortune Teller'
			}
		],
		desc: `
		You take a look around the town. You see weapon and armour shops plus a general store.
    On the other side of town you see a fortune tellers tent.
		`
	},
	{
		id: 'yearlings/pylaim/weapon',
		name: 'Weapon Shop',
		biome: 'town',
		image: '/img/location/weapon-shop.webp',
		parent: 'yearlings/pylaim',
		actions: [
			{ action: 'shop', label: 'Browse Goods', arg: `There isn't much but it's well made.` },
			BACK('Leave Shop')
		],
		shop: [
			{ item: 'yearlings/rapier', stock: 5, cost: 150, willBuy: true },
			{ item: 'yearlings/phantom-blade', stock: 5, cost: 300, willBuy: true },
			{ item: 'yearlings/katana', stock: 5, cost: 550, willBuy: true },
			{ item: 'yearlings/exaliber', stock: 5, cost: 800, willBuy: true },
			{ item: 'yearlings/masemune', stock: 5, cost: 1150, willBuy: true }
		],
		coins: 35,
		desc: `Weapons and a beautiful woman behind the counter.`
	},
	{
		id: 'yearlings/pylaim/armor',
		name: 'Armor Shop',
		biome: 'town',
		image: '/img/location/armor-shop.webp',
		parent: 'yearlings/pylaim',
		actions: [
			{ action: 'shop', label: 'Browse Goods', arg: `Behold the finest armor around!` },
			BACK('Leave Shop')
		],
		shop: [
			{ item: 'yearlings/aura-coat', stock: 5, cost: 200, willBuy: true },
			{ item: 'yearlings/chain-mail', stock: 5, cost: 300, willBuy: true },
			{ item: 'yearlings/plate-mail', stock: 5, cost: 450, willBuy: true },
			{ item: 'yearlings/dragon-torso', stock: 5, cost: 600, willBuy: true },
			{ item: 'yearlings/diamond-suit', stock: 5, cost: 800, willBuy: true }
		],
		desc: `An oddly wide range of armor is available.`
	},
	{
		id: 'yearlings/pylaim/general',
		name: 'General Store',
		biome: 'town',
		image: '/img/location/general-store.webp',
		parent: 'yearlings/pylaim',
		actions: [
			{ action: 'shop', label: 'Browse Goods', arg: `Nothing but the finest quality items!` },
			BACK('Leave Store')
		],
		shop: [
			{ item: 'yearlings/cure-potion', stock: 5, cost: 10, willBuy: false },
			{ item: 'yearlings/bomb', stock: 5, cost: 15, willBuy: false }
		],
		desc: `What will you have?`
	},
	{
		id: 'yearlings/pylaim/teller',
		name: 'Fortune Teller',
		biome: 'town',
		image: '/img/location/fortune-teller.webp',
		parent: 'yearlings/pylaim',
		enter: [{ action: 'chat', arg: `Hello dearie!` }],
		actions: [BACK()],
		desc: `A mysterious woman in a mysterious tent. I'm sure this will be fine.`
	},
	{
		id: 'yearlings/doomed-woods',
		name: 'Doomed Woods',
		biome: 'forest',
		image: '/img/location/doomed-woods.webp',
		encounters: ['yearlings/kamul'],
		actions: [
			{ action: 'randomEncounter', label: 'Explore' },
			{ action: 'navigate', label: 'Leave the Woods', arg: 'yearlings/grassy-field' }
		],
		desc: `
    The dread aura that kept you out of the woods thus far has subsided somewhat,
    but this place is undoubtedly creepy. The air is thick with evil and the trees
    wave menacingly at you.
    `
	}
];
const locationMap = new Map<string, Location>(locations.map((loc) => [loc.id, loc]));

export async function getLocation(id: string): Promise<Location> {
	const loc = locationMap.get(id);
	if (!loc) throw `Unknown location ${id}`;
	return Promise.resolve(loc);
}
