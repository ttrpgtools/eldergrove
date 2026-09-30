import type { DataManager } from '$data/index';
import type { NpcInstance } from '$lib/types';

class NpcManagerImpl {
	current: NpcInstance | undefined = $state();
	status: 'win' | 'run' | undefined = $state();
	#npcs: DataManager['npcs'];

	constructor(npcs: DataManager['npcs']) {
		this.#npcs = npcs;
	}

	async set(npc: string | NpcInstance) {
		if (typeof npc === 'string') {
			npc = await this.#npcs.get(npc);
		}
		this.status = undefined;
		this.current = npc;
	}

	clear() {
		this.current = undefined;
		this.status = undefined;
	}
}

export type NpcManager = NpcManagerImpl;

export function createNpcManager(npcs: DataManager['npcs']): NpcManager {
	return new NpcManagerImpl(npcs);
}
