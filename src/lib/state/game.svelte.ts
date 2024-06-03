import {
	type Item,
	type Choice,
	type GameDef,
	type ActionContext,
	type GameEvents,
	type CharDef
} from '$lib/types';
import { actions as availableActions, isActionValid, type Actions } from '$lib/actions';
import { createNewCharacter, type Character } from './character.svelte';
import { getLocationManager, type LocationManager } from './location.svelte';
import { Messanger } from './messanger.svelte';
import { getNpcManager, type NpcManager } from './npc.svelte';
import { Stack } from './stack.svelte';
import { isAsyncGenerator } from '$util/validate';
import { EventEmitter } from '$util/events';
import { evaluateDiceRoll } from '$util/dice';
import { DataManager } from '$data/index';
import { biomes } from '$data/biomes';
import { browser } from '$app/environment';

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
	data: DataManager;

	constructor(
		public id: string,
		character: Character,
		location: LocationManager,
		npc: NpcManager,
		data: DataManager
	) {
		this.character = character;
		this.location = location;
		this.npc = npc;
		this.data = data;
	}

	roll(formula: string) {
		const rollContext: Record<string, number> = {
			'@hp': this.character.hp,
			'@maxhp': this.character.maxHp,
			'@str': this.character.str,
			'@dex': this.character.dex,
			'@wil': this.character.wil,
			'@armor': this.character.gear.torso?.type === 'armor' ? this.character.gear.torso.defence : 0
		};
		if (this.npc.current) {
			rollContext['#maxhp'] = this.npc.current.maxHp;
			rollContext['#hp'] = this.npc.current.hp;
		}
		return evaluateDiceRoll(formula, rollContext);
	}

	toJSON() {
		return {
			character: this.character.toJSON(),
			location: this.location.current.id
		};
	}

	async save() {
		localStorage.setItem(`gameSave:${this.id}`, JSON.stringify(this));
	}
	async reset() {
		localStorage.removeItem(`gameSave:${this.id}`);
		window.location.reload();
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
		const data = new DataManager();
		data.items.add(game.items);
		data.locations.add(game.locations);
		data.npcs.addTemplate(game.npcTemplates);
		data.npcs.addInstance(game.npcInstances);
		data.biomes.add(biomes);

		if (browser) {
			const saved = localStorage.getItem(`gameSave:${game.id}`) || 'null';
			const savedChar = JSON.parse(saved) as { character: CharDef; location: string };
			if (savedChar) {
				game.baseChar = savedChar.character;
				game.start = savedChar.location;
			}
		}
		const char = await createNewCharacter(game.baseChar, data.items);
		const loc = await getLocationManager(data, game.start);
		const npc = await getNpcManager(data.npcs);
		state = new GameStateImpl(game.id, char, loc, npc, data);

		state.resolveActions([{ action: 'locationChange', arg: game.start }]);
	}
	return state;
}
