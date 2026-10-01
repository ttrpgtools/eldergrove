import {
	type Item,
	type Choice,
	type GameDef,
	type ActionContext,
	type GameEvents,
	type Gear
} from '$lib/types';
import { checkCondition } from '$lib/conditions';
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
import { parseCheckpoint, validateCheckpoint, SAVE_VERSION, type Checkpoint } from '$lib/saves';

function makeContext(): ActionContext {
	return {
		locations: new Set()
	};
}

export type CommandResult = 'completed' | 'busy' | 'unavailable' | 'cancelled' | 'failed';

class GameStateImpl {
	character: Character = $state()!;
	location: LocationManager = $state()!;
	message = new Messanger();
	choices = new Stack<Choice[]>();
	npc: NpcManager = $state()!;
	item = new Stack<Item>();
	events = new EventEmitter<GameEvents>();
	data: DataManager;
	saveNotice: string | undefined = $state();
	busy = $state(false);
	commandNotice: string | undefined = $state();
	#command: AbortController | undefined;
	#context: ActionContext | undefined;
	#choiceContexts = new WeakMap<Choice[], ActionContext>();
	#saveBlocked: boolean;
	#storedCheckpoint: string | null;
	#definition: GameDef;

	constructor(
		public id: string,
		character: Character,
		location: LocationManager,
		npc: NpcManager,
		data: DataManager,
		definition: GameDef,
		storedCheckpoint: string | null,
		saveBlocked: boolean
	) {
		this.character = character;
		this.location = location;
		this.npc = npc;
		this.data = data;
		this.#definition = definition;
		this.#storedCheckpoint = storedCheckpoint;
		this.#saveBlocked = saveBlocked;
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

	toJSON(): Checkpoint {
		return {
			version: SAVE_VERSION,
			adventureId: this.id,
			contentVersion: this.#definition.contentVersion ?? 1,
			character: this.character.toJSON(),
			location: this.location.current.id,
			previousLocation: this.location.previous?.id ?? null,
			world: {
				locations: this.data.locations.values.map((location) => ({
					id: location.id,
					desc: location.desc ?? null,
					...(location.shop ? { stock: location.shop.map((entry) => entry.stock) } : {})
				})),
				npcs: this.data.npcs.instances.map((npc) => ({ id: npc.id, hp: npc.hp }))
			}
		};
	}

	/** Save a stable checkpoint; failure leaves the previous checkpoint intact. */
	async save(): Promise<boolean> {
		if (this.#saveBlocked) {
			this.saveNotice ??=
				'Saving is paused to protect the existing checkpoint. Reset this adventure to discard it.';
			return false;
		}
		if (this.npc.current || this.item.current || this.character.hp === 0) {
			this.saveNotice = 'Finish the encounter or item prompt before saving a living character.';
			return false;
		}
		try {
			if (!browser) throw new Error('Browser storage is unavailable.');
			const storage = localStorage;
			const key = `gameSave:${this.id}`;
			if (storage.getItem(key) !== this.#storedCheckpoint) {
				this.#saveBlocked = true;
				this.saveNotice =
					'The checkpoint changed in another session. Reload to load it, or reset to discard it.';
				return false;
			}
			const checkpoint = validateCheckpoint(this.toJSON(), this.#definition);
			const raw = JSON.stringify(checkpoint);
			storage.setItem(key, raw);
			this.#storedCheckpoint = raw;
			this.saveNotice = undefined;
			return true;
		} catch {
			this.saveNotice =
				'The game could not save this checkpoint. Existing saved progress has been kept.';
			return false;
		}
	}
	async reset() {
		if (this.busy) return;
		try {
			if (!browser) throw new Error('Browser storage is unavailable.');
			localStorage.removeItem(`gameSave:${this.id}`);
			window.location.reload();
		} catch {
			this.saveNotice =
				'The checkpoint could not be removed. Try again when browser storage is available.';
		}
	}

	get actionContext(): ActionContext {
		return this.#context ?? makeContext();
	}

	/** Continuation menus retain the context that produced them. */
	pushChoices(choices: Choice[], ctx = this.actionContext): Choice[] {
		this.choices.push(choices);
		const frame = this.choices.current!;
		this.#choiceContexts.set(frame, ctx);
		return frame;
	}

	isChoiceAvailable(choice: Choice): boolean {
		const frame = this.choices.current;
		return (
			!!frame?.includes(choice) &&
			(!choice.show || !!checkCondition(choice.show, this, this.#choiceContexts.get(frame)))
		);
	}

	async choose(choice: Choice): Promise<CommandResult> {
		if (this.busy) return 'busy';
		// Validate within the dispatcher too, so condition errors use the same reporting path.
		let available = false;
		const result = await this.runCommand(
			async () => {
				available = this.isChoiceAvailable(choice);
				if (!available) return;
				this.message.clear();
				await this.resolveActions(choice.actions);
			},
			this.#choiceContexts.get(this.choices.current ?? []) ?? makeContext()
		);
		return result === 'completed' && !available ? 'unavailable' : result;
	}

	useItem(item: Item | undefined) {
		return this.runCommand([{ action: 'itemUse', arg: item }]);
	}

	equip(item: Item | undefined) {
		return this.runCommand(async () => {
			if (item && this.character.hp > 0 && this.character.getInventoryCount(item) > 0) {
				await this.character.autoEquip(item);
			}
		});
	}

	unequip(slot: keyof Gear) {
		return this.runCommand(async () => {
			if (this.character.hp > 0) await this.character.unequip(slot);
		});
	}

	/** Player input is single-flight. Never queue a stale click behind another command. */
	async runCommand(actions: Actions, ctx = makeContext()): Promise<CommandResult> {
		if (this.busy) return 'busy';
		this.busy = true;
		this.commandNotice = undefined;
		const controller = new AbortController();
		this.#command = controller;
		try {
			await this.resolveActions(actions, ctx);
			return 'completed';
		} catch (error) {
			if (controller.signal.aborted) {
				this.commandNotice = 'The action was interrupted. Changes already made have been kept.';
				return 'cancelled';
			}
			const reason = error instanceof Error ? error.message : String(error);
			this.commandNotice = `The action could not finish: ${reason} Changes already made have been kept.`;
			return 'failed';
		} finally {
			this.#command = undefined;
			this.busy = false;
		}
	}

	cancelCommand() {
		this.#command?.abort();
	}

	/** Trusted hooks may use this signal for their own cancellable asynchronous work. */
	get commandSignal() {
		return this.#command?.signal;
	}

	throwIfCommandCancelled() {
		this.#command?.signal.throwIfAborted();
	}

	/** Built-in delays stop promptly when the game view is replaced or unmounted. */
	async wait(ms: number) {
		this.throwIfCommandCancelled();
		const signal = this.#command?.signal;
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				signal?.removeEventListener('abort', abort);
				resolve();
			}, ms);
			function abort() {
				clearTimeout(timer);
				reject(signal?.reason);
			}
			signal?.addEventListener('abort', abort, { once: true });
		});
	}

	/** Internal interpreter: hooks must await it; player input uses runCommand/choose. */
	async resolveActions(actions: Actions, ctx = this.actionContext): Promise<void> {
		const previousContext = this.#context;
		this.#context = ctx;
		try {
			this.throwIfCommandCancelled();
			if (typeof actions === 'function') {
				await actions(this, ctx);
				this.throwIfCommandCancelled();
				return;
			}
			for (const step of actions) {
				this.throwIfCommandCancelled();
				if (typeof step.action !== 'function' && !(step.action in availableActions))
					throw new Error(`Unknown action ${step.action}`);
				if (!isActionValid(step, this, ctx)) continue;
				const res =
					typeof step.action === 'function'
						? await step.action(this, step.arg, ctx)
						: await availableActions[step.action](this, step.arg as never, ctx);
				this.throwIfCommandCancelled();
				if (res && isAsyncGenerator<Actions>(res)) {
					for await (const inner of res) {
						await this.resolveActions(inner, ctx);
					}
				}
			}
		} finally {
			this.#context = previousContext;
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
	// Share the session's proxies with its data collections and managers. Mutations
	// through a manager must also be visible when snapshotting the persistent world.
	const definition = $state(copyDefinition(game));
	const data = new DataManager();
	data.items.add(definition.items);
	data.locations.add(definition.locations);
	data.npcs.addTemplate(definition.npcTemplates);
	data.npcs.addInstance(definition.npcInstances);
	data.biomes.add(copyDefinition(biomes));

	let saved: Checkpoint | undefined;
	let storedCheckpoint: string | null = null;
	let loadNotice: string | undefined;
	if (browser) {
		try {
			storedCheckpoint = localStorage.getItem(`gameSave:${game.id}`);
			if (storedCheckpoint !== null) saved = parseCheckpoint(storedCheckpoint, game);
		} catch (error) {
			const reason = error instanceof Error ? error.message : 'Browser storage is unavailable.';
			loadNotice = `${reason} A new game is available; the existing checkpoint is protected until you reset this adventure.`;
		}
	}
	if (saved) {
		for (const entry of saved.world.locations) {
			const location = await data.locations.get(entry.id);
			location.desc = entry.desc ?? undefined;
			entry.stock?.forEach((stock, index) => {
				location.shop![index].stock = stock;
			});
		}
		for (const entry of saved.world.npcs) {
			(await data.npcs.get(entry.id)).hp = entry.hp;
		}
	}
	const char = await createNewCharacter(saved?.character ?? definition.baseChar, data.items);
	const loc = await createLocationManager(data, saved?.location ?? definition.start);
	if (saved?.previousLocation) loc.previous = await data.locations.get(saved.previousLocation);
	const npc = createNpcManager(data.npcs);
	const state = new GameStateImpl(
		game.id,
		char,
		loc,
		npc,
		data,
		game,
		storedCheckpoint,
		!!loadNotice
	);
	state.saveNotice = loadNotice;

	// Initializing a scene is not travel: do not replay its exit actions or replace
	// the previous location. Wait for entry hooks before the UI receives the state.
	state.choices.set(loc.current.choices ?? []);
	if (!saved && loc.current.enter) await state.resolveActions(loc.current.enter);
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
