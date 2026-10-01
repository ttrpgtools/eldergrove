import type { GameDef } from './types';

export type Immutable<T> = T extends (...args: never[]) => unknown
	? T
	: T extends readonly unknown[]
		? { readonly [K in keyof T]: Immutable<T[K]> }
		: T extends object
			? { readonly [K in keyof T]: Immutable<T[K]> }
			: T;
export type AdventureDefinition = Immutable<GameDef>;

/** Snapshot plain author data; retain trusted functions without freezing their closures. */
export function immutableSnapshot<T>(value: T): Immutable<T> {
	const ancestors = new Set<object>();
	function copy(value: unknown): unknown {
		if (value === null || typeof value !== 'object') return value;
		if (ancestors.has(value))
			throw new Error('Adventure definitions must not contain cyclic data.');
		if (
			!Array.isArray(value) &&
			Object.getPrototypeOf(value) !== Object.prototype &&
			Object.getPrototypeOf(value) !== null
		) {
			throw new Error(
				'Adventure definitions support plain objects, arrays, and trusted functions; keep runtime classes outside content.'
			);
		}
		ancestors.add(value);
		const result = Array.isArray(value)
			? value.map(copy)
			: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copy(entry)]));
		ancestors.delete(value);
		return Object.freeze(result);
	}
	return copy(value) as Immutable<T>;
}

/** Internal read-only view retains existing handler signatures; the actual snapshot is deeply frozen. */
export function snapshotAdventure(game: GameDef | AdventureDefinition): GameDef {
	return immutableSnapshot(game) as GameDef;
}
