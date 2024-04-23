import type { NpcInstance } from '$lib/types';
import type { Character } from './character.svelte';
import { evaluateDiceRoll } from './dice';
import { isCharUpperCase, isVowel } from './validate';

export function attackNpc(npc: NpcInstance | undefined, character: Character) {
	// TODO: What are the mechanics going to be?
	if (!npc) return;
	const weaponDmg =
		character.gear.right?.type === 'weapon' ? character.gear.right.damage : `d4 + [@str]`;
	const damage = evaluateDiceRoll(weaponDmg, { '@str': character.str });
	npc.hp = Math.max(0, npc.hp - damage);
	return damage;
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
