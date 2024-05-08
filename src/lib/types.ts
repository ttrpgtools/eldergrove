import type { Action } from './actions';
import type { Conditional } from './conditions';

export type Identifiable = { id: string };
export type Named = { name: string };

export interface Entity extends Identifiable, Named {
	desc?: string;
	image?: string;
	icon?: string;
}

export interface Choice {
	label: string;
	show?: Conditional;
	actions: Action[];
}

export type LocationType = 'tile' | 'settlement' | 'poi' | 'room';

//type ItemType = 'weapon' | 'armor' | 'trinket' | 'consumable';

export type EquipSlot = 'hand' | 'torso' | 'head' | 'feet';

type AttackType = 'physical' | 'elemental' | 'mental';
type HealingType = 'medicinal' | 'magical' | 'spiritual';

export interface Attack extends Entity {
	type: 'attack';
	nature: AttackType;
	amount: string;
}

export interface Healing extends Entity {
	type: 'healing';
	nature: HealingType;
	amount: string;
}

export type Effect = Attack | Healing;

interface BaseItem extends Entity {
	unique?: boolean;
	effects?: Effect[];
	enter?: Action[];
	exit?: Action[];
}
export interface Weapon extends BaseItem {
	type: 'weapon';
	where?: EquipSlot[] | EquipSlot;
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
	enter?: Action[];
	exit?: Action[];
	effects?: Effect[];
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

export interface Encounter {
	msg?: string;
	flow?: 'fight' | 'shop';
	npc?: NpcInstance;
	shop?: ShopItemInstance[];
	actions?: Action[];
	location?: string | Location;
	flag?: string;
	final?: boolean;
}

export interface ActionContext {
	locations: Set<string>;
	data: {
		[x: `s${string}`]: string;
		[y: `n${string}`]: number;
		[z: `is${string}`]: boolean;
	};
}

export type ActionContextDataKey = keyof ActionContext['data'];

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
