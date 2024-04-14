import type { NpcInstance } from '$lib/types';
import type { Character } from './character.svelte';
import { rolls, total } from './dice';

export function attackNpc(npc: NpcInstance | undefined, character: Character) {
	// TODO: What are the mechanics going to be?
	if (!npc) return;
	const damage = total(rolls(4, character.level));
	npc.hp = Math.max(0, npc.hp - damage);
	return damage;
}
