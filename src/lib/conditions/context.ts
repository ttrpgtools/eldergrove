import type { ActionContext, ActionContextDataKey } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export function ctxEquals(
	_: GameState,
	[key, val]: [ActionContextDataKey, string | number],
	ctx?: ActionContext
) {
	if (!ctx) return false;
	console.log(`Checking ctx.data[${key}] = ${val}`);
	return ctx.data[key] === val;
}

export function ctxTrue(_: GameState, key: `is${string}`, ctx?: ActionContext) {
	if (!ctx) return false;
	console.log(`Checking ctx.data[${key}] = true`);
	return ctx.data[key];
}

export function ctxFalse(_: GameState, key: `is${string}`, ctx?: ActionContext) {
	if (!ctx) return false;
	console.log(`Checking ctx.data[${key}] = true`);
	return !ctx.data[key];
}
