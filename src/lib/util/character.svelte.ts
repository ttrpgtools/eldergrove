import type { InventoryItem, Item } from '$lib/types';
import { rollFormula } from './dice';
import { getItem } from '../data/items';
import { defined } from './array';
import { Set } from 'svelte/reactivity';

export async function createNewCharacter(): Promise<Character> {
	const newHero = new Character();
	await newHero.equipItem('rusty-dagger', 'right');
	await newHero.equipItem('tattered-robes', 'torso');
	await newHero.addToInventory('health-potion-sm', 10);
	await newHero.addToInventory('mystery-object');
	return newHero;
}

type Gear = {
	right?: Item | undefined;
	left?: Item | undefined;
	head?: Item | undefined;
	torso?: Item | undefined;
	feet?: Item | undefined;
};

export class Character {
	hp = $state(10);
	maxHp = $state(10);
	gp = $state(150);
	xp = $state(0);
	level = $state(1);
	inventory: InventoryItem[] = $state([]);
	gear: Gear = $state({});
	equipped = $derived(
		[this.gear.right, this.gear.left, this.gear.head, this.gear.torso, this.gear.feet].filter(
			defined
		)
	);
	flags = new Set<string>();

	inflictDamage(formula: string) {
		// TODO: figure this out
		const damage = rollFormula(formula);
		const toHit = rollFormula('d6');
		if (toHit >= 3) {
			this.hp = Math.max(0, this.hp - damage);
			return damage;
		}
		return 0;
	}

	#getInventoryItem(item: Item | string) {
		if (typeof item !== 'string') {
			item = item.id;
		}
		// TODO Handle item stacks
		return this.inventory.findIndex((listing) => listing.item.id === item);
	}

	async addToInventory(item: Item | string, quantity = 1) {
		const existing = this.#getInventoryItem(item);
		if (existing >= 0) {
			this.inventory[existing].quantity += quantity;
			return;
		}
		if (typeof item === 'string') {
			item = await getItem(item);
		}
		this.inventory.push({ item, quantity });
	}

	getInventoryCount(item: Item | string) {
		const found = this.#getInventoryItem(item);
		return found === -1 ? 0 : this.inventory[found].quantity;
	}

	removeFromInventory(item: Item | string, quantity = 1) {
		const existing = this.#getInventoryItem(item);
		if (existing === -1) {
			return 0;
		}
		if (this.inventory[existing].quantity > quantity) {
			this.inventory[existing].quantity -= quantity;
			return quantity;
		}
		const remaining = this.inventory[existing].quantity;
		this.inventory.splice(existing, 1);
		return remaining;
	}

	async equipItem(item: Item | string, where: keyof Gear) {
		if (typeof item === 'string') {
			item = await getItem(item);
		}
		this.gear[where] = item;
	}

	async unequip(where: keyof Gear) {
		const item = this.gear[where];
		if (item) {
			this.gear[where] = undefined;
			this.addToInventory(item);
		}
	}
}
