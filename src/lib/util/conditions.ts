import type { GameState } from './game.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConditionPredicate = (state: GameState, arg?: any) => boolean;
const conditions: Record<string, ConditionPredicate> = {
	xpMoreThan(state: GameState, amt: number) {
		console.log(`Checking ${state.character.xp} xpMoreThan ${amt}`);
		return state.character.xp > amt;
	}
};

export function checkCondition(condition: string, state: GameState, arg?: unknown) {
	if (!(condition in conditions)) throw `Unknown condition ${condition}`;
	return conditions[condition](state, arg);
}
