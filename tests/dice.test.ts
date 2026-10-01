import { describe, expect, it, vi } from 'vitest';
import {
	DICE_LIMITS,
	evaluateDiceRoll,
	rollFormula,
	rolls,
	validateDiceFormula
} from '../src/lib/util/dice';

describe('bounded dice expressions', () => {
	it.each([
		['2d6+3', 15],
		['d4-1', 3],
		['2*(d4+3)', 14],
		['-d4+10', 6],
		['-1d6', -6],
		['12-0.5*(3+4)', 9],
		['(2+1)d4', 12],
		[' 2D6 + 3 ', 15],
		['-2*-3', 6]
	])('evaluates %s using deterministic maximum rolls', (formula, expected) => {
		expect(rollFormula(formula, (_, max) => max)).toBe(expected);
	});
	it('uses named context without substituting it into executable syntax', () => {
		expect(
			evaluateDiceRoll(
				'd[#maxhp]-0.5*([@armor]+[@dex])',
				{ '#maxhp': 20, '@armor': 1, '@dex': 4 },
				(_, max) => max
			)
		).toBe(18);
		expect(evaluateDiceRoll('[@hp]+2', { '@hp': -3 })).toBe(-1);
	});
	it.each([
		'',
		'(',
		')',
		'(d4',
		'd4)',
		'()',
		'2dd6',
		'd',
		'0d6',
		'd0',
		'(-1)d6',
		'2.5d6',
		'd4junk',
		'1/0',
		'dNaN',
		'dInfinity',
		'd6**2',
		'd6+(2*3',
		'1001d6',
		'd1000001',
		'1000d6+1d4',
		'1000000000000*1000000000000'
	])('rejects invalid/bounded formula %j', (formula) => {
		expect(() => validateDiceFormula(formula)).toThrow(Error);
	});
	it('bounds expression length, tokens, recursion, and runtime total roll counts', () => {
		expect(() => validateDiceFormula('1'.repeat(DICE_LIMITS.length + 1))).toThrow();
		expect(() => validateDiceFormula(Array(200).fill('1').join('+'))).toThrow();
		expect(() => validateDiceFormula('('.repeat(40) + '1' + ')'.repeat(40))).toThrow();
		const random = vi.fn(() => 1);
		expect(() => evaluateDiceRoll('[@count]d6+1d4', { '@count': 1000 }, random)).toThrow(
			'total dice'
		);
		expect(random).toHaveBeenCalledTimes(1000);
	});
	it('rejects missing/nonfinite context and invalid random-source results', () => {
		for (const value of [NaN, Infinity, 0, -2, 1.2])
			expect(() => evaluateDiceRoll('d[hp]', { hp: value })).toThrow();
		expect(() => evaluateDiceRoll('[missing]')).toThrow('unavailable');
		expect(() => validateDiceFormula('[typo]', new Set(['hp']))).toThrow('unknown context');
		expect(() => rolls(6, 1001)).toThrow('count');
		expect(() => rollFormula('d6', () => 7)).toThrow('random source');
	});
});
