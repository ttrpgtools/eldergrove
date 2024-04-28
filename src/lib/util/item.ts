import type { Attack, Effect, Item } from '$lib/types';

export function getFirstEffect(item: Item) {
	return item.effects ? item.effects[0] : undefined;
}

const UNARMED: Attack = {
	id: 'unarmed-attack',
	name: 'Unarmed Attack',
	amount: `d4 + [@str]`,
	type: 'attack',
	nature: 'physical'
};

type MayHaveEffects = { effects?: Effect[] };
type HasEffects = { effects: Effect[] };
export function getAttack(item: MayHaveEffects | undefined, def: Attack = UNARMED) {
	return item?.effects ? item.effects.find((x) => x.type === 'attack') ?? def : def;
}

export function canHeal(item: MayHaveEffects): item is HasEffects {
	return item.effects ? item.effects.some((x) => x.type === 'healing') : false;
}
