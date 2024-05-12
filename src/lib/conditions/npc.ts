import type { GameState } from '$state/game.svelte';

export function npcDead(state: GameState) {
	return state.npc.current && state.npc.current.hp === 0;
}

export function npcNotDead(state: GameState) {
	return !state.npc.current || state.npc.current.hp !== 0;
}
