import type { Item } from '$lib/types';

const items: Item[] = [
	{
		type: 'weapon',
		id: 'rusty-dagger',
		name: 'Rusty Dagger',
		icon: '',
		image: '/img/item/rusty-dagger.webp',
		effects: [
			{
				id: 'rusty-dagger-slash',
				name: 'Slash',
				type: 'attack',
				nature: 'physical',
				amount: 'd4-1'
			}
		],
		where: 'hand',
		desc: `Ooo... tetanus! Maybe you can open your mail with it.`
	},
	{
		type: 'weapon',
		id: 'iron-dagger',
		name: 'Iron Dagger',
		icon: '',
		image: '/img/item/iron-dagger.webp',
		effects: [
			{
				id: 'iron-dagger-slash',
				name: 'Slash',
				type: 'attack',
				nature: 'physical',
				amount: 'd4'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'armor',
		id: 'tattered-robes',
		name: 'Tattered Robes',
		icon: '',
		image: '/img/item/cloth-armor.webp',
		defence: 0,
		where: 'torso',
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	},
	{
		type: 'armor',
		id: 'wooden-shield',
		name: 'Wooden Shield',
		icon: '',
		image: '/img/item/wooden-shield.webp',
		defence: 1,
		where: 'hand',
		desc: `Simple but effective, if you know how to use it. And you seem to.`
	},
	{
		type: 'consumable',
		id: 'health-potion-sm',
		name: 'Health Potion',
		icon: '',
		image: '/img/item/health-potion-sm.webp',
		effects: [
			{
				id: 'health-potion-sm-healing',
				name: 'Heal',
				type: 'healing',
				nature: 'medicinal',
				amount: `d4+4`
			}
		],
		desc: `You'd think this would taste like strawberry or cherry, but nope. Hope you like bitter.`
	},
	{
		type: 'trinket',
		id: 'mystery-object',
		name: 'Unknown Object',
		icon: '',
		image: '/img/item/mystery-box.webp',
		desc: ``
	},
	{
		type: 'consumable',
		id: 'yearlings/cure-potion',
		name: 'Cure Potion',
		icon: '',
		image: '/img/item/health-potion-sm.webp',
		effects: [
			{
				id: 'yearlings/cure-potion-healing',
				name: 'Heal',
				type: 'healing',
				nature: 'medicinal',
				amount: `10`
			}
		],
		desc: `You'd think this would taste like strawberry or cherry, but nope. Hope you like bitter.`
	},
	{
		type: 'consumable',
		id: 'yearlings/bomb',
		name: 'Bomb',
		icon: '',
		image: '/img/item/bomb.webp',
		effects: [
			{
				id: 'yearlings/bomb-kaboom',
				name: 'Kaboom',
				type: 'attack',
				nature: 'physical',
				amount: '20'
			}
		],
		desc: `Kaboom!`
	},
	{
		type: 'weapon',
		id: 'yearlings/rapier',
		name: 'Rapier',
		icon: '',
		image: '/img/item/rapier.webp',
		effects: [
			{
				id: 'yearlings/rapier-stab',
				name: 'Stab',
				type: 'attack',
				nature: 'physical',
				amount: 'd(2*[@str]+6)'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'weapon',
		id: 'yearlings/phantom-blade',
		name: 'Phantom Blade',
		icon: '',
		image: '/img/item/phantom-blade.webp',
		effects: [
			{
				id: 'yearlings/phantom-blade-slash',
				name: 'Phase Slash',
				type: 'attack',
				nature: 'physical',
				amount: 'd(2*[@str]+14)'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'weapon',
		id: 'yearlings/katana',
		name: 'Katana',
		icon: '',
		image: '/img/item/katana.webp',
		effects: [
			{
				id: 'yearlings/katana-slice',
				name: 'Slice',
				type: 'attack',
				nature: 'physical',
				amount: 'd(2*[@str]+20)'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'weapon',
		id: 'yearlings/exaliber',
		name: 'eXaliber',
		icon: '',
		image: '/img/item/exaliber.webp',
		effects: [
			{
				id: 'yearlings/exaliber-slash',
				name: 'Mighty Slash',
				type: 'attack',
				nature: 'physical',
				amount: 'd(2*[@str]+30)'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'weapon',
		id: 'yearlings/masemune',
		name: 'Masemune',
		icon: '',
		image: '/img/item/masemune.webp',
		effects: [
			{
				id: 'yearlings/masemune-cut',
				name: 'Cut',
				type: 'attack',
				nature: 'physical',
				amount: 'd(2*[@str]+42)'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'weapon',
		id: 'yearlings/dragon-bane',
		name: `Dragon's Bane`,
		icon: '',
		image: '/img/item/dragon-bane.webp',
		effects: [
			{
				id: 'yearlings/dragon-bane-stab',
				name: 'Stab',
				type: 'attack',
				nature: 'physical',
				amount: 'd(2*[@str]+66)'
			}
		],
		where: 'hand',
		desc: `Simple, sharp and not rusty. Nice.`
	},
	{
		type: 'armor',
		id: 'yearlings/aura-coat',
		name: 'Aura Coat',
		icon: '',
		image: '/img/item/aura-coat.webp',
		defence: 2,
		where: 'torso',
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	},
	{
		type: 'armor',
		id: 'yearlings/chain-mail',
		name: 'Chain Mail',
		icon: '',
		image: '/img/item/chain-mail.webp',
		defence: 5,
		where: 'torso',
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	},
	{
		type: 'armor',
		id: 'yearlings/plate-mail',
		name: 'Plate Mail',
		icon: '',
		image: '/img/item/plate-mail.webp',
		defence: 9,
		where: 'torso',
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	},
	{
		type: 'armor',
		id: 'yearlings/dragon-torso',
		name: 'Dragon Torso',
		icon: '',
		image: '/img/item/dragon-torso.webp',
		defence: 13,
		where: 'torso',
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	},
	{
		type: 'armor',
		id: 'yearlings/diamond-suit',
		name: 'Diamond Suit',
		icon: '',
		image: '/img/item/diamond-suit.webp',
		defence: 18,
		where: 'torso',
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	}
];

const itemMap = new Map<string, Item>(items.map((item) => [item.id, item]));

export async function getItem(itemId: string): Promise<Item> {
	const item = itemMap.get(itemId);
	if (!item) throw `Unknown item ${itemId}`;
	return Promise.resolve(item);
}
