import { DEFAULT_RULES, GEAR_SLOTS, validateGains, type GameRules } from '$lib/rules';
import { integer } from '$lib/contracts';
import type { CharDef, Gear, InventoryItem, Item } from '$lib/types';
import { evaluateDiceRoll, rollFormula } from '$util/dice';
import { defined } from '$util/array';
import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import type { DataManager } from '$data/index';

export async function createNewCharacter(
	baseChar: CharDef,
	items: DataManager['items'],
	rules: GameRules = DEFAULT_RULES
): Promise<Character> {
	const newHero = new Character(items, rules);
	newHero.name = baseChar.name;
	newHero.maxHp = baseChar.maxHp;
	newHero.hp = baseChar.hp ?? baseChar.maxHp;
	newHero.coin = baseChar.coin;
	newHero.str = baseChar.str;
	newHero.dex = baseChar.dex;
	newHero.wil = baseChar.wil;
	newHero.xp = baseChar.xp;
	newHero.level = baseChar.level;
	for await (const item of baseChar.equip) {
		await newHero.equipItem(item[0], item[1]);
	}
	for await (const item of baseChar.inventory) {
		await newHero.addToInventory(item[0], item[1]);
	}
	if (baseChar.flags) {
		for (const flag of baseChar.flags) {
			newHero.flags.add(flag);
		}
	}
	if (baseChar.counters) {
		for (const [k, v] of baseChar.counters) {
			newHero.counters.set(k, v);
		}
	}
	return newHero;
}

export class Character {
	#items: DataManager['items'];
	name = $state('');
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
	flags = new SvelteSet<string>();
	counters = new SvelteMap<string, number>();

	constructor(
		items: DataManager['items'],
		private rules: GameRules = DEFAULT_RULES
	) {
		this.#items = items;
	}

	toJSON() {
		return {
			name: this.name,
			hp: this.hp,
			maxHp: this.maxHp,
			coin: this.coin,
			xp: this.xp,
			level: this.level,
			str: this.str,
			dex: this.dex,
			wil: this.wil,
			inventory: this.inventory.map((inv) => [inv.item.id, inv.quantity]),
			equip: (Object.keys(this.gear) as (keyof Gear)[]).flatMap((slot): [string, keyof Gear][] => {
				const item = this.gear[slot];
				return item ? [[item.id, slot]] : [];
			}),
			flags: Array.from(this.flags),
			counters: Array.from(this.counters)
		} satisfies CharDef;
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
		integer(amount, 'experience');
		const xp = integer(this.xp + amount, 'experience total');
		const plan = {
			level: this.level,
			str: this.str,
			dex: this.dex,
			wil: this.wil,
			maxHp: this.maxHp
		};
		const progression = this.rules.progression;
		while (plan.level < progression.maxLevel && xp >= progression.thresholds[plan.level - 1]) {
			plan.level++;
			const gains = validateGains(
				typeof progression.gains === 'function' ? progression.gains(plan.level) : progression.gains
			);
			for (const stat of ['str', 'dex', 'wil', 'maxHp'] as const)
				plan[stat] = integer(plan[stat] + (gains[stat] ?? 0), stat);
		}
		const leveled = plan.level > this.level;
		this.xp = xp;
		Object.assign(this, plan);
		return leveled;
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

	async autoEquip(item: Item | undefined) {
		if (!item || this.getInventoryCount(item) < 1) return;
		const slots = this.rules.equipment.slots(item, this);
		if (!Array.isArray(slots) || slots.some((slot) => !GEAR_SLOTS.includes(slot)))
			throw new Error('Invalid equipment slots.');
		const attempted = slots.filter((slot) => {
			const allowed = this.rules.equipment.canEquip(this, item, slot);
			if (typeof allowed !== 'boolean') throw new Error('canEquip must return a boolean.');
			return allowed;
		});
		if (!attempted.length) return;
		// Set to first unoccupied slot
		const unoccupied = attempted.find((eqs) => !this.gear[eqs]);
		if (unoccupied) {
			await this.equipItem(item, unoccupied);
			this.removeFromInventory(item);
			return unoccupied;
		}
		const preferred = attempted[0];
		await this.unequip(preferred);
		this.removeFromInventory(item);
		await this.equipItem(item, preferred);
		return preferred;
	}

	async unequip(where: keyof Gear) {
		const item = this.gear[where];
		if (item) {
			this.gear[where] = undefined;
			await this.addToInventory(item);
		}
	}

	isEquipped(item: string | Item) {
		if (typeof item !== 'string') {
			item = item.id;
		}
		return this.equipped.find((eq) => eq.id === item);
	}
}
