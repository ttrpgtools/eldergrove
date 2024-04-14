import { defined } from './array';
import { browser } from '$app/environment';

export function getter<T>(
	key: string,
	reviver?: (key: string, value: unknown) => unknown
): T | null {
	const strout = window.localStorage.getItem(key) || 'null';
	return JSON.parse(strout, reviver) as T;
}

export function getAll<T>(
	keyFilter: (key: string) => boolean,
	reviver?: (key: string, value: unknown) => unknown
): T[] {
	if (typeof window === 'undefined') return [];
	const count = window.localStorage.length;
	const keys: string[] = [];
	for (let index = 0; index < count; index++) {
		const key = window.localStorage.key(index);
		if (key && keyFilter(key)) {
			keys.push(key);
		}
	}
	return keys.map((k) => getter<T>(k, reviver)).filter(defined);
}

export function setter<T>(
	key: string,
	value: T | null,
	replacer?: (key: string, value: unknown) => unknown
) {
	if (value === undefined) {
		value = null;
	}
	const str = JSON.stringify(value, replacer);
	window.localStorage.setItem(key, str);
	return str;
}

function wait(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

export async function loadCachedValue<T>(key: string, defaultValue: T) {
	let value = $state(defaultValue);
	$effect(() => {
		setter(key, value);
	});
	await wait(1);
	if (browser) {
		const saved = getter<T>(key);
		if (saved != null) {
			value = saved;
		}
	}
	return {
		get value() {
			return value;
		},
		set value(v: T) {
			value = v;
		}
	};
}
