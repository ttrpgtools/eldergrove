import type { Actions } from './actions';
import type { GameState } from './state/game.svelte';
import type { Character } from './state/character.svelte';
import type { GameDef, Gear, Item } from './types';
import { immutableSnapshot } from './definitions';
import { array, integer, number, object, string } from './contracts';
import { GAME_DICE_KEYS, validateDiceFormula } from './util/dice';
import type { NumericValue } from './arguments';

export interface StatGains {
	str?: number;
	dex?: number;
	wil?: number;
	maxHp?: number;
}
export interface Damage {
	amount: number;
	type?: string;
	source: 'attack' | 'effect';
}
export type DamageArgument =
	NumericValue | { amount: NumericValue; type?: string; source?: Damage['source'] };
export interface CombatRules {
	unarmed: { amt: string; type: string };
	npcAttack: string;
	retaliationDelay: number;
	weapon: (state: GameState) => Item | undefined;
	armor: (state: GameState) => number;
	defendNpc: (state: GameState, damage: Readonly<Damage>) => number;
	defendCharacter: (state: GameState, damage: Readonly<Damage>) => number;
}
export interface EquipmentRules {
	slots: (item: Item, character: Character) => (keyof Gear)[];
	canEquip: (character: Character, item: Item, slot: keyof Gear) => boolean;
}
export interface ProgressionRules {
	thresholds: readonly number[];
	maxLevel: number;
	gains: StatGains | ((newLevel: number) => StatGains);
}
export interface EncounterRules {
	streakKey: (state: GameState) => string | undefined;
	resetOnRun: boolean;
	onFinish?: Actions;
}
export interface DeathRules {
	item?: string;
	message?: string;
	onDeath?: Actions;
}
export interface GameRules {
	combat: CombatRules;
	equipment: EquipmentRules;
	progression: ProgressionRules;
	encounters: EncounterRules;
	death: DeathRules;
}
export type RuleOverrides = { [K in keyof GameRules]?: Partial<GameRules[K]> };
export interface RuleModule {
	id: string;
	rules: RuleOverrides;
}

export const GEAR_SLOTS: readonly (keyof Gear)[] = ['right', 'left', 'head', 'torso', 'feet'];
function defaultSlots(item: Item): (keyof Gear)[] {
	if (item.type !== 'armor' && item.type !== 'weapon') return [];
	const where = item.where ?? (item.type === 'weapon' ? 'hand' : 'torso');
	return (Array.isArray(where) ? where : [where]).flatMap((slot) =>
		slot === 'hand' ? (['right', 'left'] as const) : slot
	);
}
const defaults: GameRules = {
	combat: {
		unarmed: { amt: 'd4 + [@str]', type: 'blunt' },
		npcAttack: 'd[#maxhp]-0.5*([@armor]+[@dex])',
		retaliationDelay: 1500,
		weapon: (state) =>
			[state.character.gear.right, state.character.gear.left].find(
				(item) => item?.type === 'weapon'
			),
		armor: (state) =>
			state.character.gear.torso?.type === 'armor' ? state.character.gear.torso.defence : 0,
		defendNpc: (state, damage) =>
			state.npc.current?.defend
				? state.npc.current.defend(state, damage.type ?? 'untyped', damage.amount)
				: damage.amount,
		defendCharacter: (_, damage) => damage.amount
	},
	equipment: {
		slots: defaultSlots,
		canEquip: (_, item, slot) => defaultSlots(item).includes(slot)
	},
	progression: {
		thresholds: [
			90, 210, 400, 630, 900, 1200, 1550, 1950, 2400, 2900, 3450, 4050, 4700, 5400, 6200
		],
		maxLevel: 16,
		gains: { str: 2, dex: 2, maxHp: 8 }
	},
	encounters: { streakKey: (state) => `${state.location.current.id}:wins`, resetOnRun: true },
	death: {}
};
export const DEFAULT_RULES: Readonly<GameRules> = immutableSnapshot(defaults) as GameRules;

export function validateGains(value: unknown, path = 'progression.gains'): StatGains {
	const gains = object(value, path);
	if (Object.getPrototypeOf(gains) !== Object.prototype && Object.getPrototypeOf(gains) !== null)
		throw new Error(`${path}: expected a plain stat gain object from a synchronous hook.`);
	for (const key of Object.keys(gains)) {
		if (!['str', 'dex', 'wil', 'maxHp'].includes(key))
			throw new Error(`${path}: unsupported stat '${key}'.`);
		integer(gains[key], `${path}.${key}`);
	}
	return gains as StatGains;
}
export function defineRuleModule(id: string, rules: RuleOverrides): RuleModule {
	if (!/^[\w-]+\/[\w/-]+$/.test(id)) throw new Error('Rule module names must be namespaced.');
	return immutableSnapshot({ id, rules }) as RuleModule;
}

/** Ordered modules compose per session; direct adventure overrides take precedence. */
export function resolveRules(game: Pick<GameDef, 'rules' | 'ruleModules'>): GameRules {
	const rules: GameRules = {
		combat: { ...DEFAULT_RULES.combat },
		equipment: { ...DEFAULT_RULES.equipment },
		progression: { ...DEFAULT_RULES.progression },
		encounters: { ...DEFAULT_RULES.encounters },
		death: { ...DEFAULT_RULES.death }
	};
	let explicitMaximum: number | undefined;
	const ids = new Set<string>();
	const sources: RuleOverrides[] = [];
	for (const value of array(game.ruleModules ?? [], 'ruleModules')) {
		const module = object(value, 'ruleModule');
		const id = string(module.id, 'ruleModule.id');
		if (!/^[\w-]+\/[\w/-]+$/.test(id)) throw new Error('Rule module names must be namespaced.');
		if (ids.has(id)) throw new Error(`Duplicate rule module '${id}'.`);
		ids.add(id);
		sources.push(object(module.rules, `ruleModule '${id}'.rules`) as RuleOverrides);
	}
	if (game.rules !== undefined) sources.push(game.rules);
	for (const source of sources) {
		object(source, 'rules');
		for (const key of Object.keys(source)) {
			if (!Object.hasOwn(DEFAULT_RULES, key)) throw new Error(`Unknown rule group '${key}'.`);
			const group = key as keyof GameRules;
			const fields = object(source[group], `rules.${group}`);
			const allowed: Record<keyof GameRules, string[]> = {
				combat: [
					'unarmed',
					'npcAttack',
					'retaliationDelay',
					'weapon',
					'armor',
					'defendNpc',
					'defendCharacter'
				],
				equipment: ['slots', 'canEquip'],
				progression: ['thresholds', 'maxLevel', 'gains'],
				encounters: ['streakKey', 'resetOnRun', 'onFinish'],
				death: ['item', 'message', 'onDeath']
			};
			for (const field of Object.keys(fields))
				if (!allowed[group].includes(field)) throw new Error(`Unknown rule '${group}.${field}'.`);
			Object.assign(rules, { [group]: { ...rules[group], ...source[group] } });
		}
		if (source.progression?.maxLevel !== undefined) explicitMaximum = source.progression.maxLevel;
	}
	const progression = rules.progression;
	array(progression.thresholds, 'progression.thresholds');
	if (progression.thresholds.length > 999)
		throw new Error('Progression supports at most 1000 levels.');
	progression.maxLevel = explicitMaximum ?? progression.thresholds.length + 1;
	integer(progression.maxLevel, 'progression.maxLevel', 1, progression.thresholds.length + 1);
	let previous = -1;
	for (const threshold of progression.thresholds) {
		integer(threshold, 'progression.threshold', 0);
		if (threshold <= previous) throw new Error('Progression thresholds must strictly increase.');
		previous = threshold;
	}
	if (typeof progression.gains !== 'function') validateGains(progression.gains);
	for (const [path, value] of Object.entries({
		'combat.weapon': rules.combat.weapon,
		'combat.armor': rules.combat.armor,
		'combat.defendNpc': rules.combat.defendNpc,
		'combat.defendCharacter': rules.combat.defendCharacter,
		'equipment.slots': rules.equipment.slots,
		'equipment.canEquip': rules.equipment.canEquip,
		'encounters.streakKey': rules.encounters.streakKey
	})) {
		if (typeof value !== 'function')
			throw new Error(`${path}: expected a synchronous rule function.`);
	}
	object(rules.combat.unarmed, 'combat.unarmed');
	string(rules.combat.unarmed.type, 'combat.unarmed.type');
	validateDiceFormula(rules.combat.unarmed.amt, GAME_DICE_KEYS);
	validateDiceFormula(rules.combat.npcAttack, GAME_DICE_KEYS);
	integer(rules.combat.retaliationDelay, 'combat.retaliationDelay', 0, 60000);
	if (typeof rules.encounters.resetOnRun !== 'boolean')
		throw new Error('encounters.resetOnRun: expected a boolean.');
	if (rules.death.item !== undefined) string(rules.death.item, 'death.item');
	if (rules.death.message !== undefined) string(rules.death.message, 'death.message', true);
	// Always detach each group before freezing; resolving defaults must not alter them.
	return immutableSnapshot(rules) as GameRules;
}
export function ruleAmount(value: number, name: string): number {
	return Math.max(0, Math.trunc(number(value, name, -1e12, 1e12)));
}
