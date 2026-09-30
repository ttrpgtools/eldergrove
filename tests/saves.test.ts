import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCheckpoint } from '../src/lib/saves';
import type { GameDef } from '../src/lib/types';
import type { GameState } from '../src/lib/state/game.svelte';

function adventure(id = 'saves'): GameDef {
	return {
		id,
		contentVersion: 1,
		start: 'field',
		baseChar: {
			name: 'Hero',
			hp: 12,
			maxHp: 20,
			coin: 30,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 12,
			level: 2,
			inventory: [['potion', 3]],
			equip: [['sword', 'right']],
			flags: ['quest-started'],
			counters: [
				['wins', 3],
				['debt', -2]
			]
		},
		items: [
			{ id: 'sword', name: 'Sword', type: 'weapon', where: 'hand' },
			{ id: 'potion', name: 'Potion', type: 'consumable' }
		],
		locations: [
			{ id: 'field', name: 'Field', biome: 'meadow', desc: 'Original', choices: [] },
			{
				id: 'shop',
				name: 'Shop',
				biome: 'town',
				parent: 'field',
				choices: [],
				shop: [{ item: 'potion', cost: 10, stock: 5 }]
			}
		],
		npcTemplates: [{ id: 'rat', name: 'Rat', maxHp: 5, exp: 1 }],
		npcInstances: [{ id: 'boss', name: 'Boss', maxHp: 30, hp: 30, exp: 10 }]
	};
}

describe('checkpoints', () => {
	let storage: Map<string, string>;
	beforeEach(() => {
		vi.resetModules();
		storage = new Map();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key)
		});
		vi.stubGlobal('window', { location: { reload: vi.fn() } });
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('round-trips an unequipped character, inventory, flags, counters, and world state', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure();
		const state = await createGameState(game);
		await state.character.unequip('right');
		state.character.name = 'Changed hero';
		state.character.hp = 8;
		state.character.flags.add('boss-seen');
		state.character.counters.set('wins', 7);
		state.location.current.desc = 'Changed field';
		await state.npc.set('boss');
		state.npc.current!.hp = 0;
		state.npc.clear();
		await state.location.moveTo('shop');
		state.location.current.shop![0].stock = 2;
		state.message.set('A temporary conversation');
		state.choices.push([{ label: 'Temporary', actions: [] }]);
		expect(await state.save()).toBe(true);
		const raw = storage.get('gameSave:saves')!;
		expect(JSON.parse(raw)).toMatchObject({ version: 1, adventureId: 'saves', contentVersion: 1 });
		expect(JSON.parse(raw).character.equip).toEqual([]);
		const restored = await createGameState(game);
		expect(restored.character.toJSON()).toEqual(state.character.toJSON());
		expect(restored.location.current.id).toBe('shop');
		expect(restored.location.previous?.id).toBe('field');
		expect(restored.location.previous?.desc).toBe('Changed field');
		expect(restored.location.current.shop![0].stock).toBe(2);
		expect((await restored.data.npcs.get('boss')).hp).toBe(0);
		expect(restored.npc.current).toBeUndefined();
		expect(restored.item.current).toBeUndefined();
		expect(restored.message.text).toBeUndefined();
		expect(restored.choices.depth).toBe(1);
		expect(restored.choices.current).toEqual([]);
		expect(game.baseChar.name).toBe('Hero');
		expect(game.npcInstances[0].hp).toBe(30);
		expect(game.locations[1].shop![0].stock).toBe(5);
	});

	it('round-trips occupied equipment and keeps adventures independent across reloads', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const first = await createGameState(adventure('first'));
		const second = await createGameState(adventure('second'));
		first.character.coin = 17;
		second.character.coin = 99;
		await first.save();
		await second.save();
		expect((await createGameState(adventure('first'))).character.coin).toBe(17);
		const restored = await createGameState(adventure('second'));
		expect(restored.character.coin).toBe(99);
		expect(restored.character.gear.right?.id).toBe('sword');
	});

	it('migrates legacy empty slots without rewriting the checkpoint until a successful save', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure();
		const raw = JSON.stringify({
			character: { ...game.baseChar, equip: [['', 'right']] },
			location: 'shop'
		});
		storage.set('gameSave:saves', raw);
		const restored = await createGameState(game);
		expect(restored.character.gear.right).toBeUndefined();
		expect(restored.character.coin).toBe(30);
		expect(restored.location.current.id).toBe('shop');
		expect(storage.get('gameSave:saves')).toBe(raw);
		expect(await restored.save()).toBe(true);
		expect(JSON.parse(storage.get('gameSave:saves')!).version).toBe(1);
	});

	it('restores without replaying entry rewards, prompts, or exit counter resets', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure();
		const enter = vi.fn((state: GameState) => {
			state.character.coin += 5;
			state.choices.push([]);
		});
		const exit = vi.fn((state: GameState) => {
			state.character.counters.set('wins', 0);
		});
		game.locations[0].enter = enter;
		game.locations[0].exit = exit;
		const first = await createGameState(game);
		expect(enter).toHaveBeenCalledOnce();
		await first.save();
		const restored = await createGameState(game);
		expect(enter).toHaveBeenCalledOnce();
		expect(exit).not.toHaveBeenCalled();
		expect(restored.character.coin).toBe(35);
		expect(restored.character.counters.get('wins')).toBe(3);
		expect(restored.choices.depth).toBe(1);
	});

	it.each([
		['corrupt JSON', '{oops'],
		['wrong shape', JSON.stringify({ character: [] })],
		['missing location', JSON.stringify({ character: adventure().baseChar, location: 'removed' })],
		[
			'missing item',
			JSON.stringify({
				character: { ...adventure().baseChar, inventory: [['removed', 1]] },
				location: 'field'
			})
		],
		[
			'invalid health',
			JSON.stringify({ character: { ...adventure().baseChar, hp: null }, location: 'field' })
		]
	])('preserves %s and allows play without overwriting it', async (_, raw) => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		storage.set('gameSave:saves', raw);
		const state = await createGameState(adventure());
		expect(state.character.name).toBe('Hero');
		expect(state.location.current.id).toBe('field');
		expect(state.saveNotice).toBeTruthy();
		expect(await state.save()).toBe(false);
		expect(storage.get('gameSave:saves')).toBe(raw);
		await state.reset();
		expect(storage.has('gameSave:saves')).toBe(false);
		expect(window.location.reload).toHaveBeenCalledOnce();
	});

	it('rejects unsupported formats, wrong adventures, and changed content versions', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure();
		const save = (await createGameState(game)).toJSON();
		for (const change of [{ version: 2 }, { adventureId: 'other' }, { contentVersion: 2 }]) {
			const raw = JSON.stringify({ ...save, ...change });
			storage.set('gameSave:saves', raw);
			const state = await createGameState(game);
			expect(state.saveNotice).toBeTruthy();
			expect(await state.save()).toBe(false);
			expect(storage.get('gameSave:saves')).toBe(raw);
		}
		expect(() =>
			parseCheckpoint(JSON.stringify({ character: game.baseChar, location: 'field' }), {
				...game,
				contentVersion: 2
			})
		).toThrow(/version/);
	});

	it.each([
		['coin', -1],
		['level', 0],
		['hp', 21],
		['maxHp', 0],
		['str', 1.5],
		['xp', Number.MAX_SAFE_INTEGER + 1],
		['flags', null],
		['counters', [['a', 0.5]]],
		['equip', [['sword', 'unknown']]],
		['inventory', [['potion', 0]]]
	])('rejects invalid character field %s', (field, value) => {
		const game = adventure();
		const raw = JSON.stringify({
			character: { ...game.baseChar, [field]: value },
			location: 'field'
		});
		expect(() => parseCheckpoint(raw, game)).toThrow();
	});

	it('rejects obsolete world references and invalid NPC health or shop layouts', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure();
		const save = (await createGameState(game)).toJSON();
		for (const world of [
			{ locations: [{ id: 'removed', desc: null }], npcs: [] },
			{ locations: [], npcs: [{ id: 'rat', hp: 3 }] },
			{ locations: [], npcs: [{ id: 'boss', hp: 31 }] },
			{ locations: [{ id: 'shop', desc: null, stock: [] }], npcs: [] },
			{ locations: [{ id: 'shop', desc: null, stock: [-1] }], npcs: [] }
		])
			expect(() => parseCheckpoint(JSON.stringify({ ...save, world }), game)).toThrow();
		expect(() =>
			parseCheckpoint(JSON.stringify({ ...save, previousLocation: 'removed' }), game)
		).toThrow();
	});

	it('allows play when storage access is denied and does not claim a successful save or reset', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		vi.stubGlobal('localStorage', {
			getItem() {
				throw new Error('Storage denied.');
			},
			removeItem() {
				throw new Error('Storage denied.');
			}
		});
		const state = await createGameState(adventure());
		expect(state.character.name).toBe('Hero');
		expect(state.saveNotice).toMatch(/protected/);
		expect(await state.save()).toBe(false);
		await state.reset();
		expect(window.location.reload).not.toHaveBeenCalled();
		expect(state.saveNotice).toMatch(/could not be removed/);
	});

	it('handles an unavailable storage getter', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get() {
				throw new Error('Storage unavailable.');
			}
		});
		try {
			const state = await createGameState(adventure());
			expect(state.saveNotice).toBeTruthy();
			expect(await state.save()).toBe(false);
		} finally {
			Object.defineProperty(globalThis, 'localStorage', original!);
		}
	});

	it('keeps the previous checkpoint on quota errors and permits a later retry', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const state = await createGameState(adventure());
		expect(await state.save()).toBe(true);
		const original = storage.get('gameSave:saves');
		state.character.coin = 7;
		const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
			throw new Error('Quota exceeded');
		});
		expect(await state.save()).toBe(false);
		expect(storage.get('gameSave:saves')).toBe(original);
		expect(state.saveNotice).toBeTruthy();
		write.mockRestore();
		expect(await state.save()).toBe(true);
		expect(state.saveNotice).toBeUndefined();
		expect(JSON.parse(storage.get('gameSave:saves')!).character.coin).toBe(7);
	});

	it('protects a newer checkpoint written by another session', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const first = await createGameState(adventure());
		const second = await createGameState(adventure());
		second.character.coin = 100;
		await second.save();
		const newer = storage.get('gameSave:saves');
		expect(await first.save()).toBe(false);
		expect(first.saveNotice).toMatch(/another session/);
		expect(storage.get('gameSave:saves')).toBe(newer);
	});

	it('refuses transient combat/item saves and invalid runtime numbers', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const state = await createGameState(adventure());
		await state.save();
		const original = storage.get('gameSave:saves');
		await state.npc.set('rat');
		expect(await state.save()).toBe(false);
		state.npc.clear();
		state.item.push(await state.data.items.get('potion'));
		expect(await state.save()).toBe(false);
		state.item.clear();
		state.character.hp = NaN;
		expect(await state.save()).toBe(false);
		expect(storage.get('gameSave:saves')).toBe(original);
	});

	it('refunds the Yearlings save fee and reports failure when storage cannot write', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.resolveActions([{ action: 'locationChange', arg: 'yearlings/pylaim/inn' }]);
		const before = state.character.coin;
		await state.resolveActions(
			state.choices.current!.find((choice) => choice.label === 'Save Game')!.actions
		);
		vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
			throw new Error('Quota exceeded');
		});
		await state.resolveActions(state.choices.current![0].actions);
		expect(state.character.coin).toBe(before);
		expect(state.message.text).toMatch(/not been charged/);
		expect(state.choices.depth).toBe(1);
		expect(storage.has('gameSave:yearlings')).toBe(false);
	});

	it('stores the charged Yearlings checkpoint and restores the inn without its confirmation prompt', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.resolveActions([{ action: 'locationChange', arg: 'yearlings/pylaim/inn' }]);
		const before = state.character.coin;
		await state.resolveActions(
			state.choices.current!.find((choice) => choice.label === 'Save Game')!.actions
		);
		await state.resolveActions(state.choices.current![0].actions);
		expect(state.character.coin).toBe(before - 5);
		expect(state.message.text).toMatch(/warm glow/);
		const restored = await createGameState(yearlings);
		expect(restored.character.coin).toBe(before - 5);
		expect(restored.location.current.id).toBe('yearlings/pylaim/inn');
		expect(restored.location.previous?.id).toBe('yearlings/grassy-field');
		expect(restored.choices.current?.some((choice) => choice.label === 'Yes')).toBe(false);
	});
});
