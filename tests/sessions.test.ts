import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameDef } from '../src/lib/types';
import type { GameState } from '../src/lib/state/game.svelte';

function adventure(id: string): GameDef {
	return {
		id,
		start: 'start',
		baseChar: {
			name: id,
			maxHp: 10,
			coin: 30,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			inventory: [],
			equip: []
		},
		locations: [
			{ id: 'start', name: `${id} start`, biome: 'meadow', choices: [{ label: id, actions: [] }] },
			{ id: 'next', name: `${id} next`, biome: 'forest', choices: [] }
		],
		items: [],
		npcTemplates: [],
		npcInstances: [{ id: 'boss', name: 'Boss', maxHp: 20, hp: 20, exp: 10 }]
	};
}

describe('adventure sessions', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.doUnmock('$app/environment');
		const storage = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key)
		});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	it('switches Yearlings → Discovery → Yearlings and preserves separate progress', async () => {
		const { getGameState } = await import('../src/lib/state/game.svelte');
		const { yearlings } = await import('../src/lib/games/yearlings');
		const { discovery } = await import('../src/lib/games/discovery');
		const first = await getGameState(yearlings);
		first.character.coin = 123;
		await first.location.moveTo('yearlings/pylaim');
		const second = await getGameState(discovery);
		expect(second.id).toBe('discovery');
		expect(second.location.current.id).toBe('opening');
		expect(second.character.coin).toBe(30);
		expect(second.character.gear.right?.id).toBe('rusty-dagger');
		expect(second.character).not.toBe(first.character);
		expect(second.location).not.toBe(first.location);
		expect(second.npc).not.toBe(first.npc);
		expect(second.data).not.toBe(first.data);
		expect(await getGameState(yearlings)).toBe(first);
		expect(first.character.coin).toBe(123);
		expect(first.location.current.id).toBe('yearlings/pylaim');
		await first.save();
		await second.save();
		expect(JSON.parse(localStorage.getItem('gameSave:yearlings')!).character.coin).toBe(123);
		expect(JSON.parse(localStorage.getItem('gameSave:discovery')!).character.coin).toBe(30);
	});

	it('deduplicates simultaneous initialization and waits for entry actions', async () => {
		const { getGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure('concurrent');
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		const enter = vi.fn(async (state: GameState) => {
			await gate;
			state.character.flags.add('ready');
		});
		game.locations[0].enter = enter;
		const first = getGameState(game);
		const second = getGameState(game);
		await vi.waitFor(() => expect(enter).toHaveBeenCalledOnce());
		let settled = false;
		void first.then(() => (settled = true));
		expect(settled).toBe(false);
		release();
		const [a, b] = await Promise.all([first, second]);
		expect(a).toBe(b);
		expect(a.character.flags.has('ready')).toBe(true);
		expect(a.choices.current?.[0].label).toBe('concurrent');
	});

	it('does not retain failed sessions or partial manager state', async () => {
		const { getGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure('retry');
		game.locations[0].enter = () => {
			throw new Error('Entry failed');
		};
		await expect(getGameState(game)).rejects.toThrow('Entry failed');
		game.locations[0].enter = (state) => {
			state.character.flags.add('retried');
		};
		const recovered = await getGameState(game);
		expect(recovered.character.flags.has('retried')).toBe(true);
		expect(recovered.location.current.id).toBe('start');
	});

	it('restores a private checkpoint without changing the definition or replaying exit hooks', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure('saved');
		const exit = vi.fn();
		game.locations[1].exit = exit;
		localStorage.setItem(
			'gameSave:saved',
			JSON.stringify({
				character: { ...game.baseChar, name: 'Saved hero', coin: 17, counters: [['streak', 3]] },
				location: 'next'
			})
		);
		const state = await createGameState(game);
		expect(state.character.name).toBe('Saved hero');
		expect(state.character.coin).toBe(17);
		expect(state.character.counters.get('streak')).toBe(3);
		expect(state.location.current.id).toBe('next');
		expect(state.location.previous).toBeUndefined();
		expect(exit).not.toHaveBeenCalled();
		expect(game.start).toBe('start');
		expect(game.baseChar.name).toBe('saved');
		expect(game.baseChar.coin).toBe(30);
	});

	it('isolates mutable locations and named NPCs between fresh sessions', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure('fresh');
		const first = await createGameState(game);
		await first.npc.set('boss');
		first.npc.current!.hp = 1;
		first.location.current.desc = 'Changed';
		const second = await createGameState(game);
		await second.npc.set('boss');
		expect(second.npc.current!.hp).toBe(20);
		expect(second.location.current.desc).toBeUndefined();
		expect(game.npcInstances[0].hp).toBe(20);
		expect(game.locations[0].desc).toBeUndefined();
	});

	it('does not share cached sessions when called outside the browser', async () => {
		vi.doMock('$app/environment', () => ({ browser: false }));
		const { getGameState } = await import('../src/lib/state/game.svelte');
		const game = adventure('server');
		const first = await getGameState(game);
		first.character.coin = 999;
		const second = await getGameState(game);
		expect(second).not.toBe(first);
		expect(second.character.coin).toBe(30);
	});

	it('finishes location exit and entry actions before completing a transition', async () => {
		const { createGameState } = await import('../src/lib/state/game.svelte');
		const { locationChange } = await import('../src/lib/actions/location');
		const game = adventure('travel');
		const order: string[] = [];
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		game.locations[0].exit = async (state) => {
			order.push(`exit:${state.location.current.id}`);
			await gate;
			order.push(`exit-done:${state.location.current.id}`);
		};
		game.locations[1].enter = async (state) => {
			await Promise.resolve();
			order.push(`enter:${state.location.current.id}`);
		};
		const state = await createGameState(game);
		const moving = locationChange(state, 'next');
		await vi.waitFor(() => expect(order).toEqual(['exit:start']));
		expect(state.location.current.id).toBe('start');
		release();
		await moving;
		expect(order).toEqual(['exit:start', 'exit-done:start', 'enter:next']);
		expect(state.location.previous?.id).toBe('start');
	});
});
