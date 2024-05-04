import type { GameState } from '$state/game.svelte';

export async function messageClear(state: GameState) {
	state.message.clear();
}

export async function messageSet(state: GameState, msg: string) {
	state.message.set(msg);
}

export async function yesno(_: GameState, opts: { yes: string; no: string; flag: string }) {
	return {
		actions: [
			{ action: 'setFlag', arg: opts.flag, label: 'Yes' },
			{ action: 'chat', arg: 'Curses!', label: 'No' }
		]
	};
}
