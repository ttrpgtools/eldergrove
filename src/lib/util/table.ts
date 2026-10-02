import type { RandomTable, ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { checkCondition } from '$lib/conditions';
import { rollFormula, type RandomSource } from './dice';
import { array, integer, object, assertCondition } from '$lib/contracts';

export interface TableContext {
	state?: GameState;
	ctx?: ActionContext;
	random?: RandomSource;
}
/** Roll each table once, preserving order and duplicate drops. */
export function rollOnTables<T>(
	tables: readonly (RandomTable<T> | T[])[],
	options: TableContext = {}
): T[] {
	array(tables, 'random tables');
	if (tables.length > 5000) throw new Error('Too many random tables.');
	return tables.flatMap((table) => rollOnTable(table, options));
}
/** Conditions gate matches without renumbering ranges or rerolling inactive results. */
export function rollOnTable<T>(table: RandomTable<T> | T[], options: TableContext = {}): T[] {
	if (!Array.isArray(table)) object(table, 'random table');
	const list = Array.isArray(table)
		? table.map((value, i) => ({ trigger: i + 1, value }))
		: table.options;
	array(list, 'random table options');
	if (list.length === 0) return [];
	if (list.length > 5000) throw new Error('Random table has too many entries.');
	const matches = list.map((entry) => {
		object(entry, 'random table option');
		const [low, high] = Array.isArray(entry.trigger)
			? entry.trigger
			: [entry.trigger, entry.trigger];
		integer(low, 'random table trigger', -1e12, 1e12);
		integer(high, 'random table trigger', -1e12, 1e12);
		if (low > high || (Array.isArray(entry.trigger) && entry.trigger.length !== 2))
			throw new Error('Random table trigger range is invalid.');
		const active = 'active' in entry ? entry.active : undefined;
		if (active !== undefined) {
			assertCondition(active, 'random table active');
			if (!options.state) throw new Error('Random table active conditions require a game state.');
		}
		return {
			entry,
			low,
			high,
			active:
				active === undefined ||
				checkCondition(active, options.state!, options.ctx ?? options.state?.actionContext)
		};
	});
	const formula = Array.isArray(table) ? `d${list.length}` : (table.formula ?? `d${list.length}`);
	const rolled = options.state ? options.state.roll(formula) : rollFormula(formula, options.random);
	return matches
		.filter(({ low, high, active }) => active && low <= rolled && rolled <= high)
		.map(({ entry }) => entry.value);
}
