import type { Attack, NpcInstance } from '$lib/types';
import type { Character } from './character.svelte';
import { evaluateDiceRoll } from './dice';
import { getAttack } from './item';
import { isCharUpperCase, isVowel } from './validate';

export function attackNpc(npc: NpcInstance | undefined, character: Character) {
	// TODO: What are the mechanics going to be?
	if (!npc) return;
	// TODO: Move logic to character class
	const weaponDmg = getAttack(character.gear.right ?? character.gear.left).amount;
	const damage = evaluateDiceRoll(weaponDmg, { '@str': character.str });
	npc.hp = Math.max(0, npc.hp - damage);
	return damage;
}

const NATURAL: Attack = {
	id: 'natural-weapon',
	name: 'Natural Weapon',
	type: 'attack',
	nature: 'physical',
	amount: `d[@maxhp]-0.5*([#armor]+[#dex])`
};
export function getNextNpcAttack(npc: NpcInstance) {
	const atk = getAttack(npc, NATURAL);
	return atk;
}

export function npcLabel(npc: NpcInstance, definite = false, capital = true) {
	if (!npc || !npc.name) return `Unknown`;
	if (isCharUpperCase(npc.name[0])) {
		// Named
		return npc.name;
	}
	if (definite) {
		return `${capital ? 'T' : 't'}he ${npc.name}`;
	}
	return `${capital ? 'A' : 'a'}${isVowel(npc.name[0]) ? 'n' : ''} ${npc.name}`;
}
