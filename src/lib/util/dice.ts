import { getRandomInt } from './random';
import { isNumeric } from './validate';

export function roll(sides: number) {
	return getRandomInt(1, sides);
}

export function rolls(sides: number, count = 5) {
	return Array.from(Array(count), () => roll(sides));
}

export function bestRoll(dice: number[]) {
	return dice.reduce((p, c) => Math.max(roll(c), p), 0);
}

export function total(dice: number[]) {
	return dice.reduce((p, c) => p + c, 0);
}

function parseFactor(factor: string) {
	if (!factor) return 0;
	const neg = factor.at(0) === '-';
	//console.log(`factor = ${factor}`);
	if (neg) factor = factor.substring(1);
	const [count, sides] = factor.split('d');
	if (!sides) return 0;
	//console.log(`count = ${count} sides = ${sides}`);
	const value =
		rolls(parseInt(sides, 10), parseInt(count || '1', 10)).reduce((p, c) => p + c, 0) *
		(neg ? -1 : 1);
	//console.log(value);
	return value;
}

function parseTerm(term: string) {
	if (!term) return 0;
	//console.log(`term = ${term}`);
	const factors = term.split('*');
	const value = factors.reduce((p, c) => p * (isNumeric(c) ? parseFloat(c) : parseFactor(c)), 1);
	const roundedDown = value - (value % 1);
	//console.log(roundedDown);
	return roundedDown;
}

/**
 * Rolls dice as defined by the provided dice formula.
 * @param formula A simple dice formula.
 */
export function rollFormula(formula: string) {
	if (!formula) return 0;
	console.log(`formula = ${formula}`);
	const terms = formula.replace(/\s/g, '').replace(/(\d)-/g, '$1+-').split('+');
	const value = terms.reduce((p, c) => p + parseTerm(c), 0);
	console.log(value);
	return value;
}

export function evaluateDiceRoll(expression: string, context: Record<string, number> = {}) {
	console.log(`Evaluating = ${expression}`, context);
	expression = expression.replace(/\[([^\]]+)\]/g, (_, key) => {
		if (key in context) {
			return context[key].toString();
		} else {
			throw new Error(`Context key '${key}' not found from '${expression}'`);
		}
	});

	// Evaluate sub-expressions recursively
	while (expression.includes('(')) {
		expression = expression.replace(/\(([^()]+)\)/g, (_, subExpr) =>
			evaluateDiceRoll(subExpr, context).toString()
		);
	}

	return rollFormula(expression);
}
