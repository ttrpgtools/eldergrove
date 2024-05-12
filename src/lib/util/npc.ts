import type { NpcInstance } from '$lib/types';
import { isCharUpperCase, isVowel } from './validate';

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
