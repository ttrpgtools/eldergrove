import { getNpcInstance } from '$data/npcs';
import type { NpcInstance } from '$lib/types';

class NpcManagerImpl {
	current: NpcInstance | undefined = $state();

	async set(npc: string | NpcInstance) {
		if (typeof npc === 'string') {
			npc = await getNpcInstance(npc);
		}
		this.current = npc;
	}

	clear() {
		this.current = undefined;
	}
}

export type NpcManager = NpcManagerImpl;

/**
 * Singleton location manager.
 */
let manager: NpcManager | undefined;
export async function getNpcManager(): Promise<NpcManager> {
	if (!manager) {
		manager = new NpcManagerImpl();
	}
	return manager;
}
