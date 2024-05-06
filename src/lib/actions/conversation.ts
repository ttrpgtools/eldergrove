import type { GameState } from '$state/game.svelte';

export async function messageClear(state: GameState) {
	state.message.clear();
}

export async function messageSet(state: GameState, msg: string) {
	state.message.set(msg);
}
