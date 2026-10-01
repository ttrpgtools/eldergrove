import { getRandomInt } from './random';

export type RandomSource = (min: number, max: number) => number;
export const DICE_LIMITS = {
	length: 2048,
	tokens: 256,
	depth: 32,
	rolls: 1000,
	sides: 1_000_000,
	value: 1_000_000_000_000
} as const;
export const GAME_DICE_KEYS = new Set([
	'@hp',
	'@maxhp',
	'@str',
	'@dex',
	'@wil',
	'@armor',
	'#maxhp',
	'#hp'
]);
type Node =
	| { kind: 'number'; value: number }
	| { kind: 'context'; key: string }
	| { kind: 'negate'; value: Node }
	| { kind: '+' | '-' | '*' | 'dice'; left: Node; right: Node };

function fail(message: string): never {
	throw new Error(`Invalid dice formula: ${message}`);
}
function bounded(value: number): number {
	if (!Number.isFinite(value) || Math.abs(value) > DICE_LIMITS.value)
		fail('result exceeds the supported numeric range.');
	return value;
}
function dimensions(sides: number, count: number) {
	if (!Number.isSafeInteger(sides) || sides < 1 || sides > DICE_LIMITS.sides)
		fail(`sides must be an integer from 1 to ${DICE_LIMITS.sides}.`);
	if (!Number.isSafeInteger(count) || count < 1 || count > DICE_LIMITS.rolls)
		fail(`count must be an integer from 1 to ${DICE_LIMITS.rolls}.`);
}
export function roll(sides: number, random: RandomSource = getRandomInt) {
	dimensions(sides, 1);
	const value = random(1, sides);
	if (!Number.isSafeInteger(value) || value < 1 || value > sides)
		fail('random source returned an out-of-range result.');
	return value;
}
export function rolls(sides: number, count = 5, random: RandomSource = getRandomInt) {
	dimensions(sides, count);
	return Array.from({ length: count }, () => roll(sides, random));
}
export function bestRoll(dice: number[], random: RandomSource = getRandomInt) {
	if (dice.length > DICE_LIMITS.rolls) fail('too many dice.');
	return dice.reduce((best, sides) => Math.max(roll(sides, random), best), 0);
}
export function total(dice: number[]) {
	return bounded(dice.reduce((sum, value) => sum + bounded(value), 0));
}

function parse(formula: string): Node {
	if (typeof formula !== 'string' || !formula.trim() || formula.length > DICE_LIMITS.length)
		fail('provide a nonempty expression within the length limit.');
	const tokens: string[] = [];
	const pattern = /\s*(\d+(?:\.\d+)?|\[[^\]\s]+\]|[dD()+*-])/y;
	let position = 0;
	while (position < formula.trimEnd().length) {
		pattern.lastIndex = position;
		const match = pattern.exec(formula);
		if (!match) fail(`unexpected token at character ${position + 1}.`);
		tokens.push(match[1]);
		position = pattern.lastIndex;
		if (tokens.length > DICE_LIMITS.tokens) fail('too many tokens.');
	}
	let cursor = 0;
	let depth = 0;
	const peek = () => tokens[cursor];
	function primary(): Node {
		if (++depth > DICE_LIMITS.depth) fail('nesting is too deep.');
		let node: Node;
		const token = tokens[cursor++];
		if (token === '(') {
			node = sum();
			if (tokens[cursor++] !== ')') fail('unmatched parentheses.');
		} else if (token?.startsWith('[')) {
			node = { kind: 'context', key: token.slice(1, -1) };
		} else if (token && /^\d/.test(token)) {
			node = { kind: 'number', value: bounded(Number(token)) };
		} else fail('expected a number, context reference, or parenthesized expression.');
		depth--;
		return node;
	}
	function unary(): Node {
		if (peek() === '-' || peek() === '+') {
			if (++depth > DICE_LIMITS.depth) fail('nesting is too deep.');
			const sign = tokens[cursor++];
			const value = unary();
			depth--;
			return sign === '-' ? { kind: 'negate', value } : value;
		}
		let left: Node;
		if (peek()?.toLowerCase() === 'd') left = { kind: 'number', value: 1 };
		else left = primary();
		if (peek()?.toLowerCase() === 'd') {
			cursor++;
			return { kind: 'dice', left, right: primary() };
		}
		return left;
	}
	function product(): Node {
		let left = unary();
		while (peek() === '*') {
			cursor++;
			left = { kind: '*', left, right: unary() };
		}
		return left;
	}
	function sum(): Node {
		let left = product();
		while (peek() === '+' || peek() === '-') {
			const kind = tokens[cursor++] as '+' | '-';
			left = { kind, left, right: product() };
		}
		return left;
	}
	const result = sum();
	if (cursor !== tokens.length) fail(`unexpected token '${peek()}'.`);
	return result;
}

/** Parse without consuming randomness; context-dependent dice bounds are also checked at execution. */
export function validateDiceFormula(formula: string, allowedContext?: ReadonlySet<string>): void {
	let rolls = 0;
	function inspect(node: Node): number | undefined {
		if (node.kind === 'number') return node.value;
		if (node.kind === 'context') {
			if (allowedContext && !allowedContext.has(node.key))
				fail(`unknown context key '${node.key}'.`);
			return undefined;
		}
		if (node.kind === 'negate') {
			const value = inspect(node.value);
			return value === undefined ? undefined : -value;
		}
		const left = inspect(node.left),
			right = inspect(node.right);
		if (node.kind === 'dice') {
			if (left !== undefined) {
				rolls += left;
				if (rolls > DICE_LIMITS.rolls) fail(`expression exceeds ${DICE_LIMITS.rolls} total dice.`);
			}
			if (right !== undefined) dimensions(right, left ?? 1);
			else if (left !== undefined) dimensions(1, left);
			return undefined;
		}
		if (left === undefined || right === undefined) return undefined;
		return bounded(
			node.kind === '+' ? left + right : node.kind === '-' ? left - right : left * right
		);
	}
	inspect(parse(formula));
}

export function evaluateDiceRoll(
	expression: string,
	context: Record<string, number> = {},
	random: RandomSource = getRandomInt
) {
	const root = parse(expression);
	let budget = DICE_LIMITS.rolls as number;
	function evaluate(node: Node): number {
		if (node.kind === 'number') return node.value;
		if (node.kind === 'context') {
			if (!Object.hasOwn(context, node.key) || typeof context[node.key] !== 'number')
				fail(`context key '${node.key}' is unavailable.`);
			return bounded(context[node.key]);
		}
		if (node.kind === 'negate') return -evaluate(node.value);
		const left = evaluate(node.left),
			right = evaluate(node.right);
		if (node.kind === 'dice') {
			dimensions(right, left);
			budget -= left;
			if (budget < 0) fail(`expression exceeds ${DICE_LIMITS.rolls} total dice.`);
			return total(rolls(right, left, random));
		}
		// Preserve the existing integer arithmetic used by game combat formulas.
		return bounded(
			node.kind === '+' ? left + right : node.kind === '-' ? left - right : Math.trunc(left * right)
		);
	}
	return Math.trunc(bounded(evaluate(root)));
}
export function rollFormula(formula: string, random: RandomSource = getRandomInt) {
	return evaluateDiceRoll(formula, {}, random);
}
