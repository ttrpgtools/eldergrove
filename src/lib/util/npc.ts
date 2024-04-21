import type { NpcInstance } from '$lib/types';
import type { Character } from './character.svelte';
import { rolls, total } from './dice';
import { isCharUpperCase, isVowel } from './validate';

export function attackNpc(npc: NpcInstance | undefined, character: Character) {
	// TODO: What are the mechanics going to be?
	if (!npc) return;
	const damage = total(rolls(4, character.level));
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
