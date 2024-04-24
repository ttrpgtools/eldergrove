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

type HasEffects = { effects?: Effect[] };
export function getAttack(item: HasEffects | undefined, def: Attack = UNARMED) {
	return item?.effects ? item.effects.find((x) => x.type === 'attack') ?? def : def;
}
