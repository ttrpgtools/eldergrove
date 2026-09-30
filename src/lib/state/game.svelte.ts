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
import { createLocationManager, type LocationManager } from './location.svelte';
import { Messanger } from './messanger.svelte';
import { createNpcManager, type NpcManager } from './npc.svelte';
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

// Adventure definitions contain trusted function hooks, so structuredClone cannot
// copy them. Copy plain data recursively while retaining those hooks by reference.
function copyDefinition<T>(value: T): T {
	if (Array.isArray(value)) return value.map(copyDefinition) as T;
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, copyDefinition(entry)])
		) as T;
	}
	return value;
}

/** Create an independent session without changing the adventure definition. */
export async function createGameState(game: GameDef): Promise<GameState> {
	const definition = copyDefinition(game);
	const data = new DataManager();
	data.items.add(definition.items);
	data.locations.add(definition.locations);
	data.npcs.addTemplate(definition.npcTemplates);
	data.npcs.addInstance(definition.npcInstances);
	data.biomes.add(copyDefinition(biomes));

	const saved = browser
		? (JSON.parse(localStorage.getItem(`gameSave:${game.id}`) || 'null') as {
				character: CharDef;
				location: string;
			} | null)
		: null;
	const char = await createNewCharacter(saved?.character ?? definition.baseChar, data.items);
	const loc = await createLocationManager(data, saved?.location ?? definition.start);
	const npc = createNpcManager(data.npcs);
	const state = new GameStateImpl(game.id, char, loc, npc, data);

	// Initializing a scene is not travel: do not replay its exit actions or replace
	// the previous location. Wait for entry hooks before the UI receives the state.
	state.choices.set(loc.current.choices ?? []);
	if (loc.current.enter) await state.resolveActions(loc.current.enter);
	return state;
}

// Keep unsaved progress when returning to an adventure in this browser session.
// Cache initialization promises as well, so route preloads cannot create duplicates.
// This cache is not UI state and intentionally does not trigger reactive updates.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const sessions = new Map<string, Promise<GameState>>();
export async function getGameState(game: GameDef): Promise<GameState> {
	if (!browser) return createGameState(game);
	const existing = sessions.get(game.id);
	if (existing) return existing;

	const pending = createGameState(game);
	sessions.set(game.id, pending);
	try {
		return await pending;
	} catch (error) {
		if (sessions.get(game.id) === pending) sessions.delete(game.id);
		throw error;
	}
}
