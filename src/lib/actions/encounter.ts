import { getNpcInstance } from '$data/npcs';
import type { NpcInstance, RandomTable } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { rollOnTable } from '$util/table';
import type { Action } from '.';

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

export async function encounterRandomNpc(
	state: GameState,
	table: string[] | RandomTable<string> | undefined
) {
	if (!table) {
		return noEncounter(state);
	}
	const results = rollOnTable(table);
	if (results.length === 0) return noEncounter(state);
	return setNpc(results[0], state);
}

export async function encounterFinish(state: GameState, result: string) {
	return (async function* () {
		if (state.npc.current) {
			// TODO: Is this generic or provided per location via actions?
			const streakKey = `${state.location.current.id}:wins`;
			const streakAction: Action = {
				action: result === 'win' ? `counterInc` : `counterReset`,
				arg: streakKey
			};
			yield [streakAction];
			if (state.npc.current.exit) {
				yield state.npc.current.exit;
			}
		}
		state.npc.clear();
		state.mode.win();
	})();
}
