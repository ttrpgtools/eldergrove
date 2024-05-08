import { type Item, type Choice, type GameDef, type ActionContext } from '$lib/types';
import { actions, isActionValid, type Action } from '$lib/actions';
import { createMachine } from '$util/fsm.svelte';
import { createNewCharacter, type Character } from './character.svelte';
import { getLocationManager, type LocationManager } from './location.svelte';
import { Messanger } from './messanger.svelte';
import { getNpcManager, type NpcManager } from './npc.svelte';
import { Stack } from './stack.svelte';
import { isAsyncGenerator } from '$util/validate';

function makeContext(): ActionContext {
	return {
		locations: new Set(),
		data: {}
	};
}

class GameStateImpl {
	character: Character = $state()!;
	location: LocationManager = $state()!;
	message = new Messanger();
	choices = new Stack<Choice[]>();
	npc: NpcManager = $state()!;
	item = new Stack<Item>();
	mode = createMachine('exploring', {
		exploring: {
			fight: 'fighting'
		},
		fighting: {
			win: 'exploring'
		}
	});

	constructor(character: Character, location: LocationManager, npc: NpcManager) {
		this.character = character;
		this.location = location;
		this.npc = npc;
	}

	async resolveActions(list: Action[], ctx?: ActionContext) {
		console.log(`resolving Actions`, list);
		ctx = ctx ?? makeContext();
		for await (const act of list) {
			if (!(act.action in actions)) throw `Unknown action ${act.action}`;
			if (isActionValid(act, this, ctx)) {
				console.log(`starting processing of action`, act);
				const res = await actions[act.action](this, act.arg as never, ctx);
				console.log(`results are in`, res, res?.toString());
				if (res && isAsyncGenerator(res)) {
					console.log(`looping over the inner generator`);
					for await (const inner of res) {
						await this.resolveActions(inner, ctx);
					}
				}
			}
		}
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
		state.resolveActions([{ action: 'locationChange', arg: game.start }]);
	}
	return state;
}
