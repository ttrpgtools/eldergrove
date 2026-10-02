import type { Choice, Entity } from './types';
import type { GameState } from './state/game.svelte';
import { walkActions } from './contracts';

/** Inspect possible outcomes without running actions, conditions, hooks, or dice rolls. */
export function collectSceneImages(state: GameState, choices: readonly Choice[]): string[] {
	const images = new Set<string>();
	const locations = new Map(state.data.locations.values.map((location) => [location.id, location]));
	const npcs = new Map(
		[...state.definition.npcTemplates, ...state.definition.npcInstances].map((npc) => [npc.id, npc])
	);
	const items = new Map(state.definition.items.map((item) => [item.id, item]));
	const visited = new Set<string>();
	function image(src?: string) {
		if (src) images.add(src);
	}
	function entity(value?: Pick<Entity, 'image'>) {
		image(value?.image);
	}
	function location(id?: string) {
		if (!id || visited.has(id) || visited.size >= 16) return;
		visited.add(id);
		const target = locations.get(id);
		if (!target) return; // Explicitly unfinished destinations are allowed in content.
		entity(target);
		entity(state.data.biomes.values.find((biome) => biome.id === target.biome));
		if (target.enter) inspect(target.enter);
	}
	function hints(choices: readonly Choice[]) {
		for (const choice of choices) choice.preloadImages?.forEach(image);
	}
	function inspect(actions: unknown) {
		walkActions(actions, 'preload', (action) => {
			switch (action.action) {
				case 'locationChange':
					location(action.arg);
					break;
				case 'locationReturn':
					location(state.location.previous?.id);
					break;
				case 'encounterStart':
					entity(typeof action.arg.npc === 'string' ? npcs.get(action.arg.npc) : action.arg.npc);
					break;
				case 'encounterRandomNpc': {
					const table = action.arg.table;
					const ids = Array.isArray(table) ? table : table?.options.map((entry) => entry.value);
					ids?.forEach((id) => entity(npcs.get(id)));
					break;
				}
				case 'itemFind':
					entity(
						typeof action.arg.item === 'string' ? items.get(action.arg.item) : action.arg.item
					);
					break;
				case 'dialogStart':
				case 'victoryShow':
					image(action.arg.presentation?.image);
					hints(action.arg.choices);
					break;
				case 'choicesPush':
					hints(action.arg);
			}
		});
	}
	hints(choices);
	for (const choice of choices) inspect(choice.actions);
	images.delete(state.scene?.image ?? state.location.current.image ?? '');
	images.delete(state.location.biome.image ?? '');
	return [...images].slice(0, 16);
}

/** A small, low-priority queue; replacing choices drops work that has not started. */
export function createImagePreloader() {
	const loaded = new Set<string>();
	const active = new Set<string>();
	let queue: string[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	function pump() {
		while (active.size < 2 && queue.length) {
			const src = queue.shift()!;
			if (loaded.has(src) || active.has(src)) continue;
			const img = new Image();
			active.add(src);
			img.fetchPriority = 'low';
			img.decoding = 'async';
			const finish = (success: boolean) => {
				img.onload = img.onerror = null;
				active.delete(src);
				if (success) {
					loaded.add(src);
					if (loaded.size > 128) loaded.delete(loaded.values().next().value!);
				}
				pump();
			};
			img.onload = () => finish(true);
			img.onerror = () => finish(false);
			img.src = src;
		}
	}
	function clear() {
		clearTimeout(timer);
		queue = [];
	}
	return {
		clear,
		update(urls: readonly string[]) {
			clear();
			if (typeof Image === 'undefined') return;
			const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
				.connection;
			if (connection?.saveData) return;
			timer = setTimeout(() => {
				queue = [...new Set(urls)].slice(0, 16);
				pump();
			}, 150);
		}
	};
}
