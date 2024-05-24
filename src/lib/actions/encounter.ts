import { getNpcInstance } from '$data/npcs';
import type { NpcInstance, RandomTable } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { npcLabel } from '$util/npc';
import { rollOnTable } from '$util/table';
import type { Action } from '.';

function noEncounter(state: GameState) {
	state.message.set(`There doesn't appear to be much going on here.`);
	state.choices.push([
		{ label: `OK`, actions: [{ action: 'messageClear' }, { action: 'choicesPop' }] }
	]);
}

async function* setNpc(npc: string | NpcInstance, state: GameState, followBy?: Action[]) {
	followBy = followBy ?? [];
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
	state.choices.push([
		{
			label: 'Attack',
			actions: [
				{ action: 'attackFromCharacter' },
				{
					action: 'messageSet',
					arg: `You did [rollResult] damage to ${npcLabel(npc, true, false)}.`
				},
				{
					action: 'branch',
					arg: {
						on: { condition: 'npcDead' },
						isTrue: [
							{
								action: 'messageAppend',
								arg: ` You killed ${npcLabel(npc, true, false)}.`
							},
							{
								action: 'npcLoot'
							},
							{
								action: 'choicesPush',
								arg: [
									{
										label: 'Leave',
										actions: [
											{ action: 'choicesPop' },
											{ action: 'encounterFinish', arg: 'win' },
											...followBy
										]
									}
								]
							}
						],
						isFalse: [
							{
								action: 'choicesPush',
								arg: []
							},
							{
								action: 'wait',
								arg: 2000
							},
							{
								action: 'attackFromNpc',
								arg: npc
							},
							{
								valid: { condition: 'ctxRollEquals', arg: 0 },
								action: 'messageSet',
								arg: `${npcLabel(npc, true)} missed you!`
							},
							{
								valid: { condition: 'ctxRollEquals', arg: 0, not: true },
								action: 'messageSet',
								arg: `${npcLabel(npc, true)} hit you for [rollResult] damage.`
							},
							{
								valid: { condition: 'hpIs', arg: 0 },
								action: 'messageAppend',
								arg: ` You die.`
							},
							{
								valid: { condition: 'hpIs', arg: 0 },
								action: 'choicesPush',
								arg: [] // Game over for now
							},
							{ action: 'choicesPop' }
						]
					}
				}
			]
		},
		//{ label: 'Use Item'},
		{ label: 'Run', actions: [{ action: 'encounterFinish', arg: 'run' }, ...followBy] }
	]);
}

export async function encounterRandomNpc(
	state: GameState,
	{ table, followBy }: { table?: string[] | RandomTable<string>; followBy?: Action[] }
) {
	if (!table) {
		return noEncounter(state);
	}
	const results = rollOnTable(table);
	if (results.length === 0) return noEncounter(state);
	return setNpc(results[0], state, followBy);
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
		state.choices.pop();
		state.npc.clear();
	})();
}
