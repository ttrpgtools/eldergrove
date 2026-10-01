import { resolveRules, type GameRules } from './rules';
import type { AdventureDefinition } from './definitions';
import type { Action } from './actions';
import type { Condition } from './conditions';
import type { GameDef, Entity } from './types';
import { array, integer, number, object, string, assertCondition, walkActions } from './contracts';
import { GAME_DICE_KEYS, validateDiceFormula } from './util/dice';
import { biomes as defaultBiomes } from './data/biomes';

export interface ContentDiagnostic {
	severity: 'error' | 'warning';
	path: string;
	message: string;
}
export interface ContentOptions {
	assets?: ReadonlySet<string>;
	biomes?: Entity[];
}
export class ContentValidationError extends Error {
	constructor(public diagnostics: ContentDiagnostic[]) {
		super(
			`Adventure content is invalid:\n${diagnostics
				.filter((d) => d.severity === 'error')
				.map((d) => `${d.path}: ${d.message}`)
				.join('\n')}`
		);
		this.name = 'ContentValidationError';
	}
}

/** Pure author diagnostics; no hooks execute, assets fetch, or input data mutate. */
export function inspectAdventure(
	input: GameDef | AdventureDefinition,
	options: ContentOptions = {}
): ContentDiagnostic[] {
	const game = input as GameDef;
	let rules: GameRules | undefined;
	const diagnostics: ContentDiagnostic[] = [];
	const report = (
		path: string,
		message: string,
		severity: ContentDiagnostic['severity'] = 'error'
	) => diagnostics.push({ severity, path, message });
	function check(path: string, fn: () => void) {
		try {
			fn();
		} catch (error) {
			report(path, error instanceof Error ? error.message : String(error));
		}
	}
	function index(values: unknown, path: string) {
		const result = new Map<string, Record<string, unknown>>();
		check(path, () => {
			for (const [i, value] of array(values, path).entries())
				check(`${path}[${i}]`, () => {
					const entry = object(value, path);
					const id = string(entry.id, `${path}[${i}].id`);
					if (result.has(id)) report(`${path}[${i}].id`, `Duplicate ID '${id}'.`);
					else result.set(id, entry);
				});
		});
		return result;
	}
	try {
		object(game, 'game');
	} catch (error) {
		report('game', error instanceof Error ? error.message : String(error));
		return diagnostics;
	}
	check('rules', () => {
		rules = resolveRules(game);
	});
	const templates = Array.isArray(game.npcTemplates) ? game.npcTemplates : [];
	const instances = Array.isArray(game.npcInstances) ? game.npcInstances : [];
	check('npcTemplates', () => {
		array(game.npcTemplates, 'npcTemplates');
	});
	check('npcInstances', () => {
		array(game.npcInstances, 'npcInstances');
	});
	const locations = index(game.locations, 'locations'),
		items = index(game.items, 'items');
	const npcs = index([...templates, ...instances], 'npcs');
	const biomes = index(options.biomes ?? defaultBiomes, 'biomes');
	const pending = new Set<string>();
	check('unresolvedLocations', () => {
		for (const value of game.unresolvedLocations ?? []) {
			const id = string(value, 'unresolvedLocations');
			if (pending.has(id) || locations.has(id))
				throw new Error(`Unresolved location '${id}' is duplicated or already defined.`);
			pending.add(id);
		}
	});
	function reference(
		value: unknown,
		collection: Map<string, unknown>,
		path: string,
		allowPending = false
	) {
		const id = typeof value === 'string' ? value : object(value, path).id;
		string(id, path);
		if (!collection.has(id as string)) {
			if (allowPending && pending.has(id as string))
				report(path, `Unfinished location '${id}' is explicitly declared.`, 'warning');
			else report(path, `Unknown referenced ID '${id}'.`);
		}
	}
	function asset(value: unknown, path: string) {
		if (value === undefined) return;
		const url = string(value, path);
		if (/^https?:\/\//.test(url)) {
			new URL(url);
			return;
		}
		if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\'))
			throw new Error(`${path}: use a root-relative asset path or HTTP(S) URL.`);
		const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
		if (
			pathname.includes('\0') ||
			pathname.split('/').some((part) => part === '.' || part === '..')
		)
			throw new Error(`${path}: invalid asset path.`);
		if (options.assets && !options.assets.has(pathname))
			throw new Error(`${path}: missing local asset '${pathname}'.`);
	}
	function condition(value: Condition, path: string) {
		if (typeof value !== 'function' && value.condition === 'inventoryContains')
			reference(value.arg, items, `${path}.arg`);
	}
	function action(value: Action, path: string) {
		if (typeof value.action === 'function') return;
		if (value.action === 'locationChange') reference(value.arg, locations, `${path}.arg`, true);
		if (
			['inventoryAdd', 'inventoryRemove', 'itemPush', 'itemUse'].includes(value.action) &&
			value.arg !== undefined
		)
			reference(value.arg, items, `${path}.arg`);
		if (value.action === 'encounterStart' && typeof value.arg.npc === 'string')
			reference(value.arg.npc, npcs, `${path}.arg.npc`);
		if (
			(value.action === 'dialogStart' || value.action === 'victoryShow') &&
			value.arg.presentation?.image
		)
			asset(value.arg.presentation.image, `${path}.arg.presentation.image`);
		if (value.action === 'itemFind') reference(value.arg.item, items, `${path}.arg.item`);
		if (value.action === 'encounterRandomNpc' && value.arg.table !== undefined)
			table(value.arg.table, `${path}.arg.table`, npcs);
	}
	function actions(value: unknown, path: string) {
		check(path, () => walkActions(value, path, action, condition));
	}
	function table(value: unknown, path: string, collection: Map<string, unknown>) {
		check(path, () => {
			if (Array.isArray(value)) {
				value.forEach((id, i) => reference(id, collection, `${path}[${i}]`));
				return;
			}
			const table = object(value, path);
			const entries = array(table.options, `${path}.options`);
			if (table.formula !== undefined)
				validateDiceFormula(string(table.formula, `${path}.formula`), GAME_DICE_KEYS);
			for (const [i, value] of entries.entries()) {
				const option = object(value, `${path}.options[${i}]`);
				if (Array.isArray(option.trigger)) {
					if (option.trigger.length !== 2)
						throw new Error(`${path}: trigger range needs two integers.`);
					const low = integer(option.trigger[0], path, -1e12, 1e12),
						high = integer(option.trigger[1], path, -1e12, 1e12);
					if (low > high) throw new Error(`${path}: trigger range is reversed.`);
				} else integer(option.trigger, path, -1e12, 1e12);
				reference(option.value, collection, `${path}.options[${i}].value`);
				if (option.active !== undefined) {
					assertCondition(option.active, path);
					condition(option.active, `${path}.options[${i}].active`);
				}
			}
		});
	}
	function entity(entry: Record<string, unknown>, path: string) {
		check(path, () => {
			string(entry.name, `${path}.name`);
			asset(entry.image, `${path}.image`);
			if (typeof entry.icon === 'string' && entry.icon.startsWith('/'))
				asset(entry.icon, `${path}.icon`);
		});
		for (const key of ['enter', 'exit', 'effects'])
			if (entry[key] !== undefined) actions(entry[key], `${path}.${key}`);
		if (entry.coins !== undefined)
			check(`${path}.coins`, () => {
				if (typeof entry.coins === 'string') validateDiceFormula(entry.coins, GAME_DICE_KEYS);
				else number(entry.coins, path, 0);
			});
		if (entry.items !== undefined) table(entry.items, `${path}.items`, items);
	}
	check('game', () => {
		string(game.id, 'id');
		integer(game.contentVersion ?? 1, 'contentVersion', 1);
		reference(game.start, locations, 'start');
	});
	for (const [id, entry] of locations) {
		const path = `locations['${id}']`;
		entity(entry, path);
		check(path, () => {
			reference(entry.biome, biomes, `${path}.biome`);
			if (entry.parent !== undefined) reference(entry.parent, locations, `${path}.parent`);
		});
		if (entry.choices !== undefined)
			check(`${path}.choices`, () => {
				for (const [i, value] of array(entry.choices, path).entries()) {
					const choice = object(value, path);
					string(choice.label, path);
					if (choice.show !== undefined) {
						assertCondition(choice.show, path);
						condition(choice.show, `${path}.choices[${i}].show`);
					}
					actions(choice.actions, `${path}.choices[${i}].actions`);
				}
			});
		if (entry.shop !== undefined)
			check(`${path}.shop`, () => {
				for (const [i, value] of array(entry.shop, path).entries()) {
					const listing = object(value, path);
					reference(listing.item, items, `${path}.shop[${i}].item`);
					integer(listing.stock, `${path}.shop[${i}].stock`);
					integer(listing.cost, `${path}.shop[${i}].cost`);
					if (listing.willBuy !== undefined && typeof listing.willBuy !== 'boolean')
						number(listing.willBuy, path, 0);
				}
			});
		check(`${path}.parent`, () => {
			const seen = new Set<string>([id]);
			let parent = entry.parent;
			while (typeof parent === 'string' && locations.has(parent)) {
				if (seen.has(parent)) throw new Error(`Parent cycle through '${parent}'.`);
				seen.add(parent);
				parent = locations.get(parent)!.parent;
			}
		});
	}
	for (const [id, entry] of items) {
		const path = `items['${id}']`;
		entity(entry, path);
		check(path, () => {
			if (!['weapon', 'armor', 'consumable', 'trinket'].includes(String(entry.type)))
				throw new Error('Invalid item type.');
			if (
				entry.combatUse !== undefined &&
				!['turn', 'free', 'forbidden'].includes(String(entry.combatUse))
			)
				throw new Error('Invalid combat item-use policy.');
			if (entry.type === 'armor') number(entry.defence, `${path}.defence`, 0);
			if (entry.where !== undefined)
				for (const slot of Array.isArray(entry.where) ? entry.where : [entry.where])
					if (!['hand', 'head', 'torso', 'feet'].includes(String(slot)))
						throw new Error(`Invalid equipment slot '${slot}'.`);
			if (entry.damage !== undefined) {
				const damage = object(entry.damage, path);
				validateDiceFormula(string(damage.amt, path), GAME_DICE_KEYS);
				string(damage.type, path);
			}
		});
	}
	for (const [id, entry] of npcs) {
		const path = `npcs['${id}']`;
		entity(entry, path);
		check(path, () => {
			const maxHp = integer(entry.maxHp, `${path}.maxHp`, 1);
			integer(entry.exp, `${path}.exp`);
			if (entry.hp !== undefined) integer(entry.hp, `${path}.hp`, 0, maxHp);
		});
	}
	for (const [i, npc] of instances.entries())
		check(`npcInstances[${i}].hp`, () => {
			integer(npc.hp, `npcInstances[${i}].hp`, 0, npc.maxHp);
		});
	for (const [id, entry] of biomes) entity(entry, `biomes['${id}']`);
	if (rules?.death.item)
		check('rules.death.item', () => reference(rules!.death.item, items, 'rules.death.item'));
	if (rules && rules.death.onDeath !== undefined)
		actions(rules.death.onDeath, 'rules.death.onDeath');
	if (rules && rules.encounters.onFinish !== undefined)
		actions(rules.encounters.onFinish, 'rules.encounters.onFinish');
	check('baseChar', () => {
		const char = game.baseChar;
		string(char.name, 'baseChar.name');
		const hp = integer(char.maxHp, 'baseChar.maxHp', 1);
		if (char.hp !== undefined) integer(char.hp, 'baseChar.hp', 1, hp);
		for (const key of ['coin', 'str', 'dex', 'wil', 'xp'] as const)
			integer(char[key], `baseChar.${key}`);
		integer(char.level, 'baseChar.level', 1, rules?.progression.maxLevel);
		const slots = new Set<string>(),
			inventory = new Set<string>();
		for (const entry of array(char.equip, 'baseChar.equip')) {
			const pair = array(entry, 'baseChar.equip entry');
			if (pair.length !== 2) throw new Error('baseChar.equip: expected [item, slot].');
			const item = string(pair[0], 'baseChar.equip.item');
			const slot = string(pair[1], 'baseChar.equip.slot');
			reference(item, items, 'baseChar.equip');
			if (!['right', 'left', 'head', 'torso', 'feet'].includes(slot) || slots.has(slot))
				throw new Error(`Invalid or duplicate starting equipment slot '${slot}'.`);
			slots.add(slot);
		}
		for (const entry of array(char.inventory, 'baseChar.inventory')) {
			const pair = array(entry, 'baseChar.inventory entry');
			if (pair.length !== 2) throw new Error('baseChar.inventory: expected [item, quantity].');
			const item = string(pair[0], 'baseChar.inventory.item'),
				qty = pair[1];
			reference(item, items, 'baseChar.inventory');
			integer(qty, 'baseChar.inventory.quantity', 1);
			if (inventory.has(item)) throw new Error(`Duplicate inventory item '${item}'.`);
			inventory.add(item);
		}
		const flags = new Set<string>(),
			counters = new Set<string>();
		for (const value of array(char.flags ?? [], 'baseChar.flags')) {
			const flag = string(value, 'baseChar.flags');
			if (flags.has(flag)) throw new Error(`Duplicate starting flag '${flag}'.`);
			flags.add(flag);
		}
		for (const entry of array(char.counters ?? [], 'baseChar.counters')) {
			const pair = array(entry, 'baseChar.counters entry');
			if (pair.length !== 2) throw new Error('baseChar.counters: expected [id, value].');
			const id = string(pair[0], 'baseChar.counters.id');
			integer(pair[1], 'baseChar.counters.value', Number.MIN_SAFE_INTEGER);
			if (counters.has(id)) throw new Error(`Duplicate starting counter '${id}'.`);
			counters.add(id);
		}
	});
	return diagnostics;
}
export function validateAdventure(
	game: GameDef | AdventureDefinition,
	options: ContentOptions = {}
): ContentDiagnostic[] {
	const result = inspectAdventure(game, options);
	if (result.some((d) => d.severity === 'error')) throw new ContentValidationError(result);
	return result;
}
