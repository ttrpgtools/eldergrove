import { BACK } from '$lib/actions/helpers';
import { itemFind } from '$lib/actions/items';
import { locationChange } from '$lib/actions/location';
import { counterIsEqual } from '$lib/conditions/counters';
import type { Location } from '$lib/types';
import { encounterRandomNpc } from '../encounter';

export const locations: Location[] = [
	{
		id: 'yearlings/grassy-field',
		name: 'Grassy Field',
		biome: 'meadow',
		image: '/img/location/grassy-field.webp',
		desc: `You are in the field. The town, forest, and rocky area border the field.`,
		enter: [
			{
				action: 'messageSet',
				arg: `!!The mist settles and you find yourself in a grassy field.
				There is a town nearby. The field is bordered on the West by a dense forest.
				There seems to be a powerful negative aura given off by the forest.
				You decide to stay out of the forest for the time being.
				To the East is a barren rocky area. This is some strange terrain, you think to yourself.`,
				valid: { condition: 'flagIsNotSet', arg: 'field-visited' }
			},
			{ action: 'flagSet', arg: 'field-visited' }
		],
		exit: [{ action: 'counterReset', arg: 'yearlings/grassy-field:wins' }],
		choices: [
			{
				actions: (s) =>
					encounterRandomNpc(s, {
						table: [
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
						followBy: async (s) => {
							if (
								!s.character.flags.has('found-rope') &&
								counterIsEqual(s, ['yearlings/grassy-field:wins', 1])
							) {
								await itemFind(s, {
									item: 'yearlings/old-rope',
									takeActions: [{ action: 'flagSet', arg: 'found-rope' }]
								});
							}
						}
					}),
				label: 'Explore'
			},
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/rocky-area' }],
				label: 'To Rocky Area'
			},
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/doomed-woods' }],
				label: 'To Forest',
				show: (s) => s.character.level >= 13
			},
			{ actions: [{ action: 'locationChange', arg: 'yearlings/pylaim' }], label: 'Into Town' }
		]
	},
	{
		id: 'yearlings/rocky-area',
		name: 'Rocky Area',
		biome: 'rocky',
		image: '/img/location/rocky-area.webp',
		choices: [
			{
				actions: async (s) =>
					await encounterRandomNpc(s, {
						table: [
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
						followBy: async (s) => {
							if (
								!s.character.flags.has('beat-morlin') &&
								counterIsEqual(s, ['yearlings/rocky-area:wins', 1])
							) {
								await locationChange(s, 'yearlings/morlin-cave');
							}
						}
					}),

				label: 'Explore'
			},
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/grassy-field' }],
				label: 'To The Field'
			},
			{ actions: [{ action: 'locationChange', arg: 'yearlings/pylaim' }], label: 'Into Town' }
		],
		exit: [{ action: 'counterReset', arg: 'yearlings/rocky-area:wins' }],
		desc: `
    A large barren scrubland, this area has a rough edge to it. Be careful to mind
    your step here. The field and town are not too far.
    `
	},
	{
		id: 'yearlings/morlin-cave',
		name: 'Mysterious Cravasse',
		biome: 'rocky',
		parent: 'yearlings/rocky-area',
		image: '/img/location/morlin-cave.webp',
		enter: [
			{
				action: 'messageSet',
				arg: `It looks like you'll need some rope to get down into this place.`,
				valid: { condition: 'flagIsNotSet', arg: 'found-rope' }
			}
		],
		choices: [
			{
				label: 'Climb down',
				actions: async (s) => await encounterRandomNpc(s, { table: ['yearlings/morlin'] }),
				show: (s) => s.character.flags.has('found-rope')
			},
			{ label: 'Head back', actions: [{ action: 'locationChange', arg: 'yearlings/rocky-area' }] }
		],
		desc: `You come across a cave in the ground.`
	},
	{
		id: 'yearlings/pylaim',
		name: 'Pylaim',
		biome: 'town',
		image: '/img/location/pylaim.webp',
		choices: [
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/grassy-field' }],
				label: 'Leave Town'
			},
			{ actions: [{ action: 'locationChange', arg: 'yearlings/pylaim/weapon' }], label: 'Weapons' },
			{ actions: [{ action: 'locationChange', arg: 'yearlings/pylaim/armor' }], label: 'Armor' },
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/pylaim/general' }],
				label: 'General'
			},
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/pylaim/teller' }],
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
		choices: [
			{
				actions: [
					{ action: 'shopStart', arg: `You are in luck, we have a range of swords in stock.` }
				],
				label: 'Browse Goods'
			},
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
		desc: `You stroll into the weapon shop to see what is for sale.`
	},
	{
		id: 'yearlings/pylaim/armor',
		name: 'Armor Shop',
		biome: 'town',
		image: '/img/location/armor-shop.webp',
		parent: 'yearlings/pylaim',
		choices: [
			{
				actions: [{ action: 'shopStart', arg: `Behold the finest armor around!` }],
				label: 'Browse Goods'
			},
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
		enter: [
			{
				action: 'branch',
				arg: {
					on: { condition: 'inventoryContains', arg: 'yearlings/old-rope' },
					isTrue: [
						{
							valid: { condition: 'flagIsSet', arg: 'declined-rope', not: true },
							action: 'messageSet',
							arg: `As you walk into the item shop the man behind the counter sees your old rope and warns "That old rope looks rotten to me. You're in luck, I just got some new rope in stock. I'll trade you for free if you send folks my way." Do you take the offered rope?`
						},
						{
							valid: { condition: 'flagIsSet', arg: 'declined-rope' },
							action: 'messageSet',
							arg: `"My rope trade is still available." Do you take the offered rope?`
						},
						{
							action: 'yesno',
							arg: {
								yes: [
									{ action: 'inventoryRemove', arg: 'yearlings/old-rope' },
									{ action: 'inventoryAdd', arg: 'yearlings/rope' }
								],
								no: [{ action: 'flagSet', arg: 'declined-rope' }]
							}
						}
					]
				}
			}
		],
		choices: [
			{
				actions: [{ action: 'shopStart', arg: `Nothing but the finest quality items!` }],
				label: 'Browse Goods'
			},
			BACK('Leave Store')
		],
		shop: [
			{ item: 'yearlings/cure-potion', stock: 5, cost: 10, willBuy: false },
			{ item: 'yearlings/bomb', stock: 5, cost: 15, willBuy: false }
		],
		desc: `What'll it be?`
	},
	{
		id: 'yearlings/pylaim/teller',
		name: 'Fortune Teller',
		biome: 'town',
		image: '/img/location/fortune-teller.webp',
		parent: 'yearlings/pylaim',
		enter: [{ action: 'messageSet', arg: `Hello dearie!` }],
		choices: [BACK()],
		desc: `A mysterious woman in a mysterious tent. I'm sure this will be fine.`
	},
	{
		id: 'yearlings/doomed-woods',
		name: 'Doomed Woods',
		biome: 'forest',
		image: '/img/location/doomed-woods.webp',
		choices: [
			{
				actions: async (s) => await encounterRandomNpc(s, { table: ['yearlings/kamul'] }),
				label: 'Explore'
			},
			{
				actions: [{ action: 'locationChange', arg: 'yearlings/grassy-field' }],
				label: 'Leave the Woods'
			}
		],
		desc: `
    The dread aura that kept you out of the woods thus far has subsided somewhat,
    but this place is undoubtedly creepy. The air is thick with evil and the trees
    wave menacingly at you.
    `
	}
];
