import type { ActionContext, NpcInstance } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { evaluateDiceRoll } from '$util/dice';

export async function diceRoll(
	state: GameState,
	{ formula, npc }: { formula: string; npc?: NpcInstance },
	ctx: ActionContext
) {
	const rollContext: Record<string, number> = {
		'@hp': state.character.hp,
		'@maxhp': state.character.maxHp,
		'@str': state.character.str,
		'@dex': state.character.dex,
		'@wil': state.character.wil,
		'@armor': state.character.gear.torso?.type === 'armor' ? state.character.gear.torso.defence : 0
	};
	if (npc) {
		rollContext['#maxhp'] = npc.maxHp;
		rollContext['#hp'] = npc.hp;
	}
	const value = evaluateDiceRoll(formula, rollContext);
	ctx.rollResult = value;
	console.log(`diceRoll in context`, ctx.rollResult);
}
