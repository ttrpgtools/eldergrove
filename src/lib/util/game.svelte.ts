import type { GameDef } from '$lib/types';
import { createNewCharacter, type Character } from './character.svelte';
import { getLocationManager, type LocationManager } from './location.svelte';

class GameStateImpl {
	character: Character = $state()!;
	location: LocationManager = $state()!;

	constructor(character: Character, location: LocationManager) {
		this.character = character;
		this.location = location;
	}
}

export type GameState = GameStateImpl;

/**
 * Singleton location manager.
 */
let state: GameState | undefined;
export async function getGameState(game: GameDef): Promise<GameState> {
	if (!state) {
		const char = await createNewCharacter(game.baseChar);
		const loc = await getLocationManager(game.start);
		state = new GameStateImpl(char, loc);
	}
	return state;
}
