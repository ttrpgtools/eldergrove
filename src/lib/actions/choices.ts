import type { Choice } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

export async function choicesPush(state: GameState, choices: Choice[]) {
	state.pushChoices(choices);
}

export async function choicesPop(state: GameState) {
	state.choices.pop();
}

export async function yesno(state: GameState, opts: { yes: Action[]; no: Action[] }) {
	const answer = (actions: Action[]) => async (state: GameState) => {
		state.choices.remove(frame);
		await state.resolveActions(actions);
	};
	const frame = state.pushChoices([
		{ label: 'Yes', actions: answer(opts.yes) },
		{ label: 'No', actions: answer(opts.no) }
	]);
}
