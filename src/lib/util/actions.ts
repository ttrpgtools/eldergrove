import { ActionName } from '$lib/const';
import { getItem } from '$lib/data/items';
import { getNpcInstance } from '$lib/data/npcs';
import type { ActionType, Encounter, RandomTable } from '$lib/types';
import { resolveList } from './async';
import { rollFormula } from './dice';
import type { GameState } from './game.svelte';

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

const noEncounter: Encounter = {
	msg: `There doesn't appear to be much going on here.`,
	actions: [{ action: ActionName.Clear, label: `OK` }]
};

async function makeFightEncounter(id: string): Promise<Encounter> {
	return {
		npc: await getNpcInstance(id),
		flow: 'fight'
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionFn = (state: GameState, arg?: any) => Promise<Encounter>;
const actions: Record<ActionType, ActionFn> = {
	async randomEncounter(state: GameState) {
		const scene = state.location.current;
		if (!scene.encounters) {
			return noEncounter;
		}
		const results = rollOnTable(scene.encounters);
		if (results.length === 0) return noEncounter;
		return await makeFightEncounter(results[0]);
	},
	async shop(state: GameState, msg?: string) {
		if (!state.location.current.shop) return noEncounter;
		const fullshop = await resolveList(state.location.current.shop, 'item', getItem);
		return {
			flow: `shop`,
			shop: fullshop,
			msg
		};
	},
	async navigate(_: GameState, location: string) {
		return {
			location
		};
	},
	async goBack(state: GameState) {
		if (!state.location.previous) return { msg: `I don't know from whence I came...` };
		return {
			location: state.location.previous
		};
	},
	async clear() {
		return {};
	}
};

export async function invokeAction(action: ActionType, state: GameState, arg?: unknown) {
	if (!(action in actions)) throw `Unknown action ${action}`;
	return await actions[action](state, arg);
}
