import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export async function diceRoll(state: GameState, formula: string, ctx: ActionContext) {
	ctx.rollResult = state.roll(formula);
	console.log(`diceRoll in context`, ctx.rollResult);
}

export async function diceMinZero(_: GameState, _arg: never, ctx: ActionContext) {
	ctx.rollResult = Math.max(ctx.rollResult ?? 0, 0);
}
