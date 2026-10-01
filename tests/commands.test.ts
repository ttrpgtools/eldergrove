import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameDef, Choice, ActionContext } from '../src/lib/types';
import type { GameState } from '../src/lib/state/game.svelte';

function adventure(): GameDef {
	return {
		id: 'commands',
		start: 'field',
		baseChar: {
			name: 'Hero',
			hp: 10,
			maxHp: 20,
			coin: 50,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			inventory: [
				['potion', 1],
				['shield', 1]
			],
			equip: [['sword', 'right']]
		},
		items: [
			{
				id: 'sword',
				name: 'Sword',
				type: 'weapon',
				where: 'hand',
				damage: { amt: '20', type: 'blunt' }
			},
			{ id: 'shield', name: 'Shield', type: 'armor', where: 'hand', defence: 2 },
			{ id: 'potion', name: 'Potion', type: 'consumable', effects: [{ action: 'hpHeal', arg: 5 }] },
			{ id: 'gem', name: 'Gem', type: 'trinket' },
			{ id: 'yearlings/you-die', name: 'Dead', type: 'trinket' }
		],
		locations: [
			{ id: 'field', name: 'Field', biome: 'meadow', choices: [] },
			{
				id: 'shop',
				name: 'Shop',
				biome: 'town',
				choices: [],
				shop: [{ item: 'gem', cost: 10, stock: 5 }]
			}
		],
		npcTemplates: [{ id: 'rat', name: 'Rat', maxHp: 5, exp: 7, coins: 10 }],
		npcInstances: [{ id: 'boss', name: 'Boss', maxHp: 100, hp: 100, exp: 10 }]
	};
}

function gate() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}
function choice(state: GameState, label: string): Choice {
	const result = state.choices.current?.find((choice) => choice.label === label);
	expect(result, `Missing choice ${label}`).toBeDefined();
	return result!;
}
async function session(game = adventure()) {
	const { createGameState } = await import('../src/lib/state/game.svelte');
	return createGameState(game);
}

describe('command lifecycle', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('awaits inventory lookup before conditions and following actions', async () => {
		const state = await session();
		const pending = gate();
		const get = state.data.items.get.bind(state.data.items);
		vi.spyOn(state.data.items, 'get').mockImplementation(async (id) => {
			await pending.promise;
			return get(id);
		});
		const command = state.runCommand([
			{ action: 'inventoryAdd', arg: 'gem' },
			{ action: 'flagSet', arg: 'received', valid: { condition: 'inventoryContains', arg: 'gem' } }
		]);
		expect(state.busy).toBe(true);
		expect(state.character.flags.has('received')).toBe(false);
		pending.release();
		expect(await command).toBe('completed');
		expect(state.character.getInventoryCount('gem')).toBe(1);
		expect(state.character.flags.has('received')).toBe(true);
	});

	it('rejects rapid menu, item, and equipment input while a command is active', async () => {
		const state = await session();
		const pending = gate();
		state.choices.set([
			{
				label: 'Reward',
				actions: async (s) => {
					await pending.promise;
					s.character.coin += 10;
				}
			}
		]);
		const reward = choice(state, 'Reward');
		const command = state.choose(reward);
		expect(await state.choose(reward)).toBe('busy');
		expect(await state.useItem(await state.data.items.get('potion'))).toBe('busy');
		expect(await state.equip(await state.data.items.get('shield'))).toBe('busy');
		expect(await state.unequip('right')).toBe('busy');
		expect(state.character.hp).toBe(10);
		expect(state.character.gear.right?.id).toBe('sword');
		pending.release();
		expect(await command).toBe('completed');
		expect(state.character.coin).toBe(60);
		expect(state.busy).toBe(false);
	});

	it('validates current choices and conditions again at execution time', async () => {
		const state = await session();
		state.choices.set([
			{
				label: 'Hidden',
				show: { condition: 'flagIsSet', arg: 'allowed' },
				actions: [{ action: 'coinsAdd', arg: 10 }]
			}
		]);
		const hidden = state.choices.current![0];
		expect(await state.choose(hidden)).toBe('unavailable');
		state.character.flags.add('allowed');
		state.choices.set([{ label: 'Different', actions: [] }]);
		state.message.set('Keep this');
		expect(await state.choose(hidden)).toBe('unavailable');
		expect(state.message.text).toBe('Keep this');
		expect(state.character.coin).toBe(50);
	});

	it('keeps command locks independent between sessions', async () => {
		const first = await session();
		const second = await session();
		const pending = gate();
		const command = first.runCommand(async () => {
			await pending.promise;
		});
		expect(await second.runCommand([{ action: 'coinsAdd', arg: 3 }])).toBe('completed');
		expect(first.busy).toBe(true);
		expect(second.character.coin).toBe(53);
		pending.release();
		await command;
	});

	it('reports errors, retains completed mutations, and unlocks the next command', async () => {
		const state = await session();
		expect(
			await state.runCommand([
				{ action: 'coinsAdd', arg: 1 },
				{
					action: () => {
						throw new Error('Broken hook');
					}
				},
				{ action: 'coinsAdd', arg: 100 }
			])
		).toBe('failed');
		expect(state.character.coin).toBe(51);
		expect(state.commandNotice).toContain('Broken hook');
		expect(state.busy).toBe(false);
		expect(await state.runCommand([{ action: 'coinsAdd', arg: 1 }])).toBe('completed');
		expect(state.commandNotice).toBeUndefined();
	});

	it('cancels a built-in wait, stops later actions, and removes its timer', async () => {
		const state = await session();
		vi.useFakeTimers();
		const command = state.runCommand([
			{ action: 'coinsAdd', arg: 1 },
			{ action: 'wait', arg: 60000 },
			{ action: 'coinsAdd', arg: 100 }
		]);
		await vi.advanceTimersByTimeAsync(0);
		expect(vi.getTimerCount()).toBe(1);
		state.cancelCommand();
		expect(await command).toBe('cancelled');
		expect(vi.getTimerCount()).toBe(0);
		expect(state.character.coin).toBe(51);
		expect(state.commandNotice).toContain('interrupted');
		expect(state.busy).toBe(false);
	});

	it('retains the lock until a non-cancellable trusted hook settles', async () => {
		const state = await session();
		const pending = gate();
		const started = vi.fn();
		const command = state.runCommand([
			{
				action: async (s) => {
					started();
					await pending.promise;
					s.character.coin++;
				}
			},
			{ action: 'coinsAdd', arg: 100 }
		]);
		await vi.waitFor(() => expect(started).toHaveBeenCalledOnce());
		const signal = state.commandSignal;
		state.cancelCommand();
		expect(signal?.aborted).toBe(true);
		expect(state.busy).toBe(true);
		expect(await state.runCommand([])).toBe('busy');
		pending.release();
		expect(await command).toBe('cancelled');
		expect(state.character.coin).toBe(51);
		expect(state.commandSignal).toBeUndefined();
	});

	it('preserves context through branches, nested hooks, and confirmation choices', async () => {
		const state = await session();
		await state.runCommand([
			{ action: 'diceRoll', arg: '7' },
			{
				action: 'branch',
				arg: {
					on: { condition: 'ctxRollEquals', arg: 7 },
					isTrue: [
						{
							action: async (s: GameState, _: unknown, ctx: ActionContext) => {
								expect(ctx.rollResult).toBe(7);
								await s.resolveActions([
									{
										action: 'yesno',
										arg: {
											yes: [{ action: 'messageSet', arg: 'Roll [rollResult]' }],
											no: []
										}
									}
								]);
							}
						}
					]
				}
			}
		]);
		expect(await state.choose(choice(state, 'Yes'))).toBe('completed');
		expect(state.message.text).toBe('Roll 7');
		expect(state.choices.depth).toBe(1);
		let newContext: ActionContext | undefined;
		await state.runCommand((_, ctx) => {
			newContext = ctx;
		});
		expect(newContext?.rollResult).toBeUndefined();
	});

	it('retains context for pushed choices and their visibility conditions', async () => {
		const state = await session();
		await state.runCommand([
			{ action: 'diceRoll', arg: '7' },
			{
				action: 'choicesPush',
				arg: [
					{
						label: 'Continue',
						show: { condition: 'ctxRollEquals', arg: 7 },
						actions: [
							{ action: 'flagSet', arg: 'continued', valid: { condition: 'ctxRollEquals', arg: 7 } }
						]
					}
				]
			}
		]);
		const next = choice(state, 'Continue');
		expect(state.isChoiceAvailable(next)).toBe(true);
		expect(await state.choose(next)).toBe('completed');
		expect(state.character.flags.has('continued')).toBe(true);
	});

	it('removes only a confirmation frame when its answer starts another interaction', async () => {
		const state = await session();
		await state.runCommand([
			{
				action: 'yesno',
				arg: { yes: [{ action: 'itemFind', arg: { item: 'gem', takeActions: [] } }], no: [] }
			}
		]);
		const yes = choice(state, 'Yes');
		await state.choose(yes);
		expect(choice(state, 'Take it!')).toBeDefined();
		expect(state.item.current?.id).toBe('gem');
		expect(state.choices.depth).toBe(2);
		expect(await state.choose(yes)).toBe('unavailable');
	});

	it('consumes an item once despite repeated input and stale inventory selection', async () => {
		const state = await session();
		const potion = await state.data.items.get('potion');
		const use = state.useItem(potion);
		expect(await state.useItem(potion)).toBe('busy');
		await use;
		await state.useItem(potion);
		expect(state.character.hp).toBe(15);
		expect(state.character.getInventoryCount(potion)).toBe(0);
	});

	it('does not reuse a consumable whose effects failed', async () => {
		const game = adventure();
		game.items[2].effects = [
			{
				action: () => {
					throw new Error('Effect failed');
				}
			}
		];
		const state = await session(game);
		const potion = await state.data.items.get('potion');
		expect(await state.useItem(potion)).toBe('failed');
		expect(state.character.getInventoryCount(potion)).toBe(0);
		expect(await state.useItem(potion)).toBe('completed');
	});

	it('equips/unequips through commands without creating extra inventory copies', async () => {
		const state = await session();
		const shield = await state.data.items.get('shield');
		expect(await state.equip(shield)).toBe('completed');
		expect(state.character.gear.left?.id).toBe('shield');
		await state.equip(shield);
		expect(state.character.getInventoryCount('shield')).toBe(0);
		const unequip = state.unequip('left');
		expect(await state.unequip('left')).toBe('busy');
		await unequip;
		expect(state.character.getInventoryCount('shield')).toBe(1);
	});

	it('does not charge or give duplicate goods on rapid shop confirmation', async () => {
		const state = await session();
		await state.runCommand([{ action: 'locationChange', arg: 'shop' }, { action: 'shopStart' }]);
		await state.choose(choice(state, 'Gem (10)'));
		const yes = choice(state, 'Yes');
		const buy = state.choose(yes);
		expect(await state.choose(yes)).toBe('busy');
		await buy;
		expect(await state.choose(yes)).toBe('unavailable');
		expect(state.character.coin).toBe(40);
		expect(state.character.getInventoryCount('gem')).toBe(1);
		expect(state.item.current).toBeUndefined();
		expect(choice(state, 'Gem (10)')).toBeDefined();
	});

	it('rewards a combat victory only once and keeps a follow-up encounter alive', async () => {
		const { encounterRandomNpc, bossEncounter } = await import('../src/lib/games/encounter');
		const state = await session();
		await state.runCommand(async (s) => {
			await encounterRandomNpc(s, {
				table: ['rat'],
				followBy: [
					{ action: 'flagSet', arg: 'won', valid: { condition: 'ctxWasVictory' } },
					{
						action: async (s) => {
							await bossEncounter(s, 'boss', async () => {});
						}
					}
				]
			});
		});
		const attack = choice(state, 'Attack');
		const win = state.choose(attack);
		expect(await state.choose(attack)).toBe('busy');
		await win;
		expect(state.character.coin).toBe(60);
		expect(state.character.xp).toBe(7);
		expect(await state.choose(attack)).toBe('unavailable');
		await state.choose(choice(state, 'Leave'));
		expect(state.character.flags.has('won')).toBe(true);
		expect(state.character.counters.get('field:wins')).toBe(1);
		expect(state.npc.current?.id).toBe('boss');
		expect(state.npc.status).toBeUndefined();
		expect(state.choices.depth).toBe(2);
		expect(choice(state, 'Attack')).toBeDefined();
	});

	it('supplies a false encounter result to run continuations', async () => {
		const { encounterRandomNpc } = await import('../src/lib/games/encounter');
		const state = await session();
		await state.runCommand(async (s) => {
			await encounterRandomNpc(s, {
				table: ['rat'],
				followBy: [
					{
						action: 'branch',
						arg: {
							on: { condition: 'ctxWasVictory' },
							isTrue: [{ action: 'flagSet', arg: 'wrong' }],
							isFalse: [{ action: 'flagSet', arg: 'ran' }]
						}
					}
				]
			});
		});
		await state.choose(choice(state, 'Run'));
		expect(state.character.flags.has('ran')).toBe(true);
		expect(state.character.flags.has('wrong')).toBe(false);
		expect(state.npc.current).toBeUndefined();
		expect(state.choices.depth).toBe(1);
	});

	it('preserves a new encounter started in the old NPC exit hook', async () => {
		const { encounterRandomNpc, bossEncounter } = await import('../src/lib/games/encounter');
		const game = adventure();
		const exit = vi.fn(async (s: GameState) => {
			expect(s.npc.status).toBe('run');
			await bossEncounter(s, 'boss', async () => {});
		});
		game.npcTemplates[0].exit = exit;
		const state = await session(game);
		await state.runCommand(async (s) => {
			await encounterRandomNpc(s, { table: ['rat'] });
		});
		await state.choose(choice(state, 'Run'));
		expect(exit).toHaveBeenCalledOnce();
		expect(state.npc.current?.id).toBe('boss');
		expect(state.choices.depth).toBe(2);
	});

	it('publishes victory context to a boss callback before it finishes the encounter', async () => {
		const { bossEncounter, encounterFinish } = await import('../src/lib/games/encounter');
		const state = await session();
		await state.runCommand(async (s) => {
			await bossEncounter(s, 'rat', async (s) => {
				await s.resolveActions([
					{ action: 'flagSet', arg: 'boss-win', valid: { condition: 'ctxWasVictory' } }
				]);
				await encounterFinish(s, 'win');
			});
		});
		await state.choose(choice(state, 'Attack'));
		expect(state.character.flags.has('boss-win')).toBe(true);
		expect(state.npc.current).toBeUndefined();
	});

	it('cancels combat delay without a late NPC attack or a stranded menu frame', async () => {
		const { bossEncounter } = await import('../src/lib/games/encounter');
		const state = await session();
		await state.runCommand(async (s) => {
			await bossEncounter(s, 'boss', async () => {});
		});
		vi.useFakeTimers();
		const attack = state.choose(choice(state, 'Attack'));
		await vi.advanceTimersByTimeAsync(0);
		expect(state.npc.current?.hp).toBe(80);
		state.cancelCommand();
		expect(await attack).toBe('cancelled');
		await vi.advanceTimersByTimeAsync(1500);
		expect(state.character.hp).toBe(10);
		expect(state.choices.depth).toBe(2);
		expect(choice(state, 'Attack')).toBeDefined();
	});

	it('locks the entire combat turn through NPC retaliation', async () => {
		const { bossEncounter } = await import('../src/lib/games/encounter');
		const state = await session();
		await state.runCommand(async (s) => {
			await bossEncounter(s, 'boss', async () => {});
		});
		vi.spyOn(state, 'roll').mockImplementation((formula) => (formula === '20' ? 20 : 1));
		vi.useFakeTimers();
		const attackChoice = choice(state, 'Attack');
		const attack = state.choose(attackChoice);
		await vi.advanceTimersByTimeAsync(0);
		expect(await state.choose(attackChoice)).toBe('busy');
		expect(await state.useItem(await state.data.items.get('potion'))).toBe('busy');
		expect(await state.unequip('right')).toBe('busy');
		await vi.advanceTimersByTimeAsync(1500);
		expect(await attack).toBe('completed');
		expect(state.npc.current?.hp).toBe(80);
		expect(state.character.hp).toBe(9);
		expect(state.character.getInventoryCount('potion')).toBe(1);
		expect(state.busy).toBe(false);
	});

	it('keeps a new item prompt opened by pickup actions and rejects the old pickup', async () => {
		const state = await session();
		await state.runCommand([
			{
				action: 'itemFind',
				arg: {
					item: 'gem',
					takeActions: [{ action: 'itemFind', arg: { item: 'potion', takeActions: [] } }]
				}
			}
		]);
		const take = choice(state, 'Take it!');
		await state.choose(take);
		expect(state.character.getInventoryCount('gem')).toBe(1);
		expect(state.item.current?.id).toBe('potion');
		expect(state.item.depth).toBe(1);
		expect(state.choices.depth).toBe(2);
		expect(await state.choose(take)).toBe('unavailable');
	});

	it('cleans up a finished encounter even if its exit hook fails', async () => {
		const { encounterRandomNpc } = await import('../src/lib/games/encounter');
		const game = adventure();
		game.npcTemplates[0].exit = () => {
			throw new Error('Exit failed');
		};
		const state = await session(game);
		const next = vi.fn();
		await state.runCommand(async (s) => {
			await encounterRandomNpc(s, { table: ['rat'], followBy: next });
		});
		expect(await state.choose(choice(state, 'Run'))).toBe('failed');
		expect(state.npc.current).toBeUndefined();
		expect(state.choices.depth).toBe(1);
		expect(state.commandNotice).toContain('Exit failed');
		expect(next).not.toHaveBeenCalled();
	});

	it('awaits the real Morlin exit travel before finishing victory', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const { encounterRandomNpc } = await import('../src/lib/games/encounter');
		const state = await session(yearlings);
		await state.runCommand(async (s) => {
			await s.location.moveTo('yearlings/morlin-cave');
			await encounterRandomNpc(s, { table: ['yearlings/morlin'] });
		});
		vi.spyOn(state, 'roll').mockReturnValue(200);
		await state.choose(choice(state, 'Attack'));
		await state.choose(choice(state, 'Leave'));
		expect(state.character.flags.has('beat-morlin')).toBe(true);
		expect(state.location.current.id).toBe('yearlings/rocky-area');
		expect(state.npc.current).toBeUndefined();
		expect(state.choices.depth).toBe(1);
		expect(choice(state, 'Explore')).toBeDefined();
	});
});
