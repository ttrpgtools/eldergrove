import type { Choice } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

export async function choicesPush(state: GameState, choices: Choice[]) {
	state.interactions.open('conversation', choices);
}

export async function choicesPop(state: GameState) {
	if (!state.interactions.closeCurrent()) state.choices.pop();
}

export async function yesno(state: GameState, opts: { yes: Action[]; no: Action[] }) {
	state.requestChoices([
		{ label: 'Yes', actions: opts.yes },
		{ label: 'No', actions: opts.no }
	]);
}
