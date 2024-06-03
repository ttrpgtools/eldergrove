import type { GameState } from '$state/game.svelte';
import type { Actions } from './actions';
import type { Condition } from './conditions';

export type Identifiable = { id: string };
export type Named = { name: string };

export interface Entity extends Identifiable, Named {
	desc?: string;
	image?: string;
	icon?: string;
	effects?: Actions;
	enter?: Actions;
	exit?: Actions;
}

export interface Choice {
	label: string;
	show?: Condition;
	actions: Actions;
}

export type LocationType = 'tile' | 'settlement' | 'poi' | 'room';

//type ItemType = 'weapon' | 'armor' | 'trinket' | 'consumable';

export type EquipSlot = 'hand' | 'torso' | 'head' | 'feet';

interface BaseItem extends Entity {
	rarity?: 'common' | 'rare' | 'mythical' | 'unique';
}
export interface Weapon extends BaseItem {
	type: 'weapon';
	where?: EquipSlot[] | EquipSlot;
	damage?: { amt: string; type: string };
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
	active?: Condition;
}

export interface RandomTable<T> {
	formula?: string;
	options: TableOption<T>[];
}
interface AdvancedEntity extends Entity {
	coins?: number | string;
	items?: RandomTable<string> | string[];
}

export interface Experience extends AdvancedEntity {
	exp: number;
}
export interface NpcTemplate extends Experience {
	maxHp: number;
	defend?: (s: GameState, type: string, dmg: number) => number;
}

export interface NpcInstance extends NpcTemplate {
	hp: number;
}

export interface Location extends AdvancedEntity {
	biome: string;
	choices?: Choice[];
	parent?: string;
	shop?: ShopItem[];
}

export type Scene = Location | NpcInstance;

export interface InventoryItem {
	item: Item;
	quantity: number;
}

export type HasHealth = { maxHp: number; hp: number };

export interface ActionContext {
	locations: Set<string>;
	rollResult?: number;
	encounterVictory?: boolean;
}

export interface GameEvents {
	npcHpChange: number;
	hpChange: number;
}

export interface CharDef {
	name: string;
	hp?: number;
	maxHp: number;
	coin: number;
	str: number;
	dex: number;
	wil: number;
	xp: number;
	level: number;
	inventory: [string, number][];
	equip: [string, keyof Gear][];
	flags?: string[];
	counters?: [string, number][];
}

export interface GameDef {
	id: string;
	start: string;
	baseChar: CharDef;
	locations: Location[];
	items: Item[];
	npcTemplates: NpcTemplate[];
	npcInstances: NpcInstance[];
}
