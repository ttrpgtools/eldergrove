import type { Action, ActionName, Actions } from './actions';
import type { Condition, ConditionName } from './conditions';
import { GAME_DICE_KEYS, validateDiceFormula } from './util/dice';

export function object(value: unknown, path: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new Error(`${path}: expected an object.`);
	return value as Record<string, unknown>;
}
export function string(value: unknown, path: string, empty = false): string {
	if (typeof value !== 'string' || (!empty && !value.trim()))
		throw new Error(`${path}: expected ${empty ? 'a string' : 'a nonempty string'}.`);
	return value;
}
export function number(value: unknown, path: string, min = -1e12, max = 1e12): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
		throw new Error(`${path}: expected a finite number from ${min} to ${max}.`);
	return value;
}
export function integer(
	value: unknown,
	path: string,
	min = 0,
	max = Number.MAX_SAFE_INTEGER
): number {
	const result = number(value, path, min, max);
	if (!Number.isSafeInteger(result)) throw new Error(`${path}: expected an integer.`);
	return result;
}
export function array(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${path}: expected an array.`);
	return value;
}
function noArgument(value: unknown, path: string) {
	if (value !== undefined) throw new Error(`${path}: this command takes no argument.`);
}
function amount(value: unknown, path: string) {
	if (typeof value === 'number') {
		number(value, path);
		return;
	}
	if (object(value, path).from !== 'rollResult')
		throw new Error(`${path}: expected a number or { from: 'rollResult' }.`);
}
function damage(value: unknown, path: string) {
	if (value && typeof value === 'object' && 'amount' in value) {
		const packet = object(value, path);
		amount(packet.amount, `${path}.amount`);
		if (packet.type !== undefined) string(packet.type, `${path}.type`);
		if (packet.source !== undefined && packet.source !== 'attack' && packet.source !== 'effect')
			throw new Error(`${path}: invalid damage source.`);
	} else amount(value, path);
}
function item(value: unknown, path: string) {
	if (typeof value === 'string') {
		string(value, path);
		return;
	}
	const record = object(value, path);
	string(record.id, `${path}.id`);
	if (!['weapon', 'armor', 'consumable', 'trinket'].includes(String(record.type)))
		throw new Error(`${path}: invalid item type.`);
}
function itemObject(value: unknown, path: string) {
	object(value, path);
	item(value, path);
}
function actionsShape(value: unknown, path: string) {
	if (typeof value !== 'function') array(value, path);
}
const text = (value: unknown, path: string) => {
	string(value, path);
};
const message = (value: unknown, path: string) => {
	string(value, path, true);
};
const numeric = (value: unknown, path: string) => {
	number(value, path);
};

const actionArguments: Record<ActionName, (value: unknown, path: string) => void> = {
	wait: (value, path) => {
		integer(value, path, 0, 60000);
	},
	branch: (value, path) => {
		const arg = object(value, path);
		assertCondition(arg.on, `${path}.on`);
		array(arg.isTrue, `${path}.isTrue`);
		if (arg.isFalse !== undefined) array(arg.isFalse, `${path}.isFalse`);
	},
	flagSet: text,
	flagUnset: text,
	counterInc: text,
	counterDec: text,
	counterReset: text,
	hpDamage: damage,
	hpHeal: amount,
	npcDamage: damage,
	npcHeal: amount,
	coinsAdd: amount,
	coinsRemove: amount,
	diceRoll: (value, path) => {
		validateDiceFormula(string(value, path), GAME_DICE_KEYS);
	},
	diceMinZero: noArgument,
	choicesPop: noArgument,
	itemPop: noArgument,
	locationReturn: noArgument,
	messageClear: noArgument,
	npcLoot: noArgument,
	shopFinish: noArgument,
	choicesPush: (value, path) => {
		array(value, path);
	},
	itemPush: itemObject,
	inventoryAdd: item,
	inventoryRemove: item,
	itemUse: (value, path) => {
		if (value !== undefined) itemObject(value, path);
	},
	itemFind: (value, path) => {
		const arg = object(value, path);
		item(arg.item, `${path}.item`);
		array(arg.takeActions, `${path}.takeActions`);
	},
	locationChange: text,
	locationDesc: message,
	messageSet: message,
	messageAppend: message,
	yesno: (value, path) => {
		const arg = object(value, path);
		array(arg.yes, `${path}.yes`);
		array(arg.no, `${path}.no`);
	},
	shopStart: (value, path) => {
		if (value !== undefined) message(value, path);
	},
	encounterRandomNpc: (value, path) => {
		const arg = object(value, path);
		if (arg.table !== undefined && !Array.isArray(arg.table)) {
			array(object(arg.table, `${path}.table`).options, `${path}.table.options`);
		}
		if (arg.followBy !== undefined) actionsShape(arg.followBy, `${path}.followBy`);
	}
};
const conditionArguments: Record<ConditionName, (value: unknown, path: string) => void> = {
	flagIsSet: text,
	flagIsNotSet: text,
	inventoryContains: item,
	coinsAtLeast: numeric,
	coinsLessThan: numeric,
	xpMoreThan: numeric,
	hpIs: numeric,
	ctxRollEquals: numeric,
	levelAtLeast: (value, path) => {
		integer(value, path, 1);
	},
	hpFull: noArgument,
	npcDead: noArgument,
	npcNotDead: noArgument,
	ctxWasVictory: noArgument,
	counterIsEqual: (value, path) => {
		const pair = array(value, path);
		if (pair.length !== 2) throw new Error(`${path}: expected [counter, value].`);
		string(pair[0], path);
		number(pair[1], path);
	}
};
export function assertCondition(value: unknown, path = 'condition'): asserts value is Condition {
	if (typeof value === 'function') return;
	const condition = object(value, path);
	const name = string(condition.condition, `${path}.condition`);
	if (!Object.hasOwn(conditionArguments, name))
		throw new Error(`${path}: unknown condition '${name}'.`);
	if (condition.not !== undefined && typeof condition.not !== 'boolean')
		throw new Error(`${path}.not: expected a boolean.`);
	conditionArguments[name as ConditionName](condition.arg, `${path}.${name}.arg`);
}
export function assertAction(value: unknown, path = 'action'): asserts value is Action {
	const action = object(value, path);
	if (typeof action.action === 'function') noArgument(action.arg, `${path}.arg`);
	else {
		const name = string(action.action, `${path}.action`);
		if (!Object.hasOwn(actionArguments, name))
			throw new Error(`${path}: unknown action '${name}'.`);
		actionArguments[name as ActionName](action.arg, `${path}.${name}.arg`);
	}
	if (action.valid !== undefined) assertCondition(action.valid, `${path}.valid`);
}

/** Walk declarative content without executing trusted hooks. Reject cycles and excessive nesting. */
export function walkActions(
	value: unknown,
	path: string,
	visit: (action: Action, path: string) => void = () => {},
	visitCondition: (condition: Condition, path: string) => void = () => {}
): asserts value is Actions {
	const ancestors = new Set<object>();
	let count = 0;
	function condition(value: unknown, path: string) {
		assertCondition(value, path);
		visitCondition(value, path);
	}
	function choices(value: unknown, path: string, depth: number) {
		for (const [index, entry] of array(value, path).entries()) {
			const choice = object(entry, `${path}[${index}]`);
			string(choice.label, `${path}[${index}].label`);
			if (choice.show !== undefined) condition(choice.show, `${path}[${index}].show`);
			walk(choice.actions, `${path}[${index}].actions`, depth);
		}
	}
	function walk(value: unknown, path: string, depth: number) {
		actionsShape(value, path);
		if (typeof value === 'function') return;
		if (depth > 32 || ancestors.has(value as object))
			throw new Error(`${path}: cyclic or excessively nested actions.`);
		ancestors.add(value as object);
		for (const [index, entry] of (value as unknown[]).entries()) {
			if (++count > 5000) throw new Error(`${path}: too many actions.`);
			const label = `${path}[${index}]`;
			assertAction(entry, label);
			visit(entry, label);
			if (entry.valid) condition(entry.valid, `${label}.valid`);
			if (typeof entry.action === 'function') continue;
			if (entry.action === 'branch') {
				condition(entry.arg.on, `${label}.arg.on`);
				walk(entry.arg.isTrue, `${label}.arg.isTrue`, depth + 1);
				if (entry.arg.isFalse) walk(entry.arg.isFalse, `${label}.arg.isFalse`, depth + 1);
			} else if (entry.action === 'yesno') {
				walk(entry.arg.yes, `${label}.arg.yes`, depth + 1);
				walk(entry.arg.no, `${label}.arg.no`, depth + 1);
			} else if (entry.action === 'choicesPush') choices(entry.arg, `${label}.arg`, depth + 1);
			else if (entry.action === 'itemFind')
				walk(entry.arg.takeActions, `${label}.arg.takeActions`, depth + 1);
			else if (entry.action === 'encounterRandomNpc' && entry.arg.followBy !== undefined)
				walk(entry.arg.followBy, `${label}.arg.followBy`, depth + 1);
		}
		ancestors.delete(value as object);
	}
	walk(value, path, 0);
}
