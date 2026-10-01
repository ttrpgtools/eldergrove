import { RuntimeNpc } from './world.svelte';
import { immutableSnapshot } from '$lib/definitions';
import type { DataManager } from '$data/index';
import type { NpcInstance } from '$lib/types';

class NpcManagerImpl {
	current: RuntimeNpc | undefined = $state();
	status: 'win' | 'run' | undefined = $state();
	#npcs: DataManager['npcs'];
	#revision = 0;

	get revision() {
		return this.#revision;
	}

	constructor(npcs: DataManager['npcs']) {
		this.#npcs = npcs;
	}

	async set(npc: string | NpcInstance) {
		if (typeof npc === 'string') {
			npc = await this.#npcs.get(npc);
		}
		this.status = undefined;
		this.current =
			npc instanceof RuntimeNpc ? npc : new RuntimeNpc(immutableSnapshot(npc) as NpcInstance);
		this.#revision++;
	}

	clear() {
		this.current = undefined;
		this.status = undefined;
		this.#revision++;
	}
}

export type NpcManager = NpcManagerImpl;

export function createNpcManager(npcs: DataManager['npcs']): NpcManager {
	return new NpcManagerImpl(npcs);
}
