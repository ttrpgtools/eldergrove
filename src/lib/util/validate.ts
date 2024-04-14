import type { Entity, HasHealth, Identifiable, Named } from '$lib/types';

const numberlike = /^-?\d+$/;

export function isNumeric(potential: string) {
	return numberlike.test(potential);
}

export function hasHp(entity: Entity): entity is HasHealth & Identifiable & Named {
	return 'maxHp' in entity && 'hp' in entity;
}
