let values: Uint32Array | undefined;
const MAX = 512;
let count = MAX;
const LARGEST = 0x100000000;
const DEFAULT_STRING_POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
const DEFAULT_STRING_POOL_LEN = DEFAULT_STRING_POOL.length;

export function getRandomInt(min: number, max: number) {
	min = Math.floor(min);
	max = Math.floor(max);

	const range = max - min + 1;
	return getRandom(range) + min;
}

export function getRandom(upper: number) {
	if (values == null || count === 0) {
		values = new Uint32Array(MAX);
		crypto.getRandomValues(values);
		count = MAX;
	}
	count -= 1;
	const rnd = values[count] / LARGEST;
	return Math.floor(upper * rnd);
}

export function id(len = 8) {
	return Array.from(Array(len), () =>
		DEFAULT_STRING_POOL.charAt(getRandom(DEFAULT_STRING_POOL_LEN))
	).join('');
}
