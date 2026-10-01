import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState, type GameState } from '../src/lib/state/game.svelte';
import { locationChange } from '../src/lib/actions/location';
import { action } from '../src/lib/authoring';
import { validateAdventure } from '../src/lib/content';
import type { GameDef } from '../src/lib/types';

function adventure(): GameDef {
	return {
		id: 'interactions',
		start: 'field',
		rules: { combat: { retaliationDelay: 0, npcAttack: '3' } },
		baseChar: {
			name: 'Hero',
			maxHp: 20,
			hp: 10,
			coin: 20,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			inventory: [
				['bomb', 3],
				['potion', 3]
			],
			equip: []
		},
		locations: [
			{ id: 'field', name: 'Field', biome: 'meadow', choices: [] },
			{
				id: 'town',
				name: 'Town',
				biome: 'town',
				choices: [],
				shop: [{ item: 'potion', stock: 2, cost: 5 }]
			}
		],
		items: [
			{ id: 'bomb', name: 'Bomb', type: 'consumable', effects: [{ action: 'npcDamage', arg: 20 }] },
			{ id: 'potion', name: 'Potion', type: 'consumable', effects: [{ action: 'hpHeal', arg: 5 }] }
		],
		npcTemplates: [{ id: 'rat', name: 'Rat', maxHp: 10, exp: 7, coins: 2 }],
		npcInstances: [{ id: 'boss', name: 'Boss', hp: 50, maxHp: 50, exp: 10, coins: 4 }]
	};
}
function choice(state: GameState, label: string) {
	const choice = state.availableChoices.find((choice) => choice.label === label);
	expect(choice, `Missing choice ${label}`).toBeDefined();
	return choice!;
}
async function use(state: GameState, id: string) {
	return state.useItem(await state.data.items.get(id));
}
beforeEach(() => {
	vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('interaction ownership and presentation', () => {
	it('owns nested scenes and restores the previous mode when a prompt closes', async () => {
		const state = await createGameState(adventure());
		expect(state.mode).toBe('exploration');
		const outer = state.requestDialog({
			presentation: { title: 'A stranger', description: 'Hello' },
			choices: [{ label: 'Stay', actions: [] }]
		});
		const inner = state.requestDialog({
			presentation: { title: 'Question' },
			choices: [{ label: 'Answer', actions: [] }]
		});
		expect(state.mode).toBe('conversation');
		expect(state.scene.name).toBe('Question');
		await state.choose(choice(state, 'Answer'));
		expect(inner.active).toBe(false);
		expect(outer.active).toBe(true);
		expect(state.scene.name).toBe('A stranger');
		outer.close();
		expect(state.mode).toBe('exploration');
		expect(state.item.depth).toBe(0);
	});
	it('preserves a new dialog opened by an old dialog response', async () => {
		const state = await createGameState(adventure());
		state.requestChoices([
			{
				label: 'Continue',
				actions: async (state) => {
					state.requestDialog({
						presentation: { title: 'Next' },
						choices: [{ label: 'Done', actions: [] }]
					});
				}
			}
		]);
		const old = choice(state, 'Continue');
		await state.choose(old);
		expect(state.scene.name).toBe('Next');
		expect(state.choices.depth).toBe(2);
		expect(await state.choose(old)).toBe('unavailable');
	});
	it('invalidates old handles, prompts, scenes and encounters on travel', async () => {
		const state = await createGameState(adventure());
		await state.requestEncounter({ npc: 'boss' });
		const frame = state.requestDialog({
			presentation: { title: 'Old' },
			choices: [{ label: 'Old', actions: [action('flagSet', 'stale')] }]
		});
		const old = choice(state, 'Old');
		await state.runCommand(async (state) => {
			await locationChange(state, 'town');
		});
		expect(frame.active).toBe(false);
		expect(state.mode).toBe('exploration');
		expect(state.npc.current).toBeUndefined();
		expect(state.item.depth).toBe(0);
		expect(state.choices.depth).toBe(1);
		expect(await state.choose(old)).toBe('unavailable');
	});
	it('models shops and confirmations, restores shop mode, and blocks inventory effects', async () => {
		const state = await createGameState(adventure());
		await state.runCommand(async (state) => {
			await locationChange(state, 'town');
			await state.requestTrade();
		});
		expect(state.mode).toBe('shop');
		await use(state, 'potion');
		expect(state.character.hp).toBe(10);
		await state.choose(choice(state, 'Potion (5)'));
		expect(state.mode).toBe('conversation');
		expect(state.scene.id).toBe('potion');
		await state.choose(choice(state, 'Yes'));
		expect(state.mode).toBe('shop');
		expect(state.item.depth).toBe(0);
		expect(state.character.coin).toBe(15);
		await state.choose(choice(state, 'No Thanks'));
		expect(state.mode).toBe('exploration');
		expect(state.choices.depth).toBe(1);
	});
	it('returns to exploration after an empty shop prompt', async () => {
		const state = await createGameState(adventure());
		await state.requestTrade();
		expect(state.mode).toBe('conversation');
		await state.choose(choice(state, 'OK'));
		expect(state.mode).toBe('exploration');
		expect(state.choices.depth).toBe(1);
	});
	it('renders a persistent victory scene without component dependencies', async () => {
		const state = await createGameState(adventure());
		state.showVictory({
			presentation: { title: 'You win', description: 'Peace returns', image: '/img/win.webp' },
			choices: [{ label: 'Credits', actions: [] }]
		});
		expect(state.mode).toBe('victory');
		expect(state.scene.name).toBe('You win');
		await state.choose(choice(state, 'Credits'));
		expect(state.mode).toBe('victory');
		await use(state, 'potion');
		expect(state.character.hp).toBe(10);
		expect(await state.save()).toBe(false);
	});
	it('keeps the real Yearlings ending in victory mode', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.runCommand(async (state) => {
			await locationChange(state, 'yearlings/victory');
		});
		expect(state.mode).toBe('victory');
		expect(state.scene.id).toBe('yearlings/victory');
	});
	it('validates declarative dialog and encounter continuations before play', () => {
		const game = adventure();
		game.locations[0].choices = [
			{
				label: 'Bad',
				actions: [
					action('encounterStart', {
						npc: 'missing',
						onVictory: [action('locationChange', 'missing')]
					}),
					action('dialogStart', {
						presentation: { title: 'Broken', image: 'javascript:alert(1)' },
						choices: [{ label: 'Bad', actions: [action('inventoryAdd', 'missing')] }]
					})
				]
			}
		];
		expect(() => validateAdventure(game)).toThrow('Unknown referenced ID');
	});
});

describe('item combat turns', () => {
	it('keeps Kamul immune to the real Yearlings bomb', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings, { random: (min) => min });
		await state.character.addToInventory('yearlings/bomb');
		await state.requestEncounter({ npc: 'yearlings/kamul' });
		expect(await use(state, 'yearlings/bomb')).toBe('completed');
		expect(state.npc.current?.hp).toBe(180);
		expect(state.mode).toBe('combat');
	});
	it('rejects an invalid encounter without damaging the existing interaction', async () => {
		const state = await createGameState(adventure());
		await state.requestEncounter({ npc: 'boss' });
		expect(await state.runCommand([action('encounterStart', { npc: 'missing' })])).toBe('failed');
		expect(state.npc.current?.id).toBe('boss');
		expect(state.mode).toBe('combat');
		expect(choice(state, 'Attack')).toBeDefined();
	});
	it('clears prompts opened by an effect before showing terminal combat victory', async () => {
		const game = adventure();
		game.items[0].effects = [
			action('npcDamage', 20),
			action('dialogStart', {
				presentation: { title: 'Leftover' },
				choices: [{ label: 'Old', actions: [] }]
			})
		];
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'rat' });
		await use(state, 'bomb');
		expect(state.mode).toBe('victory');
		expect(state.item.depth).toBe(0);
		expect(state.availableChoices.map((choice) => choice.label)).toEqual(['Leave']);
	});
	it('resolves a bomb kill immediately and grants rewards once without retaliation', async () => {
		const state = await createGameState(adventure());
		await state.requestEncounter({ npc: 'rat' });
		expect(await use(state, 'bomb')).toBe('completed');
		expect(state.mode).toBe('victory');
		expect(state.character.hp).toBe(10);
		expect(state.character.xp).toBe(7);
		expect(state.character.coin).toBe(22);
		expect(state.character.getInventoryCount('bomb')).toBe(2);
		await use(state, 'bomb');
		expect(state.character.getInventoryCount('bomb')).toBe(2);
		expect(state.character.xp).toBe(7);
		await state.choose(choice(state, 'Leave'));
		expect(state.mode).toBe('exploration');
		expect(state.npc.current).toBeUndefined();
		expect(state.character.counters.get('field:wins')).toBe(1);
	});
	it('lets defence reject bomb damage and retaliates exactly once', async () => {
		const game = adventure();
		game.npcInstances[0].defend = () => 0;
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'boss' });
		await use(state, 'bomb');
		expect(state.npc.current?.hp).toBe(50);
		expect(state.character.hp).toBe(7);
		expect(state.mode).toBe('combat');
	});
	it('healing consumes one combat turn', async () => {
		const state = await createGameState(adventure());
		await state.requestEncounter({ npc: 'boss' });
		await use(state, 'potion');
		expect(state.character.hp).toBe(12);
		expect(state.character.getInventoryCount('potion')).toBe(2);
	});
	it.each(['free', 'forbidden'] as const)('honors the %s combat policy', async (policy) => {
		const game = adventure();
		game.items[1].combatUse = policy;
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'boss' });
		await use(state, 'potion');
		expect(state.character.hp).toBe(policy === 'free' ? 15 : 10);
		expect(state.character.getInventoryCount('potion')).toBe(policy === 'free' ? 2 : 3);
	});
	it('marks item-triggered boss victory before the callback and preserves its follow-up', async () => {
		const game = adventure();
		game.npcInstances[0].hp = 10;
		const state = await createGameState(game);
		await state.requestEncounter({
			npc: 'boss',
			onVictory: async (state, ctx) => {
				expect(ctx.encounterVictory).toBe(true);
				await state.resolveActions([action('flagSet', 'won')]);
				await locationChange(state, 'town');
				await state.requestEncounter({ npc: 'rat' });
			}
		});
		await use(state, 'bomb');
		expect(state.character.flags.has('won')).toBe(true);
		expect(state.npc.current?.id).toBe('rat');
		expect(state.mode).toBe('combat');
		expect(state.character.hp).toBe(10);
		expect(state.choices.depth).toBe(2);
	});
	it('cleans up combat and item prompts when retaliation kills the player', async () => {
		const state = await createGameState(adventure());
		state.character.hp = 1;
		await state.requestEncounter({ npc: 'boss' });
		await use(state, 'bomb');
		expect(state.mode).toBe('death');
		expect(state.npc.current).toBeUndefined();
		expect(state.item.depth).toBe(1);
		expect(state.scene.id).toBe('engine/death');
		expect(state.availableChoices.map((choice) => choice.label)).toEqual([
			'Return to checkpoint',
			'Start over'
		]);
	});
	it('detects lethal item effects outside combat', async () => {
		const game = adventure();
		game.items[1].effects = [action('hpDamage', 30)];
		const state = await createGameState(game);
		await use(state, 'potion');
		expect(state.mode).toBe('death');
		expect(state.character.hp).toBe(0);
	});
	it('defers one retaliation until an item continuation finishes, preserving roll context', async () => {
		const game = adventure();
		game.items[1].effects = [
			action('diceRoll', '5'),
			action('dialogStart', {
				choices: [{ label: 'Heal', actions: [action('hpHeal', { from: 'rollResult' })] }]
			})
		];
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'boss' });
		await use(state, 'potion');
		expect(state.mode).toBe('conversation');
		expect(state.character.hp).toBe(10);
		const heal = choice(state, 'Heal');
		await use(state, 'potion');
		expect(state.character.getInventoryCount('potion')).toBe(2);
		await state.choose(heal);
		expect(state.mode).toBe('combat');
		expect(state.character.hp).toBe(12);
		expect(await state.choose(heal)).toBe('unavailable');
		expect(state.character.hp).toBe(12);
	});
	it('resolves an item continuation kill without retaliation or stranded prompts', async () => {
		const game = adventure();
		game.items[0].effects = [
			action('dialogStart', { choices: [{ label: 'Throw', actions: [action('npcDamage', 20)] }] })
		];
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'rat' });
		await use(state, 'bomb');
		await state.choose(choice(state, 'Throw'));
		expect(state.mode).toBe('victory');
		expect(state.item.depth).toBe(0);
		expect(state.character.hp).toBe(10);
		expect(state.character.xp).toBe(7);
	});
	it('retains consumed items and completed damage if a retaliation delay is cancelled', async () => {
		vi.useFakeTimers();
		const game = adventure();
		game.rules!.combat!.retaliationDelay = 5000;
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'boss' });
		const pending = use(state, 'bomb');
		await vi.waitFor(() => expect(state.npc.current?.hp).toBe(30));
		expect(state.busy).toBe(true);
		state.cancelCommand();
		expect(await pending).toBe('cancelled');
		expect(state.character.hp).toBe(10);
		expect(state.character.getInventoryCount('bomb')).toBe(2);
		expect(state.mode).toBe('combat');
	});
	it('preserves recovery after a failed item effect and refuses duplicate victory rewards', async () => {
		const game = adventure();
		game.items[0].effects = async (state) => {
			state.npc.current!.hp = 0;
			throw new Error('effect failed');
		};
		const state = await createGameState(game);
		await state.requestEncounter({ npc: 'rat' });
		expect(await use(state, 'bomb')).toBe('failed');
		expect(state.mode).toBe('victory');
		expect(state.character.xp).toBe(7);
		await use(state, 'bomb');
		expect(state.character.xp).toBe(7);
	});
});
