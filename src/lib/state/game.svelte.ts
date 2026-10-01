import { Interactions, type DialogRequest } from './interactions.svelte';
import {
	encounterStart,
	settleEncounter,
	abandonEncounter,
	type EncounterRequest
} from '$lib/games/encounter';
import { shopStart } from '$lib/actions/shop';
import { snapshotAdventure, type AdventureDefinition } from '$lib/definitions';
import { resolveRules, ruleAmount, type GameRules } from '$lib/rules';
import {
	type Item,
	type Choice,
	type GameDef,
	type ActionContext,
	type GameEvents,
	type Gear
} from '$lib/types';
import { checkCondition } from '$lib/conditions';
import { assertAction } from '$lib/contracts';
import { validateAdventure, type ContentDiagnostic } from '$lib/content';
import type { RandomSource } from '$lib/util/dice';
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
import { readSaveSlots, saveSlotKey, type SaveSlot } from '$lib/save-slots';
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
	readonly interactions = new Interactions(this);
	get scene() {
		return this.item.current ?? this.npc.current ?? this.location.current;
	}
	get availableChoices() {
		return (this.choices.current ?? []).filter((choice) => this.isChoiceAvailable(choice));
	}
	get mode() {
		return this.interactions.mode;
	}
	get canUseInventory() {
		return !this.saveDialog && this.character.hp > 0 && this.interactions.canUseInventory;
	}
	get canChangeEquipment() {
		return (
			!this.saveDialog && (this.canUseInventory || (this.character.hp > 0 && this.mode === 'shop'))
		);
	}
	requestDialog(request: DialogRequest) {
		if (this.mode === 'death') throw new Error('Cannot open a dialog after defeat.');
		return this.interactions.dialog(request);
	}
	requestChoices(choices: Choice[]) {
		return this.requestDialog({ choices });
	}
	requestEncounter(request: EncounterRequest) {
		return encounterStart(this, request);
	}
	requestTrade(message?: string) {
		return shopStart(this, message);
	}
	showVictory(request: DialogRequest) {
		if (this.character.hp === 0) throw new Error('A defeated character cannot enter victory.');
		this.resetInteractions();
		return this.interactions.dialog(
			{ ...request, choices: [...request.choices, ...this.endChoices()] },
			'victory'
		);
	}
	resetInteractions() {
		abandonEncounter(this);
		this.interactions.clear();
		this.item.clear();
		this.choices.set(this.location.current.choices ?? []);
	}

	/** @deprecated Internal compatibility stack; content uses requestChoices/requestDialog. */
	choices = new Stack<Choice[]>();
	npc: NpcManager = $state()!;
	/** @deprecated Internal compatibility stack; presentation uses scene. */
	item = new Stack<Item>();
	events = new EventEmitter<GameEvents>();
	data: DataManager;
	saveNotice: string | undefined = $state();
	activeSlot: number | null = $state(null);
	saveDialog:
		| { kind: 'load' | 'save' | 'new'; slots: SaveSlot[]; startup?: boolean; fee: number }
		| undefined = $state();
	#slotSnapshots = new Map<number, string | null>();
	busy = $state(false);
	commandNotice: string | undefined = $state();
	#command: AbortController | undefined;
	#context: ActionContext | undefined;
	#choiceContexts = new WeakMap<Choice[], ActionContext>();
	#saveBlocked: boolean;
	#storedCheckpoint: string | null;
	#definition: GameDef;
	readonly rules: GameRules;
	#dead = false;
	get definition(): AdventureDefinition {
		return this.#definition;
	}
	#random: RandomSource | undefined;
	contentDiagnostics: ContentDiagnostic[];

	constructor(
		public id: string,
		character: Character,
		location: LocationManager,
		npc: NpcManager,
		data: DataManager,
		definition: GameDef,
		storedCheckpoint: string | null,
		loadedSlot: number | null,
		saveBlocked: boolean,
		contentDiagnostics: ContentDiagnostic[],
		rules: GameRules,
		random?: RandomSource
	) {
		this.character = character;
		this.location = location;
		this.npc = npc;
		this.data = data;
		this.#definition = definition;
		this.#storedCheckpoint = storedCheckpoint;
		this.#saveBlocked = saveBlocked;
		this.contentDiagnostics = contentDiagnostics;
		this.#random = random;
		this.rules = rules;
		if (browser) {
			try {
				for (const slot of readSaveSlots(definition))
					this.#slotSnapshots.set(slot.number, slot.raw);
			} catch {
				/* Storage errors are reported when loading or saving. */
			}
		}
		if (loadedSlot !== null) this.#slotSnapshots.set(loadedSlot, storedCheckpoint);
	}

	roll(formula: string) {
		const rollContext: Record<string, number> = {
			'@hp': this.character.hp,
			'@maxhp': this.character.maxHp,
			'@str': this.character.str,
			'@dex': this.character.dex,
			'@wil': this.character.wil,
			'@armor': ruleAmount(this.rules.combat.armor(this), 'armor')
		};
		if (this.npc.current) {
			rollContext['#maxhp'] = this.npc.current.maxHp;
			rollContext['#hp'] = this.npc.current.hp;
		}
		return evaluateDiceRoll(formula, rollContext, this.#random);
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

	requestLoad(startup = false) {
		this.openSaveDialog('load', 0, startup);
	}
	requestSave(fee = 0) {
		if (this.mode !== 'exploration' || this.character.hp === 0) return;
		if (this.character.coin < fee) {
			this.message.set(`You need ${fee} coins to save here.`);
			return;
		}
		this.openSaveDialog('save', fee);
	}
	requestNewGame() {
		this.saveDialog = { kind: 'new', slots: [], fee: 0 };
	}
	private openSaveDialog(kind: 'load' | 'save', fee: number, startup = false) {
		try {
			if (!browser) throw new Error('Browser storage is unavailable.');
			this.saveDialog = { kind, slots: readSaveSlots(this.#definition), fee, startup };
			this.saveNotice = undefined;
		} catch {
			this.saveNotice = 'Saved games could not be read. Existing saves have been kept.';
		}
	}
	private endChoices(): Choice[] {
		return [
			{ label: 'Load a saved game', actions: () => this.requestLoad() },
			{ label: 'Start a new game', actions: () => this.requestNewGame() }
		];
	}

	/** Compare the selected slot with the displayed snapshot before writing it. */
	async save(slot = this.activeSlot ?? 1, expectedRaw?: string | null, fee = 0): Promise<boolean> {
		if (this.#saveBlocked && expectedRaw === undefined) {
			this.saveNotice ??=
				'This checkpoint is protected. Choose a slot at the inn to save your game.';
			return false;
		}
		if (
			this.mode !== 'exploration' ||
			this.npc.current ||
			this.item.current ||
			this.character.hp === 0
		) {
			this.saveNotice = 'Finish the encounter or item prompt before saving a living character.';
			return false;
		}
		const coins = this.character.coin;
		try {
			if (!browser) throw new Error('Browser storage is unavailable.');
			if (!Number.isSafeInteger(fee) || fee < 0 || coins < fee)
				throw new Error('Not enough coins to save.');
			const key = saveSlotKey(this.id, slot);
			const expected = expectedRaw === undefined ? this.#slotSnapshots.get(slot) : expectedRaw;
			if (expected === undefined || localStorage.getItem(key) !== expected) {
				this.saveNotice =
					'This slot changed in another session. Open the save menu again to review it.';
				return false;
			}
			this.character.coin -= fee;
			const checkpoint = validateCheckpoint(this.toJSON(), this.#definition);
			const raw = JSON.stringify({ ...checkpoint, savedAt: new Date().toISOString() });
			localStorage.setItem(key, raw);
			this.#slotSnapshots.set(slot, raw);
			this.#storedCheckpoint = raw;
			this.#saveBlocked = false;
			this.activeSlot = slot;
			this.saveNotice = undefined;
			this.saveDialog = undefined;
			this.message.set(
				`Game saved in slot ${slot}. A warm glow passes over you as your vitals are scanned.`
			);
			return true;
		} catch {
			this.character.coin = coins;
			this.saveNotice =
				'Your game could not be saved. Existing saves have been kept and you have not been charged.';
			return false;
		}
	}

	loadSlot(slot: number, expectedRaw?: string | null) {
		return this.runCommand(async () => {
			const raw = localStorage.getItem(saveSlotKey(this.id, slot));
			if (raw === null) throw new Error('This save slot is empty.');
			if (expectedRaw !== undefined && raw !== expectedRaw)
				throw new Error('This slot changed. Open the load menu again to review it.');
			const restored = await createGameState(this.#definition, {
				slot,
				initialize: false,
				random: this.#random
			});
			if (restored.saveNotice) throw new Error(restored.saveNotice);
			if (restored.#storedCheckpoint !== raw)
				throw new Error('This slot changed while loading. Open the load menu again.');
			this.replaceSession(restored);
		});
	}
	newGame() {
		return this.runCommand(async () => {
			const fresh = await createGameState(this.#definition, {
				slot: null,
				initialize: false,
				random: this.#random
			});
			this.replaceSession(fresh);
			if (this.location.current.enter) await this.resolveActions(this.location.current.enter);
		});
	}
	private replaceSession(next: GameState) {
		this.throwIfCommandCancelled();
		this.resetInteractions();
		this.character = next.character;
		this.location = next.location;
		this.npc = next.npc;
		this.data = next.data;
		this.#dead = false;
		this.#saveBlocked = next.#saveBlocked;
		this.#storedCheckpoint = next.#storedCheckpoint;
		this.#slotSnapshots = next.#slotSnapshots;
		this.activeSlot = next.activeSlot;
		this.saveDialog = undefined;
		this.saveNotice = next.saveNotice;
		this.message.clear();
		this.choices.set(this.location.current.choices ?? []);
		this.#choiceContexts = new WeakMap();
	}
	/** Starting over preserves every saved game. */
	async reset() {
		return this.newGame();
	}

	async die(reason?: string) {
		if (this.#dead) return;
		this.#dead = true;
		this.character.hp = 0;
		const ctx = this.actionContext;
		ctx.encounterVictory = false;
		try {
			if (this.rules.death.onDeath) await this.resolveActions(this.rules.death.onDeath, ctx);
		} finally {
			if (this.character.hp > 0) {
				this.#dead = false;
			} else {
				const item: Item = this.rules.death.item
					? await this.data.items.get(this.rules.death.item)
					: {
							id: 'engine/death',
							name: 'Defeat',
							type: 'trinket',
							desc: 'Your adventure has ended. You can return to your checkpoint or start again.'
						};
				abandonEncounter(this);
				this.interactions.clear();
				this.item.clear();
				this.message.set(reason ?? this.rules.death.message ?? 'You have fallen.');
				this.interactions.open('death', this.endChoices(), item, ctx);
				this.requestLoad();
			}
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
		if (this.saveDialog) return 'unavailable';
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
			if (item && this.canChangeEquipment && this.character.getInventoryCount(item) > 0) {
				await this.character.autoEquip(item);
			}
		});
	}

	unequip(slot: keyof Gear) {
		return this.runCommand(async () => {
			if (this.canChangeEquipment) await this.character.unequip(slot);
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
			await this.resolveActions(async () => {
				await settleEncounter(this);
				if (this.character.hp === 0 && this.mode !== 'death') await this.die();
			}, ctx);
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
			for (const [index, step] of actions.entries()) {
				assertAction(step, `actions[${index}]`);
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

/** Create an independent session without changing the adventure definition. */
export async function createGameState(
	game: GameDef | AdventureDefinition,
	options: { random?: RandomSource; slot?: number | null; initialize?: boolean } = {}
): Promise<GameState> {
	const definition = snapshotAdventure(game);
	const contentDiagnostics = validateAdventure(definition);
	const rules = resolveRules(definition);
	const data = new DataManager();
	data.items.add(definition.items);
	data.locations.add(definition.locations);
	data.npcs.addTemplate(definition.npcTemplates);
	data.npcs.addInstance(definition.npcInstances);
	data.biomes.add(biomes);

	let saved: Checkpoint | undefined;
	let storedCheckpoint: string | null = null;
	let loadNotice: string | undefined;
	if (browser && options.slot !== null) {
		try {
			storedCheckpoint = localStorage.getItem(saveSlotKey(definition.id, options.slot ?? 1));
			if (storedCheckpoint !== null) saved = parseCheckpoint(storedCheckpoint, definition);
		} catch (error) {
			const reason = error instanceof Error ? error.message : 'Browser storage is unavailable.';
			loadNotice = `${reason} A new game is available; the existing checkpoint is protected; choose another slot or start a new game.`;
		}
	}
	let char: Character;
	try {
		char = await createNewCharacter(saved?.character ?? definition.baseChar, data.items, rules);
	} catch (error) {
		if (!saved) throw error;
		const reason = error instanceof Error ? error.message : 'Checkpoint equipment is incompatible.';
		loadNotice = `${reason} A new game is available; the existing checkpoint is protected; choose another slot or start a new game.`;
		saved = undefined;
		char = await createNewCharacter(definition.baseChar, data.items, rules);
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
	const loc = await createLocationManager(data, saved?.location ?? definition.start);
	if (saved?.previousLocation) loc.previous = await data.locations.get(saved.previousLocation);
	const npc = createNpcManager(data.npcs);
	const state = new GameStateImpl(
		definition.id,
		char,
		loc,
		npc,
		data,
		definition,
		storedCheckpoint,
		options.slot === null ? null : (options.slot ?? 1),
		!!loadNotice,
		contentDiagnostics,
		rules,
		options.random
	);
	state.saveNotice = loadNotice;
	state.activeSlot = saved ? (options.slot ?? 1) : null;

	// Initializing a scene is not travel: do not replay its exit actions or replace
	// the previous location. Wait for entry hooks before the UI receives the state.
	state.choices.set(loc.current.choices ?? []);
	if (options.initialize !== false && !saved && loc.current.enter)
		await state.resolveActions(loc.current.enter);
	return state;
}

// Keep unsaved progress when returning to an adventure in this browser session.
// Cache initialization promises as well, so route preloads cannot create duplicates.
// This cache is not UI state and intentionally does not trigger reactive updates.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const sessions = new Map<string, Promise<GameState>>();
export async function getGameState(game: GameDef | AdventureDefinition): Promise<GameState> {
	if (!browser) return createGameState(game);
	const existing = sessions.get(game.id);
	if (existing) return existing;

	const pending = createGameState(game, { slot: null }).then((state) => {
		try {
			if (readSaveSlots(state.definition as GameDef).some((slot) => slot.raw !== null))
				state.requestLoad(true);
		} catch {
			state.saveNotice = 'Saved games could not be read. Existing saves have been kept.';
		}
		return state;
	});
	sessions.set(game.id, pending);
	try {
		return await pending;
	} catch (error) {
		if (sessions.get(game.id) === pending) sessions.delete(game.id);
		throw error;
	}
}
