import type { Entity, HasHealth, Identifiable, Named } from '$lib/types';

const numberlike = /^-?\d+(\.\d+)?$/;

export function isNumeric(potential: string) {
	return numberlike.test(potential);
}

export function isCharUpperCase(char: string) {
	return char === char.toUpperCase();
}

const vowels = ['a', 'e', 'i', 'o', 'u'];
export function isVowel(char: string) {
	const lchar = char.toLowerCase();
	return vowels.some((v) => v === lchar);
}

export function hasHp(entity: Entity): entity is HasHealth & Identifiable & Named {
	return 'maxHp' in entity && 'hp' in entity;
}
