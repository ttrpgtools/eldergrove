import type { ActionContext, NpcInstance, RandomTable } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { InteractionHandle } from '$state/interactions.svelte';
import { npcLabel } from '$util/npc';
import { rollOnTable } from '$util/table';
import type { Actions } from '$lib/actions';
import { counterInc, counterReset } from '$lib/actions/counters';
import { attackFromCharacter, attackFromNpc } from '$lib/actions/attacks';
import { npcLoot } from '$lib/actions/npc';

export interface EncounterRequest {
	npc: string | NpcInstance;
	onVictory?: Actions;
	onFinish?: Actions;
	deathMessage?: string | ((state: GameState) => string | undefined);
	flee?: boolean;
}
type Encounter = {
	revision: number;
	handle: InteractionHandle;
	finishing: boolean;
	request: EncounterRequest;
	pending?: ActionContext;
};
const encounters = new WeakMap<GameState, Encounter>();
function current(state: GameState, encounter: Encounter) {
	return encounters.get(state) === encounter && state.npc.revision === encounter.revision;
}

export function abandonEncounter(state: GameState) {
	const encounter = encounters.get(state);
	encounter?.handle.close();
	encounters.delete(state);
	state.npc.clear();
}

export async function encounterStart(state: GameState, request: EncounterRequest) {
	if (state.character.hp === 0) return;
	const npc =
		typeof request.npc === 'string' ? await state.data.npcs.get(request.npc) : request.npc;
	const previous = state.npc.current;
	const old = encounters.get(state);
	if (previous?.exit && !old?.finishing) {
		if (old) old.finishing = true;
		try {
			await state.resolveActions(previous.exit);
		} catch (error) {
			if (old && current(state, old)) old.finishing = false;
			throw error;
		}
	}
	state.throwIfCommandCancelled();
	state.interactions.clear();
	state.item.clear();
	await state.npc.set(npc);
	const encounter: Encounter = {
		revision: state.npc.revision,
		handle: undefined!,
		finishing: false,
		request
	};
	encounter.handle = state.interactions.open('combat', [
		{
			label: 'Attack',
			actions: async (state) => {
				if (!current(state, encounter) || state.npc.status === 'win') return;
				await encounterTurn(state, async (state) => {
					const damage = await attackFromCharacter(state);
					if (damage && current(state, encounter))
						state.message.set(`You did ${damage} damage to ${npcLabel(npc, true, false)}.`);
				});
			}
		},
		...(request.flee === false
			? []
			: [
					{
						label: 'Run',
						actions: async (state: GameState) => {
							if (current(state, encounter) && state.npc.status !== 'win')
								await encounterFinish(state, 'run');
						}
					}
				])
	]);
	encounters.set(state, encounter);
	if (npc.enter) await state.resolveActions(npc.enter);
	// An entry hook can cause immediate defeat or victory.
	await settleEncounter(state, false);
}

/** Resolve one player turn, including item effects. Prompts defer retaliation until answered. */
export async function encounterTurn(state: GameState, effects: Actions, consumesTurn = true) {
	const encounter = encounters.get(state);
	if (!encounter || !current(state, encounter) || state.npc.status === 'win') {
		await state.resolveActions(effects);
		if (state.character.hp === 0) await state.die();
		return;
	}
	let completed = false;
	try {
		await state.resolveActions(effects);
		completed = true;
	} finally {
		if (current(state, encounter)) {
			if (completed && consumesTurn) encounter.pending = state.actionContext;
			await settleEncounter(state, completed);
		}
	}
}

export async function settleEncounter(state: GameState, retaliate = true) {
	const encounter = encounters.get(state);
	if (!encounter || !current(state, encounter) || encounter.finishing) return;
	const npc = state.npc.current!;
	const ctx = encounter.pending ?? state.actionContext;
	if (state.character.hp === 0) {
		encounter.pending = undefined;
		await state.die(
			typeof encounter.request.deathMessage === 'function'
				? encounter.request.deathMessage(state)
				: encounter.request.deathMessage
		);
		return;
	}
	if (npc.hp === 0 && state.npc.status !== 'win') {
		encounter.pending = undefined;
		state.npc.status = 'win';
		ctx.encounterVictory = true;
		// Change mode before rewards/hooks to prohibit further item use and duplicate rewards.
		encounter.handle.closeChildren();
		encounter.handle.update('victory', [
			{
				label: 'Leave',
				actions: async (state) => {
					if (current(state, encounter)) await encounterFinish(state, 'win');
				}
			}
		]);
		if (encounter.request.onVictory) await state.resolveActions(encounter.request.onVictory, ctx);
		else {
			const message = `You killed ${npcLabel(npc, true, false)}.`;
			if (state.message.text) state.message.append(message);
			else state.message.set(message);
			await npcLoot(state);
		}
		return;
	}
	if (
		!retaliate ||
		!encounter.pending ||
		state.interactions.mode !== 'combat' ||
		state.npc.status === 'win'
	)
		return;
	encounter.pending = undefined;
	await state.wait(state.rules.combat.retaliationDelay);
	if (!current(state, encounter) || state.character.hp === 0) return;
	const damage = await attackFromNpc(state, npc);
	state.throwIfCommandCancelled();
	if (!current(state, encounter)) return;
	if (damage === 0) state.message.set(`${npcLabel(npc, true)} missed you!`);
	else if (damage != null)
		state.message.set(`${npcLabel(npc, true)} hit you for ${damage} damage.`);
	// NPC effects can themselves cause victory or defeat, but never recurse into another retaliation.
	await settleEncounter(state, false);
}

export async function encounterRandomNpc(
	state: GameState,
	{ table, followBy }: { table?: string[] | RandomTable<string>; followBy?: Actions }
) {
	const results = table ? rollOnTable(table, { state, ctx: state.actionContext }) : [];
	if (!results.length) {
		state.requestDialog({
			message: `There doesn't appear to be much going on here.`,
			choices: [{ label: 'OK', actions: [{ action: 'messageClear' }] }]
		});
		return;
	}
	await encounterStart(state, { npc: results[0], onFinish: followBy });
}
export async function bossEncounter(
	state: GameState,
	boss: string,
	victoryFn: (state: GameState) => void | Promise<void>,
	deathMsg?: EncounterRequest['deathMessage']
) {
	return encounterStart(state, {
		npc: boss,
		onVictory: victoryFn,
		deathMessage: deathMsg,
		flee: false
	});
}
export async function encounterFinish(state: GameState, result: 'win' | 'run', next?: Actions) {
	const npc = state.npc.current;
	const revision = state.npc.revision;
	const encounter = encounters.get(state);
	if (!npc || encounter?.finishing) return;
	if (encounter) {
		encounter.finishing = true;
		encounter.pending = undefined;
	}
	const ctx = state.actionContext;
	ctx.encounterVictory = result === 'win';
	const key = state.rules.encounters.streakKey(state);
	if (key !== undefined && (typeof key !== 'string' || !key.trim()))
		throw new Error('Invalid encounter streak key.');
	if (key !== undefined && result === 'win') await counterInc(state, key);
	else if (key !== undefined && state.rules.encounters.resetOnRun) await counterReset(state, key);
	state.npc.status = result;
	encounter?.handle.close();
	try {
		if (npc.exit) await state.resolveActions(npc.exit, ctx);
	} finally {
		if (state.npc.revision === revision) state.npc.clear();
		if (encounters.get(state) === encounter) encounters.delete(state);
	}
	if (state.rules.encounters.onFinish)
		await state.resolveActions(state.rules.encounters.onFinish, ctx);
	if (next ?? encounter?.request.onFinish)
		await state.resolveActions((next ?? encounter?.request.onFinish)!, ctx);
}
