import type { Item } from '$lib/types';

const items: Item[] = [
	{
		type: 'weapon',
		id: 'rusty-dagger',
		name: 'Rusty Dagger',
		icon: '',
		image: '/img/rusty-dagger.webp',
		damage: 'd4',
		desc: `Ooo... tetanus! Maybe you can open your mail with it.`
	},
	{
		type: 'armor',
		id: 'tattered-robes',
		name: 'Tattered Robes',
		icon: '',
		image: '/img/cloth-armor.webp',
		defence: 0,
		desc: `I think we all know that calling this armor is being generous. But it was what you washed up with.`
	},
	{
		type: 'armor',
		id: 'wooden-shield',
		name: 'Wooden Shield',
		icon: '',
		image: '/img/wooden-shield.webp',
		defence: 1,
		desc: `Simple but effective, if you know how to use it. And you seem to.`
	},
	{
		type: 'consumable',
		id: 'health-potion-sm',
		name: 'Health Potion',
		icon: '',
		image: '/img/health-potion-sm.webp',
		desc: `You'd think this would taste like strawberry or cherry, but nope. Hope you like bitter.`
	},
	{
		type: 'trinket',
		id: 'mystery-object',
		name: 'Unknown Object',
		icon: '',
		image: '/img/mystery-box.webp',
		desc: ``
	}
];

const itemMap = new Map<string, Item>(items.map((item) => [item.id, item]));

export async function getItem(itemId: string): Promise<Item> {
	const item = itemMap.get(itemId);
	if (!item) throw `Unknown item ${itemId}`;
	return Promise.resolve(item);
}
