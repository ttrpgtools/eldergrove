import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { ContentValidationError, inspectAdventure, validateAdventure } from '../src/lib/content';
import type { GameDef } from '../src/lib/types';
import type { Actions } from '../src/lib/actions';

export function adventure(): GameDef {
	return {
		id: 'content',
		start: 'start',
		baseChar: {
			name: 'Hero',
			maxHp: 10,
			coin: 20,
			str: 3,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			equip: [],
			inventory: [['potion', 1]]
		},
		locations: [
			{ id: 'start', name: 'Start', biome: 'meadow', choices: [] },
			{ id: 'next', name: 'Next', biome: 'forest', parent: 'start', choices: [] }
		],
		items: [
			{ id: 'potion', name: 'Potion', type: 'consumable', effects: [{ action: 'hpHeal', arg: 4 }] }
		],
		npcTemplates: [{ id: 'rat', name: 'Rat', maxHp: 5, exp: 2 }],
		npcInstances: [{ id: 'boss', name: 'Boss', maxHp: 20, hp: 20, exp: 10 }]
	};
}
function assets(): Set<string> {
	const result = new Set<string>();
	const root = fileURLToPath(new URL('../static', import.meta.url));
	function walk(dir: string, relative = '') {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const name = `${relative}/${entry.name}`;
			if (entry.isDirectory()) walk(join(dir, entry.name), name);
			else if (entry.isFile()) result.add(name);
		}
	}
	walk(root);
	return result;
}

describe('adventure content diagnostics', () => {
	it('validates real adventures and local files while retaining the explicit Discovery gap', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const { discovery } = await import('../src/lib/games/discovery');
		expect(validateAdventure(yearlings, { assets: assets() })).toEqual([]);
		const diagnostics = validateAdventure(discovery, { assets: assets() });
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: 'warning' });
		expect(diagnostics[0].message).toContain('unknown-woods');
	});
	it('does not execute hooks or mutate content while validating', () => {
		const game = adventure();
		const hook = vi.fn();
		game.locations[0].enter = hook;
		const before = JSON.stringify(game);
		expect(validateAdventure(game)).toEqual([]);
		expect(JSON.stringify(game)).toBe(before);
		expect(hook).not.toHaveBeenCalled();
	});
	it.each([
		['duplicate item', (g: GameDef) => g.items.push({ ...g.items[0] }), 'Duplicate ID'],
		['duplicate location', (g: GameDef) => g.locations.push({ ...g.locations[0] }), 'Duplicate ID'],
		[
			'colliding NPC template/instance',
			(g: GameDef) => {
				g.npcInstances[0].id = 'rat';
			},
			'Duplicate ID'
		],
		[
			'missing start',
			(g: GameDef) => {
				g.start = 'missing';
			},
			'start'
		],
		[
			'missing biome',
			(g: GameDef) => {
				g.locations[0].biome = 'missing';
			},
			'biome'
		],
		[
			'missing parent',
			(g: GameDef) => {
				g.locations[0].parent = 'missing';
			},
			'parent'
		],
		[
			'parent cycle',
			(g: GameDef) => {
				g.locations[0].parent = 'next';
			},
			'Parent cycle'
		],
		[
			'missing inventory item',
			(g: GameDef) => {
				g.baseChar.inventory = [['missing', 1]];
			},
			'baseChar.inventory'
		],
		[
			'invalid starting HP',
			(g: GameDef) => {
				g.baseChar.hp = NaN;
			},
			'baseChar.hp'
		],
		[
			'invalid NPC HP',
			(g: GameDef) => {
				g.npcInstances[0].hp = 21;
			},
			'.hp'
		],
		[
			'invalid formula',
			(g: GameDef) => {
				g.items[0].effects = [{ action: 'diceRoll', arg: '(' }];
			},
			'dice formula'
		],
		[
			'missing location action',
			(g: GameDef) => {
				g.locations[0].choices = [
					{ label: 'Go', actions: [{ action: 'locationChange', arg: 'missing' }] }
				];
			},
			'Unknown referenced ID'
		],
		[
			'missing NPC action',
			(g: GameDef) => {
				g.locations[0].enter = [{ action: 'encounterRandomNpc', arg: { table: ['missing'] } }];
			},
			'Unknown referenced ID'
		],
		[
			'missing shop item',
			(g: GameDef) => {
				g.locations[0].shop = [{ item: 'missing', cost: 2, stock: 2 }];
			},
			'shop'
		],
		[
			'negative shop stock',
			(g: GameDef) => {
				g.locations[0].shop = [{ item: 'potion', cost: 2, stock: -2 }];
			},
			'stock'
		],
		[
			'invalid image protocol',
			(g: GameDef) => {
				g.items[0].image = 'javascript:alert(1)';
			},
			'asset path'
		],
		[
			'relative image',
			(g: GameDef) => {
				g.items[0].image = 'img/test.webp';
			},
			'asset path'
		],
		[
			'image traversal',
			(g: GameDef) => {
				g.items[0].image = '/img/%2e%2e/test.webp';
			},
			'invalid asset'
		],
		[
			'missing image',
			(g: GameDef) => {
				g.items[0].image = '/img/missing.webp';
			},
			'missing local asset'
		]
	] as const)('reports %s with author paths', (_, change, message) => {
		const game = adventure();
		change(game);
		const diagnostics = inspectAdventure(game, { assets: assets() });
		expect(diagnostics.some((d) => `${d.path}: ${d.message}`.includes(message))).toBe(true);
		expect(() => validateAdventure(game, { assets: assets() })).toThrow(ContentValidationError);
	});
	it('finds references inside branches, confirmation choices, conditions, loot and continuations', () => {
		const game = adventure();
		game.locations[0].enter = [
			{
				action: 'branch',
				arg: {
					on: { condition: 'inventoryContains', arg: 'missing-condition' },
					isTrue: [
						{
							action: 'yesno',
							arg: {
								yes: [
									{
										action: 'choicesPush',
										arg: [
											{ label: 'Go', actions: [{ action: 'locationChange', arg: 'missing-deep' }] }
										]
									}
								],
								no: []
							}
						}
					]
				}
			}
		];
		game.npcTemplates[0].items = {
			formula: 'd4',
			options: [
				{
					trigger: [1, 4],
					value: 'missing-loot',
					active: { condition: 'inventoryContains', arg: 'missing-gate' }
				}
			]
		};
		const text = inspectAdventure(game)
			.map((d) => d.message)
			.join('\n');
		for (const id of ['missing-condition', 'missing-deep', 'missing-loot', 'missing-gate'])
			expect(text).toContain(id);
	});
	it('rejects malformed actions, conditions and cyclic declarative action graphs', () => {
		const game = adventure();
		game.locations[0].enter = [{ action: 'hpHeal' }] as unknown as Actions;
		expect(inspectAdventure(game)[0].message).toContain('hpHeal');
		game.locations[0].enter = [
			{ action: 'branch', arg: { on: { condition: 'hpFull', arg: 1 }, isTrue: [] } }
		] as unknown as Actions;
		expect(inspectAdventure(game)[0].message).toContain('no argument');
		const cyclic: Actions = [];
		cyclic.push({ action: 'yesno', arg: { yes: cyclic, no: [] } });
		game.locations[0].enter = cyclic;
		expect(inspectAdventure(game)[0].message).toContain('cyclic');
	});
	it('rejects invalid top-level collection shapes with diagnostics', () => {
		expect(inspectAdventure(null as unknown as GameDef)[0].path).toBe('game');
		const game = adventure();
		game.npcTemplates = undefined as unknown as GameDef['npcTemplates'];
		expect(inspectAdventure(game).some((d) => d.path === 'npcTemplates')).toBe(true);
	});
	it('does not allow unfinished declarations to hide invalid starts or parents', () => {
		const game = adventure();
		game.unresolvedLocations = ['unfinished'];
		game.start = 'unfinished';
		game.locations[0].parent = 'unfinished';
		expect(() => validateAdventure(game)).toThrow(ContentValidationError);
	});
});
