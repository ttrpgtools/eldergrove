import type { NpcInstance } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { minZero } from '$util/math';
import { hpDamage } from './hp';
import { npcDamage } from './npc';

const NATURAL = `d[#maxhp]-0.5*([@armor]+[@dex])`;
const UNARMED = `d4 + [@str]`;

async function basicCharacterAttack(state: GameState, { amt }: { amt: string; type: string }) {
	const value = state.roll(amt);
	await npcDamage(state, value);
	return value;
}

export async function attackFromNpc(state: GameState, npc: NpcInstance | undefined) {
	npc = npc ?? state.npc.current;
	if (!npc) return;
	if (npc.effects) {
		return await state.resolveActions(npc.effects);
	} else {
		const value = minZero(state.roll(NATURAL));
		await hpDamage(state, value);
		return value;
	}
}

export async function attackFromCharacter(state: GameState) {
	const weapon = state.character.gear.right ?? state.character.gear.left;
	if (weapon) {
		if (weapon.effects && weapon.effects.length) {
			await state.resolveActions(weapon.effects);
			return;
		} else if (weapon.type === 'weapon' && weapon.damage) {
			return await basicCharacterAttack(state, weapon.damage);
		}
	}
	return await basicCharacterAttack(state, { amt: UNARMED, type: 'blunt' });
}
