import { type Item, type Choice, type GameDef } from '$lib/types';
import { resolveActions } from '$lib/actions';
import { createMachine } from '$util/fsm.svelte';
import { createNewCharacter, type Character } from './character.svelte';
import { getLocationManager, type LocationManager } from './location.svelte';
import { Messanger } from './messanger.svelte';
import { getNpcManager, type NpcManager } from './npc.svelte';
import { Stack } from './stack.svelte';

class GameStateImpl {
	character: Character = $state()!;
	location: LocationManager = $state()!;
	message = new Messanger();
	choices = new Stack<Choice[]>();
	npc: NpcManager = $state()!;
	item = new Stack<Item>();
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
