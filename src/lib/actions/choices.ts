import type { Choice } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

export async function choicesPush(state: GameState, choices: Choice[]) {
	state.choices.push(choices);
}

export async function choicesPop(state: GameState) {
	state.choices.pop();
}

export async function yesno(state: GameState, opts: { yes: Action[]; no: Action[] }) {
	state.choices.push([
		{ label: 'Yes', actions: opts.yes.concat({ action: 'choicesPop' }) },
		{ label: 'No', actions: opts.no.concat({ action: 'choicesPop' }) }
	]);
}
