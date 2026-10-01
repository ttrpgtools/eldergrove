import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { resolveNumber, rollResult } from '$lib/arguments';

export async function diceRoll(state: GameState, formula: string, ctx: ActionContext) {
	ctx.rollResult = state.roll(formula);
}

export async function diceMinZero(_: GameState, _arg: never, ctx: ActionContext) {
	ctx.rollResult = Math.max(resolveNumber(rollResult, ctx), 0);
}
