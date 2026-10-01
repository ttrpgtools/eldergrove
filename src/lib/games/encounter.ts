import type { Choice, NpcInstance, RandomTable } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { npcLabel } from '$util/npc';
import { rollOnTable } from '$util/table';
import type { Actions } from '$lib/actions';
import { counterInc, counterReset } from '$lib/actions/counters';
import { attackFromCharacter, attackFromNpc } from '$lib/actions/attacks';
import { npcLoot } from '$lib/actions/npc';
import { wait } from '$lib/actions/control';

type Encounter = { revision: number; choices: Choice[]; finishing: boolean };
const encounters = new WeakMap<GameState, Encounter>();

function noEncounter(state: GameState) {
	state.message.set(`There doesn't appear to be much going on here.`);
	state.pushChoices([
		{ label: `OK`, actions: [{ action: 'messageClear' }, { action: 'choicesPop' }] }
	]);
}

const attackAction =
	(
		npc: NpcInstance,
		revision: number,
		victoryFn: (gs: GameState) => void | Promise<void>,
		deathMsg?: string | ((gs: GameState) => string | undefined)
	) =>
	async (s: GameState) => {
		const current = () => s.npc.revision === revision && s.npc.current?.id === npc.id;
		if (!current() || s.npc.status === 'win' || s.character.hp === 0) return;
		const result = await attackFromCharacter(s);
		s.throwIfCommandCancelled();
		if (!current()) return;
		if (result) s.message.set(`You did ${result} damage to ${npcLabel(npc, true, false)}.`);
		if (s.npc.current!.hp === 0) {
			// Mark before rewards/hooks so a stale attack cannot grant victory twice.
			s.npc.status = 'win';
			s.actionContext.encounterVictory = true;
			await victoryFn(s);
			return;
		}
		await wait(s, 1500);
		if (!current()) return;
		const att = await attackFromNpc(s, npc);
		s.throwIfCommandCancelled();
		if (!current()) return;
		if (att === 0) {
			s.message.set(`${npcLabel(npc, true)} missed you!`);
		} else if (att != null) {
			s.message.set(`${npcLabel(npc, true)} hit you for ${att} damage.`);
		}
		if (s.character.hp === 0) {
			s.actionContext.encounterVictory = false;
			const youDie = await s.data.items.get('yearlings/you-die');
			s.item.push(youDie);
			const msg = typeof deathMsg === 'function' ? deathMsg(s) : deathMsg;
			if (msg) s.message.set(msg);
			s.pushChoices([]);
		}
	};

async function setNpc(
	npc: string | NpcInstance,
	state: GameState,
	choices: (x: NpcInstance, revision: number) => Choice[]
) {
	const previous = state.npc.current;
	const oldEncounter = encounters.get(state);
	if (previous?.exit && !oldEncounter?.finishing) {
		await state.resolveActions(previous.exit);
	}
	state.throwIfCommandCancelled();
	if (typeof npc === 'string') npc = await state.data.npcs.get(npc);
	state.throwIfCommandCancelled();
	if (oldEncounter) state.choices.remove(oldEncounter.choices);
	await state.npc.set(npc);
	const revision = state.npc.revision;
	const frame = state.pushChoices(choices(npc, revision));
	encounters.set(state, { revision, choices: frame, finishing: false });
	if (npc.enter) await state.resolveActions(npc.enter);
}

export async function encounterRandomNpc(
	state: GameState,
	{ table, followBy }: { table?: string[] | RandomTable<string>; followBy?: Actions }
) {
	if (!table) return noEncounter(state);
	const results = rollOnTable(table, { state, ctx: state.actionContext });
	if (results.length === 0) return noEncounter(state);
	await setNpc(results[0], state, (npc, revision) => [
		{
			label: 'Attack',
			actions: attackAction(npc, revision, async (s) => {
				s.message.append(` You killed ${npcLabel(npc, true, false)}.`);
				await npcLoot(s);
				const victoryChoices = s.pushChoices([
					{
						label: 'Leave',
						actions: async (s) => {
							s.choices.remove(victoryChoices);
							await encounterFinish(s, 'win', followBy);
						}
					}
				]);
			})
		},
		{
			label: 'Run',
			actions: async (s) => {
				if (s.npc.revision === revision && s.npc.status !== 'win') {
					await encounterFinish(s, 'run', followBy);
				}
			}
		}
	]);
}

export async function bossEncounter(
	state: GameState,
	boss: string,
	victoryFn: (x: GameState) => void | Promise<void>,
	deathMsg?: string | ((gs: GameState) => string | undefined)
) {
	await setNpc(boss, state, (npc, revision) => [
		{ label: 'Attack', actions: attackAction(npc, revision, victoryFn, deathMsg) }
	]);
}

export async function encounterFinish(state: GameState, result: 'win' | 'run', next?: Actions) {
	const npc = state.npc.current;
	const revision = state.npc.revision;
	const encounter = encounters.get(state);
	if (!npc || encounter?.finishing) return;
	if (encounter) encounter.finishing = true;
	const ctx = state.actionContext;
	ctx.encounterVictory = result === 'win';
	const streakKey = `${state.location.current.id}:wins`;
	if (result === 'win') await counterInc(state, streakKey);
	else await counterReset(state, streakKey);
	state.npc.status = result;
	if (encounter) state.choices.remove(encounter.choices);
	try {
		// Exit hooks can inspect the finished NPC/status, or start a new encounter.
		if (npc.exit) await state.resolveActions(npc.exit, ctx);
	} finally {
		// Remove only the encounter we own, before running a follow-up.
		if (state.npc.revision === revision) state.npc.clear();
		if (encounters.get(state) === encounter) encounters.delete(state);
	}
	if (next) await state.resolveActions(next, ctx);
}
