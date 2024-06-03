import type { Choice, NpcInstance, RandomTable } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { npcLabel } from '$util/npc';
import { rollOnTable } from '$util/table';
import type { Actions } from '$lib/actions';
import { counterInc, counterReset } from '$lib/actions/counters';
import { attackFromCharacter, attackFromNpc } from '$lib/actions/attacks';
import { npcDead } from '$lib/conditions/npc';
import { npcLoot } from '$lib/actions/npc';
import { wait } from '$lib/actions/control';

function noEncounter(state: GameState) {
	state.message.set(`There doesn't appear to be much going on here.`);
	state.choices.push([
		{ label: `OK`, actions: [{ action: 'messageClear' }, { action: 'choicesPop' }] }
	]);
}

const attackAction =
	(
		npc: NpcInstance,
		victoryFn: (gs: GameState) => void | Promise<void>,
		deathMsg?: string | ((gs: GameState) => string | undefined)
	) =>
	async (s: GameState) => {
		const result = await attackFromCharacter(s);
		if (result) {
			s.message.set(`You did ${result} damage to ${npcLabel(npc, true, false)}.`);
		}
		if (npcDead(s)) {
			await victoryFn(s);
		} else {
			s.choices.push([]);
			await wait(s, 1500);
			const att = await attackFromNpc(s, npc);
			if (att === 0) {
				s.message.set(`${npcLabel(npc, true)} missed you!`);
			} else if (att == null) {
				// Handled by weapon effect
			} else {
				s.message.set(`${npcLabel(npc, true)} hit you for ${att} damage.`);
			}
			if (s.character.hp === 0) {
				const youDie = await s.data.items.get('yearlings/you-die');
				s.item.push(youDie);
				if (deathMsg) {
					if (typeof deathMsg === 'function') {
						deathMsg = deathMsg(s);
					}
					if (deathMsg) s.message.set(deathMsg);
				}
				s.choices.push([]);
			}
			s.choices.pop();
		}
	};

async function setNpc(
	npc: string | NpcInstance,
	state: GameState,
	choices: (x: NpcInstance) => Choice[]
) {
	if (state.npc.current && state.npc.current.exit) {
		await state.resolveActions(state.npc.current.exit);
	}
	if (typeof npc === 'string') {
		npc = await state.data.npcs.get(npc);
	}
	state.npc.set(npc);
	state.choices.push(choices(npc));
	if (npc.enter) {
		await state.resolveActions(npc.enter);
	}
}

export async function encounterRandomNpc(
	state: GameState,
	{ table, followBy }: { table?: string[] | RandomTable<string>; followBy?: Actions }
) {
	if (!table) {
		return noEncounter(state);
	}
	const results = rollOnTable(table);
	if (results.length === 0) return noEncounter(state);
	await setNpc(results[0], state, (npc) => [
		{
			label: 'Attack',
			actions: attackAction(npc, async (s) => {
				s.message.append(` You killed ${npcLabel(npc, true, false)}.`);
				await npcLoot(s);
				s.choices.push([
					{
						label: 'Leave',
						actions: async (s) => {
							s.choices.pop();
							await encounterFinish(s, 'win', followBy);
						}
					}
				]);
			})
		},
		//{ label: 'Use Item'},
		{ label: 'Run', actions: async (s) => await encounterFinish(s, 'run', followBy) }
	]);
}

export async function bossEncounter(
	state: GameState,
	boss: string,
	victoryFn: (x: GameState) => void | Promise<void>,
	deathMsg?: string | ((gs: GameState) => string | undefined)
) {
	await setNpc(boss, state, (npc) => [
		{
			label: 'Attack',
			actions: attackAction(npc, victoryFn, deathMsg)
		}
	]);
}

export async function encounterFinish(state: GameState, result: 'win' | 'run', next?: Actions) {
	if (state.npc.current) {
		// TODO: Is this generic or provided per location via actions?
		const streakKey = `${state.location.current.id}:wins`;
		if (result === 'win') {
			await counterInc(state, streakKey);
		} else {
			await counterReset(state, streakKey);
		}
		state.npc.status = result;
		state.choices.pop();
		if (state.npc.current.exit) {
			await state.resolveActions(state.npc.current.exit);
		}
		if (next) {
			await state.resolveActions(next);
		}
	}
	state.npc.clear();
}
