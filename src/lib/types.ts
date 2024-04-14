import type { ActionName } from './const';

export type Identifiable = { id: string };
export type Named = { name: string };

export interface Entity extends Identifiable, Named {
	desc?: string;
	image?: string;
	icon?: string;
}

export type LocationType = 'tile' | 'settlement' | 'poi' | 'room';

export type ActionType = (typeof ActionName)[keyof typeof ActionName];
export interface Action {
	action: ActionType;
	label?: string;
	show?: string | { condition: string; arg: unknown };
	arg?: unknown;
}

//type ItemType = 'weapon' | 'armor' | 'trinket' | 'consumable';
interface BaseItem extends Entity {
	unique?: boolean;
}

export interface Weapon extends BaseItem {
	type: 'weapon';
	damage: string;
	// Minimum strength? Other requirements?
}

export interface Armor extends BaseItem {
	type: 'armor';
	defence: number;
}

export interface Trinket extends BaseItem {
	type: 'trinket';
}

export interface Consumable extends BaseItem {
	type: 'consumable';
}

export type Item = Weapon | Armor | Trinket | Consumable;

export interface ShopItem {
	item: Item;
	stock: number;
	cost: number;
	willBuy: number;
}

interface TableOption<T> {
	trigger: number | [number, number];
	value: T;
}

export interface RandomTable<T> {
	formula?: string;
	options: TableOption<T>[];
}

export interface NpcTemplate extends Entity {
	maxHp: number;
	loot: number | string;
	exp: number;
}

export interface NpcInstance extends NpcTemplate {
	hp: number;
}

export interface Location extends Entity {
	biome: string;
	actions: Action[];
	parent?: string;
	encounters?: RandomTable<string> | string[];
	items?: RandomTable<string> | string[];
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
	actions?: Action[];
	location?: string | Location;
}
