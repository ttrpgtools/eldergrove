import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export function ctxRollEquals(_: GameState, val: number, ctx?: ActionContext) {
	if (!ctx) return false;
	return ctx.rollResult === val;
}

export function ctxWasVictory(_: GameState, __: never, ctx?: ActionContext) {
	if (!ctx) return false;
	return ctx.encounterVictory === true;
}
