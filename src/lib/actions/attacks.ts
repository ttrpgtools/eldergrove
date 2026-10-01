import type { NpcInstance } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { hpDamage } from './hp';
import { npcDamage } from './npc';

async function basicCharacterAttack(
	state: GameState,
	{ amt, type }: { amt: string; type: string }
) {
	return npcDamage(state, { amount: state.roll(amt), type, source: 'attack' });
}

export async function attackFromNpc(state: GameState, npc: NpcInstance | undefined) {
	npc = npc ?? state.npc.current;
	if (!npc) return;
	if (npc.effects) {
		return await state.resolveActions(npc.effects);
	} else {
		return hpDamage(state, { amount: state.roll(state.rules.combat.npcAttack), source: 'attack' });
	}
}

export async function attackFromCharacter(state: GameState) {
	const weapon = state.rules.combat.weapon(state);
	if (weapon) {
		if (weapon.effects && (typeof weapon.effects === 'function' || weapon.effects.length)) {
			await state.resolveActions(weapon.effects);
			return;
		} else if (weapon.type === 'weapon' && weapon.damage) {
			return await basicCharacterAttack(state, weapon.damage);
		}
	}
	return await basicCharacterAttack(state, state.rules.combat.unarmed);
}
