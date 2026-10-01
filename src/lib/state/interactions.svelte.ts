import type { ActionContext, Choice, Item } from '$lib/types';
import type { GameState } from './game.svelte';

export type InteractionMode =
	'exploration' | 'combat' | 'shop' | 'conversation' | 'death' | 'victory';
export interface ScenePresentation {
	title: string;
	description?: string;
	image?: string;
}
export interface DialogRequest {
	presentation?: ScenePresentation;
	message?: string;
	choices: Choice[];
}
export interface InteractionHandle {
	readonly active: boolean;
	close(): void;
	closeChildren(): void;
	update(mode: InteractionMode, choices: Choice[]): void;
}
type Frame = { mode: InteractionMode; menu: Choice[]; scene?: Item };

/** Own transient menus and scenes together. Closing an old frame cannot remove a newer one. */
export class Interactions {
	#frames: Frame[] = $state.raw([]);
	constructor(private state: GameState) {}
	get mode(): InteractionMode {
		return this.#frames.at(-1)?.mode ?? 'exploration';
	}
	get canUseInventory() {
		return this.mode === 'exploration' || this.mode === 'combat';
	}
	open(
		mode: InteractionMode,
		choices: Choice[],
		scene?: Item,
		ctx: ActionContext = this.state.actionContext
	): InteractionHandle {
		const menu = this.state.pushChoices(choices, ctx);
		if (scene) this.state.item.push(scene);
		const frame: Frame = {
			mode,
			menu,
			scene: scene ? this.state.item.current : undefined
		};
		// Capture proxied scene identity used by the legacy read-only scene view.
		if (scene) frame.scene = this.state.item.current;
		this.#frames = [...this.#frames, frame];
		const isActive = () => this.#frames.includes(frame);
		const close = () => {
			if (!this.#frames.includes(frame)) return;
			this.state.choices.remove(frame.menu);
			if (frame.scene) this.state.item.remove(frame.scene);
			this.#frames = this.#frames.filter((value) => value !== frame);
		};
		return {
			get active() {
				return isActive();
			},
			close,
			closeChildren: () => {
				if (!this.#frames.includes(frame)) return;
				while (this.#frames.at(-1) !== frame) this.closeCurrent();
			},
			update: (mode, choices) => {
				if (!this.#frames.includes(frame)) return;
				this.state.choices.remove(frame.menu);
				frame.menu = this.state.pushChoices(choices, ctx);
				frame.mode = mode;
				this.#frames = [...this.#frames];
			}
		};
	}
	closeCurrent() {
		const frame = this.#frames.at(-1);
		if (!frame) return false;
		this.state.choices.remove(frame.menu);
		if (frame.scene) this.state.item.remove(frame.scene);
		this.#frames = this.#frames.slice(0, -1);
		return true;
	}
	clear() {
		while (this.closeCurrent()) {
			/* Remove only owned frames. */
		}
	}
	dialog(request: DialogRequest, mode: 'conversation' | 'victory' = 'conversation', item?: Item) {
		const scene: Item | undefined =
			item ??
			(request.presentation
				? {
						id: 'engine/presentation',
						name: request.presentation.title,
						desc: request.presentation.description,
						image: request.presentation.image,
						type: 'trinket'
					}
				: undefined);
		const choices = request.choices.map((choice) => ({
			...choice,
			actions: async (state: GameState) => {
				if (!handle.active) return;
				if (mode === 'conversation') handle.close();
				await state.resolveActions(choice.actions);
			}
		}));
		const handle = this.open(mode, choices, scene);
		if (request.message !== undefined) this.state.message.set(request.message);
		return handle;
	}
}
