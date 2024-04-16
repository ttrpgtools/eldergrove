import { ActionName } from '$lib/const';
import type { Action, Location } from '$lib/types';

const BACK: (l?: string) => Action = (label = 'Leave') => ({ action: ActionName.GoBack, label });

const locations: Location[] = [
	{
		id: 'opening',
		name: 'New Beginnings...',
		biome: 'beach',
		image: '/img/opening.webp',
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
		image: '/img/starting-beach.webp',
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
		image: '/img/pylaim.webp',
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
		image: '/img/good-field.webp',
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
		image: '/img/weapon-shop.webp',
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
		image: '/img/armor-shop.webp',
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
		image: '/img/general-store.webp',
		parent: 'pylaim',
		actions: [BACK()],
		desc: `What will you have?`
	},
	{
		id: 'pylaim/teller',
		name: 'Fortune Teller',
		biome: 'town',
		image: '/img/fortune-teller.webp',
		parent: 'pylaim',
		actions: [BACK()],
		desc: `A mysterious woman in a mysterious tent. I'm sure this will be fine.`
	}
];
const locationMap = new Map<string, Location>(locations.map((loc) => [loc.id, loc]));

export async function getLocation(id: string): Promise<Location> {
	const loc = locationMap.get(id);
	if (!loc) throw `Unknown location ${id}`;
	return Promise.resolve(loc);
}
