import { getNpcInstance } from '$data/npcs';
import type { NpcInstance } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { rollOnTable } from '$util/table';

function noEncounter(state: GameState) {
	state.message.set(`There doesn't appear to be much going on here.`);
	state.choices.set([{ label: `OK`, actions: [{ action: 'messageClear' }] }]);
}

async function* setNpc(npc: string | NpcInstance, state: GameState) {
	if (state.npc.current && state.npc.current.exit) {
		yield state.npc.current.exit;
	}
	if (typeof npc === 'string') {
		npc = await getNpcInstance(npc);
	}
	if (npc.enter) {
		yield npc.enter;
	}
	state.npc.set(npc);
	state.mode.fight();
}

export async function encounterRandomNpc(state: GameState) {
	const scene = state.location.current;
	if (!scene.encounters) {
		return noEncounter(state);
	}
	const results = rollOnTable(scene.encounters);
	if (results.length === 0) return noEncounter(state);
	return setNpc(results[0], state);
}

export async function encounterFinish(state: GameState) {
	return (async function* () {
		if (state.npc.current) {
			if (state.npc.current.exit) {
				yield state.npc.current.exit;
			}
		}
		state.npc.clear();
		state.mode.win();
	})();
}
