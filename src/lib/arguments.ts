import type { ActionContext } from './types';

export type ArgumentField<T> = [T] extends [never]
	? { arg?: never }
	: undefined extends T
		? { arg?: T }
		: { arg: T };
export type ArgumentTuple<T> = [T] extends [never]
	? []
	: undefined extends T
		? [arg?: T]
		: [arg: T];
export type NumericValue = number | { from: 'rollResult' };
export const rollResult = { from: 'rollResult' } as const;

export function resolveNumber(value: NumericValue, ctx: ActionContext): number {
	const result =
		typeof value === 'number' ? value : value?.from === 'rollResult' ? ctx.rollResult : undefined;
	if (
		typeof result !== 'number' ||
		!Number.isFinite(result) ||
		Math.abs(result) > 1_000_000_000_000
	) {
		throw new Error(
			'Expected a finite numeric amount; rollResult requires a preceding diceRoll in this action context.'
		);
	}
	return result;
}
