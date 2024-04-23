import type { GameDef, Gear, InventoryItem, Item } from '$lib/types';
import { rollFormula } from './dice';
import { getItem } from '../data/items';
import { defined } from './array';
import { Set } from 'svelte/reactivity';

export async function createNewCharacter(baseChar: GameDef['baseChar']): Promise<Character> {
	const newHero = new Character();
	newHero.maxHp = baseChar.hp;
	newHero.hp = baseChar.hp;
	newHero.coin = baseChar.coin;
	newHero.str = baseChar.str;
	newHero.dex = baseChar.dex;
	newHero.wil = baseChar.wil;
	newHero.xp = baseChar.exp;
	newHero.level = baseChar.level;
	for await (const item of baseChar.equip) {
		await newHero.equipItem(item[0], item[1]);
	}
	for await (const item of baseChar.inventory) {
		await newHero.addToInventory(item[0], item[1]);
	}
	return newHero;
}

export class Character {
	name = $state('Stranger');
	hp = $state(10);
	maxHp = $state(10);
	coin = $state(30);
	xp = $state(0);
	level = $state(1);
	str = $state(4);
	dex = $state(3);
	wil = $state(3);
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

	autoEquip(item: Item | undefined) {
		console.log(`Auto equipping ${item?.name}`);
		if (!item || (item.type !== 'armor' && item.type !== 'weapon')) return;
		const attempted: (keyof Gear)[] = (
			typeof item.where === 'string' ? [item.where] : item.where ?? []
		).flatMap((eq) => (eq === 'hand' ? ['right', 'left'] : eq));
		if (attempted.length === 0) {
			// TODO Auto infer from name?
			// For now... fail
			return;
		}
		// Set to first unoccupied slot
		const unoccupied = attempted.find((eqs) => !this.gear[eqs]);
		if (unoccupied) {
			this.equipItem(item, unoccupied);
			this.removeFromInventory(item);
			return unoccupied;
		}
		const preferred = attempted[0];
		this.unequip(preferred);
		this.removeFromInventory(item);
		this.equipItem(item, preferred);
		return preferred;
	}

	async unequip(where: keyof Gear) {
		const item = this.gear[where];
		if (item) {
			this.gear[where] = undefined;
			this.addToInventory(item);
		}
	}

	isEquipped(item: string | Item) {
		if (typeof item !== 'string') {
			item = item.id;
		}
		return this.equipped.find((eq) => eq.id === item);
	}
}
