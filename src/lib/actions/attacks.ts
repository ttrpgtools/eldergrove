import type { NpcInstance } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import type { Action } from '.';

const NATURAL = `d[#maxhp]-0.5*([@armor]+[@dex])`;
const UNARMED = `d4 + [@str]`;

function basicNpcAttack(formula: string, npc: NpcInstance) {
	const actions: Action[] = [
		{ action: 'diceRoll', arg: { formula, npc } },
		{ action: 'diceMinZero' },
		{ action: 'hpDamage' }
	];
	return actions;
}

function basicCharacterAttack({ amt }: { amt: string; type: string }) {
	const actions: Action[] = [
		{ action: 'diceRoll', arg: { formula: amt } },
		{ action: 'diceMinZero' },
		{ action: 'npcDamage' }
	];
	return actions;
}

export async function attackFromNpc(_: GameState, npc: NpcInstance) {
	return (async function* () {
		yield npc.effects && npc.effects.length ? npc.effects : basicNpcAttack(NATURAL, npc);
	})();
}

export async function attackFromCharacter(state: GameState) {
	return (async function* () {
		const weapon = state.character.gear.right ?? state.character.gear.left;
		if (weapon) {
			if (weapon.effects && weapon.effects.length) {
				yield weapon.effects;
				return;
			} else if (weapon.type === 'weapon' && weapon.damage) {
				yield basicCharacterAttack(weapon.damage);
				return;
			}
		}

		yield basicCharacterAttack({ amt: UNARMED, type: 'blunt' });
	})();
}