import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameDef, RandomTable } from '../src/lib/types';
import type { Actions } from '../src/lib/actions';
import { createAuthoring, action, condition } from '../src/lib/authoring';
import { integer } from '../src/lib/contracts';
import { rollResult } from '../src/lib/arguments';
import { rollOnTable } from '../src/lib/util/table';

function adventure(): GameDef {
	return {
		id: 'interpreter',
		start: 'start',
		baseChar: {
			name: 'Hero',
			hp: 2,
			maxHp: 20,
			coin: 30,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			inventory: [],
			equip: []
		},
		locations: [{ id: 'start', name: 'Start', biome: 'meadow', choices: [] }],
		items: [],
		npcTemplates: [
			{ id: 'rat', name: 'Rat', maxHp: 4, exp: 2, items: { formula: '1', options: [] } }
		],
		npcInstances: []
	};
}
async function session(game = adventure()) {
	const { createGameState } = await import('../src/lib/state/game.svelte');
	return createGameState(game, { random: (min) => min });
}

describe('typed interpreter and extensions', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn()
		});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('rejects invalid declarative content before reading saved progress or running hooks', async () => {
		const game = adventure();
		const enter = vi.fn();
		game.locations[0].enter = enter;
		game.items = [
			{
				id: 'bad-potion',
				name: 'Bad Potion',
				type: 'consumable',
				effects: [{ action: 'hpHeal' }] as unknown as Actions
			}
		];
		await expect(session(game)).rejects.toThrow("items['bad-potion'].effects");
		expect(localStorage.getItem).not.toHaveBeenCalled();
		expect(enter).not.toHaveBeenCalled();
	});
	it('heals Discovery using its actual potion and a deterministic roll', async () => {
		const { discovery } = await import('../src/lib/games/discovery');
		const state = await session(discovery);
		state.character.hp = 1;
		const potion = await state.data.items.get('health-potion-sm');
		await state.character.addToInventory(potion);
		expect(await state.useItem(potion)).toBe('completed');
		expect(state.character.hp).toBe(6);
		expect(state.character.getInventoryCount(potion)).toBe(0);
		expect(state.contentDiagnostics[0].message).toContain('unknown-woods');
	});
	it('retains rolled values through branches and reports a missing rolled amount', async () => {
		const state = await session();
		await state.runCommand([
			action('diceRoll', '2d4+3'),
			action('branch', {
				on: condition('ctxRollEquals', 5),
				isTrue: [action('hpHeal', rollResult)]
			})
		]);
		expect(state.character.hp).toBe(7);
		expect(await state.runCommand([action('hpHeal', rollResult)])).toBe('failed');
		expect(state.character.hp).toBe(7);
		expect(state.commandNotice).toContain('preceding diceRoll');
	});
	it.each([
		[{ action: 'hpHeal' }, 'hpHeal'],
		[{ action: 'npcDamage', arg: NaN }, 'finite'],
		[{ action: 'coinsAdd', arg: Infinity }, 'finite'],
		[{ action: 'wait', arg: -1 }, 'wait'],
		[{ action: 'typo' }, 'unknown action'],
		[{ action: 'hpHeal', arg: 5, valid: { condition: 'typo' } }, 'unknown condition'],
		[{ action: 'hpHeal', arg: 5, valid: { condition: 'hpFull', arg: 10 } }, 'no argument']
	])('rejects dynamic malformed step %# with an Error-backed notice', async (step, message) => {
		const state = await session();
		const before = state.character.toJSON();
		expect(await state.runCommand([step] as unknown as Actions)).toBe('failed');
		expect(state.commandNotice).toContain(message);
		expect(state.character.toJSON()).toEqual(before);
		expect(state.busy).toBe(false);
	});
	it('registers typed actions/conditions without sharing mutable registries across adventures', async () => {
		const author = createAuthoring(),
			other = createAuthoring();
		const parser = (value: unknown) => integer(value, 'amount', 1);
		const grant = author.registerAction('test/grant', {
			parse: parser,
			run: async (s, arg, ctx) => {
				expect(ctx.rollResult).toBe(3);
				await s.resolveActions([action('coinsAdd', arg)]);
			}
		});
		const hasCoins = author.registerCondition('test/hasCoins', {
			parse: parser,
			check: (s, arg) => s.character.coin >= arg
		});
		other.registerAction('test/grant', { parse: parser, run: () => {} });
		expect(() => author.registerAction('test/grant', { parse: parser, run: () => {} })).toThrow(
			'Duplicate'
		);
		expect(() => grant(-1)).toThrow("action extension 'test/grant'");
		const state = await session();
		await state.runCommand([action('diceRoll', '3'), { ...grant(4), valid: hasCoins(30) }]);
		expect(state.character.coin).toBe(34);
	});
	it('supports registered actions that yield continuations using the same context', async () => {
		const author = createAuthoring();
		const continueWith = author.registerAction('test/continue', {
			parse: (value) => integer(value, 'amount', 1),
			run: async function* (_, value) {
				yield [action('hpHeal', value), action('messageSet', 'Rolled [rollResult]')];
			}
		});
		const state = await session();
		expect(await state.runCommand([action('diceRoll', '7'), continueWith(3)])).toBe('completed');
		expect(state.character.hp).toBe(5);
		expect(state.message.text).toBe('Rolled 7');
	});
	it('applies table active conditions without changing ranges or rerolling', async () => {
		const state = await session();
		const table: RandomTable<string> = {
			formula: '2',
			options: [
				{ trigger: 1, value: 'first' },
				{ trigger: [2, 3], value: 'secret', active: condition('flagIsSet', 'secret') },
				{ trigger: 2, value: 'context', active: condition('ctxRollEquals', 7) }
			]
		};
		expect(rollOnTable(table, { state })).toEqual([]);
		state.character.flags.add('secret');
		expect(rollOnTable(table, { state, ctx: { locations: new Set(), rollResult: 7 } })).toEqual([
			'secret',
			'context'
		]);
		expect(() => rollOnTable(table)).toThrow('require a game state');
	});
	it('handles tables with no active matches in encounters and loot', async () => {
		const game = adventure();
		game.npcTemplates[0].items = {
			formula: '1',
			options: [{ trigger: 1, value: 'potion', active: condition('flagIsSet', 'secret') }]
		};
		game.items = [{ id: 'potion', name: 'Potion', type: 'consumable' }];
		const state = await session(game);
		await state.runCommand([
			action('encounterRandomNpc', {
				table: {
					formula: '1',
					options: [{ trigger: 1, value: 'rat', active: condition('flagIsSet', 'secret') }]
				}
			})
		]);
		expect(state.npc.current).toBeUndefined();
		await state.npc.set('rat');
		expect(await state.runCommand([action('npcLoot')])).toBe('completed');
		expect(state.character.getInventoryCount('potion')).toBe(0);
	});
	it('reports unknown dynamic IDs as Error objects', async () => {
		const state = await session();
		await expect(state.data.items.get('missing')).rejects.toThrow(Error);
		await expect(state.data.npcs.get('missing')).rejects.toThrow(Error);
	});
});
