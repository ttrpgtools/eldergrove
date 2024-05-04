import { resolveActions } from '$lib/actions';
import type { Choice, GameDef } from '$lib/types';
import { createMachine } from '$util/fsm.svelte';
import { createNewCharacter, type Character } from './character.svelte';
import { getLocationManager, type LocationManager } from './location.svelte';
import { Messanger } from './messanger.svelte';
import { getNpcManager, type NpcManager } from './npc.svelte';

class GameStateImpl {
	character: Character = $state()!;
	location: LocationManager = $state()!;
	message = new Messanger();
	choices: Choice[] = $state([]);
	npc: NpcManager = $state()!;
	mode = createMachine('exploring', {
		exploring: {
			fight: 'fighting',
			shop: 'shopping'
		},
		fighting: {
			win: 'exploring'
		},
		shopping: {
			doneShopping: 'exploring'
		}
	});

	constructor(character: Character, location: LocationManager, npc: NpcManager) {
		this.character = character;
		this.location = location;
		this.npc = npc;
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
		const npc = await getNpcManager();
		state = new GameStateImpl(char, loc, npc);
		resolveActions([{ action: 'locationChange', arg: game.start }], state);
	}
	return state;
}
