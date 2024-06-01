import type { GameDef, Gear, InventoryItem, Item } from '$lib/types';
import { evaluateDiceRoll, rollFormula } from '$util/dice';
import { defined } from '$util/array';
import { Set, Map } from 'svelte/reactivity';
import type { DataManager } from '$data/index';

export async function createNewCharacter(
	baseChar: GameDef['baseChar'],
	items: DataManager['items']
): Promise<Character> {
	const newHero = new Character(items);
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

const THRESHOLDS = [
	90, 210, 400, 630, 900, 1200, 1550, 1950, 2400, 2900, 3450, 4050, 4700, 5400, 6200
];

export class Character {
	#items: DataManager['items'];
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
	counters = new Map<string, number>();

	constructor(items: DataManager['items']) {
		this.#items = items;
	}

	takeDamage(amt: number) {
		this.hp = Math.max(0, this.hp - amt);
	}

	heal(amt: number) {
		this.hp = Math.min(this.maxHp, this.hp + amt);
	}

	inflictDamage(formula: string, ctx: Record<string, number>) {
		// TODO: figure this out
		const damage = Math.max(evaluateDiceRoll(formula, ctx), 0);
		const toHit = rollFormula('d6');
		if (toHit >= 3) {
			this.hp = Math.max(0, this.hp - damage);
			return damage;
		}
		return 0;
	}

	gainExperience(amount: number) {
		if (!amount) return false;
		this.xp += amount;
		if (this.xp > THRESHOLDS[this.level - 1]) {
			this.level += 1;
			this.str += 2;
			this.dex += 2;
			this.maxHp += 8;
			return true;
		}
		return false;
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
			item = await this.#items.get(item);
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
			item = await this.#items.get(item);
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
