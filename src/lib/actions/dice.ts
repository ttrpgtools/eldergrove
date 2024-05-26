import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { evaluateDiceRoll } from '$util/dice';

export async function diceRoll(state: GameState, formula: string, ctx: ActionContext) {
	const rollContext: Record<string, number> = {
		'@hp': state.character.hp,
		'@maxhp': state.character.maxHp,
		'@str': state.character.str,
		'@dex': state.character.dex,
		'@wil': state.character.wil,
		'@armor': state.character.gear.torso?.type === 'armor' ? state.character.gear.torso.defence : 0
	};
	if (state.npc.current) {
		rollContext['#maxhp'] = state.npc.current.maxHp;
		rollContext['#hp'] = state.npc.current.hp;
	}
	const value = evaluateDiceRoll(formula, rollContext);
	ctx.rollResult = value;
	console.log(`diceRoll in context`, ctx.rollResult);
}

export async function diceMinZero(_: GameState, _arg: never, ctx: ActionContext) {
	ctx.rollResult = Math.max(ctx.rollResult ?? 0, 0);
}
