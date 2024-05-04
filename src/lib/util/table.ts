import type { RandomTable } from '$lib/types';
import { rollFormula } from './dice';

export function rollOnTable<T>(table: RandomTable<T> | T[]) {
	const [count, formula, list] = Array.isArray(table)
		? [table.length, `d${table.length}`, table.map((x, i) => ({ trigger: i + 1, value: x }))]
		: [table.options.length, table.formula ?? `d${table.options.length}`, table.options];
	if (count === 0) return [];
	const rolled = rollFormula(formula);
	const chosen = list.reduce((p, c) => {
		const trigger = c.trigger;
		const range = Array.isArray(trigger);
		if ((range && trigger[0] <= rolled && rolled <= trigger[1]) || (!range && trigger === rolled)) {
			p.push(c.value);
		}
		return p;
	}, [] as T[]);
	return chosen;
}
