import type { Item } from '$lib/types';

export const items: Item[] = [
	{
		type: 'weapon',
		id: 'rusty-dagger',
		name: 'Rusty Dagger',
		icon: '',
		image: '/img/item/rusty-dagger.webp',
		damage: { amt: 'd4-1', type: 'stabbing' },
		where: 'hand',
		desc: `Ooo... tetanus! Maybe you can open your mail with it.`
	},
	{
		type: 'weapon',
		id: 'iron-dagger',
		name: 'Iron Dagger',
		icon: '',
		image: '/img/item/iron-dagger.webp',
		damage: { amt: 'd4', type: 'stabbing' },
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
		effects: [{ action: 'diceRoll', arg: `d4+4` }, { action: 'hpHeal' }],
		desc: `You'd think this would taste like strawberry or cherry, but nope. Hope you like bitter.`
	},
	{
		type: 'trinket',
		id: 'mystery-object',
		name: 'Unknown Object',
		icon: '',
		image: '/img/item/mystery-box.webp',
		desc: ``
	}
];
