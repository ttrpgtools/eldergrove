import {
	type Item,
	type Choice,
	type GameDef,
	type ActionContext,
	type GameEvents
} from '$lib/types';
import { actions as availableActions, isActionValid, type Actions } from '$lib/actions';
import { createNewCharacter, type Character } from './character.svelte';
import { getLocationManager, type LocationManager } from './location.svelte';
import { Messanger } from './messanger.svelte';
import { getNpcManager, type NpcManager } from './npc.svelte';
import { Stack } from './stack.svelte';
import { isAsyncGenerator } from '$util/validate';
import { EventEmitter } from '$util/events';

function makeContext(): ActionContext {
	return {
		locations: new Set()
	};
}

class GameStateImpl {
	character: Character = $state()!;
	location: LocationManager = $state()!;
	message = new Messanger();
	choices = new Stack<Choice[]>();
	npc: NpcManager = $state()!;
	item = new Stack<Item>();
	events = new EventEmitter<GameEvents>();

	constructor(character: Character, location: LocationManager, npc: NpcManager) {
		this.character = character;
		this.location = location;
		this.npc = npc;
	}

	async resolveActions(actions: Actions, ctx?: ActionContext) {
		if (typeof actions === 'function') {
			return await actions(this);
		}
		console.log(`resolving Actions array`, actions);
		ctx = ctx ?? makeContext();
		for await (const step of actions) {
			if (typeof step.action !== 'function' && !(step.action in availableActions))
				throw `Unknown action ${step.action}`;
			if (isActionValid(step, this, ctx)) {
				console.log(`starting processing of action step`, step);
				const res =
					typeof step.action === 'function'
						? await step.action(this, step.arg, ctx)
						: await availableActions[step.action](this, step.arg as never, ctx);
				console.log(`results are in`, res, res?.toString());
				if (res && isAsyncGenerator<Actions>(res)) {
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
