import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState, getGameState } from '../src/lib/state/game.svelte';
import { readSaveSlots, saveSlotKey } from '../src/lib/save-slots';
import type { GameDef } from '../src/lib/types';

function adventure(id = 'slots'): GameDef {
	return {
		id,
		start: 'field',
		baseChar: {
			name: 'Hero',
			maxHp: 20,
			coin: 100,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			inventory: [],
			equip: []
		},
		items: [{ id: 'gem', name: 'Gem', type: 'trinket' }],
		locations: [
			{
				id: 'field',
				name: 'Field',
				biome: 'meadow',
				choices: [{ label: 'Wait', actions: [{ action: 'coinsAdd', arg: 10 }] }]
			},
			{
				id: 'inn',
				name: 'Inn',
				biome: 'town',
				choices: [],
				shop: [{ item: 'gem', cost: 5, stock: 3 }]
			}
		],
		npcTemplates: [],
		npcInstances: [{ id: 'boss', name: 'Boss', maxHp: 30, hp: 30, exp: 10 }]
	};
}

beforeEach(() => {
	const values = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: vi.fn()
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('five save slots', () => {
	it('round-trips five independent characters and world states, including timestamps', async () => {
		const game = adventure();
		const state = await createGameState(game, { slot: null });
		await state.location.moveTo('inn');
		for (let slot = 1; slot <= 5; slot++) {
			state.character.name = `Hero ${slot}`;
			state.character.coin = slot * 100;
			state.location.current.shop![0].stock = slot;
			(await state.data.npcs.get('boss')).hp = slot;
			expect(await state.save(slot)).toBe(true);
		}
		const saves = readSaveSlots(game);
		expect(saves).toHaveLength(5);
		for (const slot of saves) {
			expect(slot.checkpoint?.character.name).toBe(`Hero ${slot.number}`);
			expect(slot.savedAt).toBeDefined();
			expect(await state.loadSlot(slot.number, slot.raw)).toBe('completed');
			expect(state.character.coin).toBe(slot.number * 100);
			expect(state.location.current.shop![0].stock).toBe(slot.number);
			expect((await state.data.npcs.get('boss')).hp).toBe(slot.number);
			expect(state.activeSlot).toBe(slot.number);
			expect(state.mode).toBe('exploration');
		}
	});

	it('shows the original checkpoint as slot one and prompts on first browser entry', async () => {
		const game = adventure('startup-slots');
		const original = await createGameState(game);
		original.character.name = 'Existing hero';
		await original.save();
		const raw = localStorage.getItem('gameSave:startup-slots');
		const state = await getGameState(game);
		expect(state.saveDialog).toMatchObject({ kind: 'load', startup: true });
		expect(state.saveDialog?.slots[0].checkpoint?.character.name).toBe('Existing hero');
		expect(state.saveDialog?.slots.slice(1).every((slot) => slot.raw === null)).toBe(true);
		expect(await state.loadSlot(1)).toBe('completed');
		expect(state.character.name).toBe('Existing hero');
		expect(await getGameState(game)).toBe(state);
		expect(localStorage.getItem('gameSave:startup-slots')).toBe(raw);
	});

	it('preserves saves when starting over and does not replay entry rewards when loading', async () => {
		const game = adventure();
		game.locations[0].enter = (state) => {
			state.character.coin += 10;
		};
		const state = await createGameState(game);
		expect(state.character.coin).toBe(110);
		await state.save(4);
		const raw = localStorage.getItem(saveSlotKey(game.id, 4));
		const oldChoice = state.availableChoices[0];
		state.character.coin = 1;
		expect(await state.loadSlot(4)).toBe('completed');
		expect(state.character.coin).toBe(110);
		expect(await state.choose(oldChoice)).toBe('unavailable');
		await state.newGame();
		expect(state.character.coin).toBe(110);
		expect(state.activeSlot).toBeNull();
		expect(localStorage.getItem(saveSlotKey(game.id, 4))).toBe(raw);
		expect(localStorage.removeItem).not.toHaveBeenCalled();
	});

	it('returns from death and victory to a chosen checkpoint without reloading', async () => {
		const state = await createGameState(adventure());
		await state.save(3);
		await state.die();
		expect(state.saveDialog?.kind).toBe('load');
		expect(await state.loadSlot(3)).toBe('completed');
		expect(state.character.hp).toBe(20);
		expect(state.item.depth).toBe(0);
		await state.die();
		expect(state.mode).toBe('death');
		await state.loadSlot(3);
		state.showVictory({ choices: [] });
		expect(state.mode).toBe('victory');
		await state.choose(
			state.availableChoices.find((choice) => choice.label === 'Load a saved game')!
		);
		expect(state.saveDialog?.kind).toBe('load');
		await state.loadSlot(3);
		expect(state.mode).toBe('exploration');
		expect(state.saveDialog).toBeUndefined();
	});

	it('offers loading a save from the actual Yearlings victory scene', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.location.moveTo('yearlings/pylaim/inn');
		await state.save(2);
		await state.runCommand([{ action: 'locationChange', arg: 'yearlings/victory' }]);
		expect(state.mode).toBe('victory');
		await state.choose(
			state.availableChoices.find((choice) => choice.label === 'Load a saved game')!
		);
		await state.loadSlot(2);
		expect(state.location.current.id).toBe('yearlings/pylaim/inn');
		expect(state.mode).toBe('exploration');
	});

	it('protects changes in another tab and charges no fee until a successful write', async () => {
		const game = adventure();
		const first = await createGameState(game);
		first.requestSave(5);
		const selected = first.saveDialog!.slots[1];
		const second = await createGameState(game);
		second.character.coin = 77;
		await second.save(2);
		const newer = localStorage.getItem(saveSlotKey(game.id, 2));
		expect(await first.save(2, selected.raw, 5)).toBe(false);
		expect(first.character.coin).toBe(100);
		expect(localStorage.getItem(saveSlotKey(game.id, 2))).toBe(newer);
		first.requestSave(5);
		expect(await first.save(2, first.saveDialog!.slots[1].raw, 5)).toBe(true);
		expect(first.character.coin).toBe(95);
		expect(readSaveSlots(game)[1].checkpoint?.character.coin).toBe(95);
	});

	it('leaves the current session and stored data intact when a selected save is invalid or changed', async () => {
		const game = adventure();
		const state = await createGameState(game);
		localStorage.setItem(saveSlotKey(game.id, 2), '{broken');
		state.requestLoad();
		expect(state.saveDialog?.slots[1].error).toBeDefined();
		expect(await state.loadSlot(2)).toBe('failed');
		expect(state.character.coin).toBe(100);
		expect(localStorage.getItem(saveSlotKey(game.id, 2))).toBe('{broken');
		expect(await state.loadSlot(5)).toBe('failed');
		expect(await state.loadSlot(0)).toBe('failed');
		state.saveDialog = undefined;
		await state.save(3);
		state.requestLoad();
		const selected = state.saveDialog!.slots[2];
		localStorage.setItem(saveSlotKey(game.id, 3), '{changed');
		expect(await state.loadSlot(3, selected.raw)).toBe('failed');
		expect(state.character.coin).toBe(100);
	});

	it('keeps failed saves and unsaved progress, and refunds the inn fee', async () => {
		const state = await createGameState(adventure());
		await state.save(1);
		const original = localStorage.getItem(saveSlotKey(state.id, 1));
		state.character.coin = 70;
		state.requestSave(5);
		vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
			throw new Error('Quota exceeded');
		});
		expect(await state.save(1, original, 5)).toBe(false);
		expect(state.character.coin).toBe(70);
		expect(state.saveDialog?.kind).toBe('save');
		expect(localStorage.getItem(saveSlotKey(state.id, 1))).toBe(original);
	});
});
