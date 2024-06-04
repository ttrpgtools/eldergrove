export function sequence(fn: () => void, ...keys: string[]) {
	let state = 0;
	return (evt: KeyboardEvent) => {
		const { key } = evt;
		if (key === keys[state] || key === keys[(state = 0)]) {
			state += 1;
			if (state !== keys.length) {
				return;
			}
			fn();
			state = 0;
		}
	};
}

export function konamiCode(fn: () => void) {
	return sequence(
		fn,
		'ArrowUp',
		'ArrowUp',
		'ArrowDown',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'ArrowLeft',
		'ArrowRight',
		'b',
		'a'
	);
}
