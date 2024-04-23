import type { ActionName } from './const';

export type Identifiable = { id: string };
export type Named = { name: string };

export interface Entity extends Identifiable, Named {
	desc?: string;
	image?: string;
	icon?: string;
}

export type LocationType = 'tile' | 'settlement' | 'poi' | 'room';

type Conditional = string | { condition: string; arg: unknown };

export type ActionType = (typeof ActionName)[keyof typeof ActionName];
export interface Action {
	action: ActionType;
	label?: string;
	show?: Conditional;
	arg?: unknown;
}

//type ItemType = 'weapon' | 'armor' | 'trinket' | 'consumable';
interface BaseItem extends Entity {
	unique?: boolean;
}

export type EquipSlot = 'hand' | 'torso' | 'head' | 'feet';

export interface Weapon extends BaseItem {
	type: 'weapon';
	where?: EquipSlot[] | EquipSlot;
	damage: string;
	// Minimum strength? Other requirements?
}

export interface Armor extends BaseItem {
	type: 'armor';
	where?: EquipSlot[] | EquipSlot;
	defence: number;
}

export interface Trinket extends BaseItem {
	type: 'trinket';
}

export interface Consumable extends BaseItem {
	type: 'consumable';
}

export type Item = Weapon | Armor | Trinket | Consumable;

export type Gear = {
	right?: Item | undefined;
	left?: Item | undefined;
	head?: Item | undefined;
	torso?: Item | undefined;
	feet?: Item | undefined;
};

export interface ShopItem {
	item: string | Item;
	stock: number;
	cost: number;
	willBuy?: number | boolean;
}

export interface ShopItemInstance extends ShopItem {
	item: Item;
}

interface TableOption<T> {
	trigger: number | [number, number];
	value: T;
	active?: Conditional;
}

export interface RandomTable<T> {
	formula?: string;
	options: TableOption<T>[];
}
interface AdvancedEntity extends Entity {
	coins?: number | string;
	items?: RandomTable<string> | string[];
	enter?: Action;
	exit?: Action;
}

export interface Experience extends AdvancedEntity {
	exp: number;
}
export interface NpcTemplate extends Experience {
	maxHp: number;
}

export interface NpcInstance extends NpcTemplate {
	hp: number;
}

export interface Location extends AdvancedEntity {
	biome: string;
	actions: Action[];
	parent?: string;
	encounters?: RandomTable<string> | string[];
	shop?: ShopItem[];
}

export type Scene = Location | NpcInstance;

export interface InventoryItem {
	item: Item;
	quantity: number;
}

export type HasHealth = { maxHp: number; hp: number };

export interface Encounter {
	msg?: string;
	flow?: 'fight' | 'shop';
	npc?: NpcInstance;
	shop?: ShopItemInstance[];
	actions?: Action[];
	location?: string | Location;
}

export interface GameDef extends Entity {
	start: string;
	baseChar: {
		hp: number;
		coin: number;
		str: number;
		dex: number;
		wil: number;
		exp: number;
		level: number;
		inventory: [string, number][];
		equip: [string, keyof Gear][];
	};
}
