import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState, type GameState } from '../src/lib/state/game.svelte';
function adventure(): GameDef {
	return {
		id: 'polish',
		start: 'start',
		baseChar: {
			name: 'Hero',
			maxHp: 20,
			coin: 20,
			str: 3,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			equip: [],
			inventory: [['potion', 1]]
		},
		locations: [{ id: 'start', name: 'Start', biome: 'meadow', choices: [] }],
		items: [],
		npcTemplates: [{ id: 'rat', name: 'Rat', maxHp: 10, exp: 1 }],
		npcInstances: []
	};
}
import { purchasePrice, sellingPrice } from '../src/lib/trade';
import { resolveRules } from '../src/lib/rules';
import { npcLoot } from '../src/lib/actions/npc';
import { validateAdventure } from '../src/lib/content';
import { Messanger } from '../src/lib/state/messanger.svelte';
import type { GameDef } from '../src/lib/types';

beforeEach(() => {
	const values = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key)
	});
});
function choice(state: GameState, label: string) {
	const found = state.availableChoices.find((choice) => choice.label === label);
	expect(found, `Missing choice ${label}`).toBeDefined();
	return found!;
}
function shopGame(): GameDef {
	const game = adventure();
	game.items = [
		{ id: 'potion', name: 'Potion', type: 'consumable', price: 10, sellPrice: 7 },
		{ id: 'sword', name: 'Sword', type: 'weapon', where: 'hand', price: 20 }
	];
	game.baseChar.coin = 100;
	game.locations[0].shop = [
		{ item: 'potion', stock: 1, willBuy: true },
		{ item: 'sword', stock: 2, cost: 30, willBuy: 4 }
	];
	return game;
}
async function trade(state: GameState, label: string) {
	await state.choose(choice(state, label));
	return state.choose(choice(state, 'Yes'));
}

describe('trade pricing and stock', () => {
	it('uses item prices, generic rules, and shop adjustments for both directions', () => {
		const game = shopGame(),
			rules = resolveRules({ rules: { trade: { saleRatio: 0.4, purchaseMultiplier: 1.1 } } });
		const location = game.locations[0];
		location.trade = { purchaseMultiplier: 0.8, saleMultiplier: 1.5 };
		expect(purchasePrice(game.items[0], location.shop![0], location, rules)).toBe(8);
		expect(sellingPrice(game.items[0], location.shop![0], location, rules)).toBe(10);
		expect(purchasePrice(game.items[1], location.shop![1], location, rules)).toBe(26);
		expect(sellingPrice(game.items[1], location.shop![1], location, rules)).toBe(6);
		delete game.items[0].sellPrice;
		expect(sellingPrice(game.items[0], location.shop![0], location, rules)).toBe(6);
	});
	it('defaults to half the item price or legacy shop price', () => {
		const game = shopGame(),
			rules = resolveRules({});
		delete game.items[0].sellPrice;
		expect(sellingPrice(game.items[0], game.locations[0].shop![0], game.locations[0], rules)).toBe(
			5
		);
		delete game.items[1].price;
		game.locations[0].shop![1].willBuy = true;
		expect(sellingPrice(game.items[1], game.locations[0].shop![1], game.locations[0], rules)).toBe(
			15
		);
	});
	it('decrements stock, rejects stale confirmation, and hides exhausted goods', async () => {
		const state = await createGameState(shopGame());
		await state.requestTrade();
		await state.choose(choice(state, 'Potion (10)'));
		const yes = choice(state, 'Yes');
		await state.choose(yes);
		expect(await state.choose(yes)).toBe('unavailable');
		expect(state.location.current.shop![0].stock).toBe(0);
		expect(state.character.coin).toBe(90);
		expect(state.character.getInventoryCount('potion')).toBe(2);
		expect(state.availableChoices.some((choice) => choice.label === 'Potion (10)')).toBe(false);
	});
	it('sells one carried item, replenishes stock, and persists it', async () => {
		const game = shopGame(),
			state = await createGameState(game);
		await state.requestTrade();
		await trade(state, 'Sell Potion (7)');
		expect(state.character.coin).toBe(107);
		expect(state.character.getInventoryCount('potion')).toBe(0);
		expect(state.location.current.shop![0].stock).toBe(2);
		await state.choose(choice(state, 'No Thanks'));
		expect(await state.save()).toBe(true);
		const restored = await createGameState(game);
		expect(restored.location.current.shop![0].stock).toBe(2);
		expect(restored.character.coin).toBe(107);
	});
	it('rechecks funds and stock at confirmation without partial payment', async () => {
		const state = await createGameState(shopGame());
		await state.requestTrade();
		await state.choose(choice(state, 'Potion (10)'));
		state.character.coin = 9;
		await state.choose(choice(state, 'Yes'));
		expect(state.location.current.shop![0].stock).toBe(1);
		expect(state.character.coin).toBe(9);
		expect(state.character.getInventoryCount('potion')).toBe(1);
		state.character.coin = 100;
		await state.choose(choice(state, 'Potion (10)'));
		state.location.current.shop![0].stock = 0;
		await state.choose(choice(state, 'Yes'));
		expect(state.character.coin).toBe(100);
		expect(state.character.getInventoryCount('potion')).toBe(1);
	});
	it('does not sell equipped or unowned goods and respects willBuy false', async () => {
		const game = shopGame();
		game.locations[0].shop![0].willBuy = false;
		game.baseChar.equip = [['sword', 'right']];
		const state = await createGameState(game);
		await state.requestTrade();
		expect(state.availableChoices.some((choice) => choice.label.startsWith('Sell'))).toBe(false);
	});
	it('unequips in a shop and immediately makes the item sellable', async () => {
		const game = shopGame();
		game.baseChar.equip = [['sword', 'right']];
		const state = await createGameState(game);
		await state.requestTrade();
		expect(state.canChangeEquipment).toBe(true);
		expect(state.canUseInventory).toBe(false);
		await state.unequip('right');
		expect(state.character.gear.right).toBeUndefined();
		expect(choice(state, 'Sell Sword (4)').description).toBe('1 carried');
		await trade(state, 'Sell Sword (4)');
		expect(state.character.coin).toBe(104);
		expect(state.character.getInventoryCount('sword')).toBe(0);
		expect(state.mode).toBe('shop');
	});
	it('rechecks ownership and rejects overflow before selling', async () => {
		const state = await createGameState(shopGame());
		await state.requestTrade();
		await state.choose(choice(state, 'Sell Potion (7)'));
		state.character.removeFromInventory('potion');
		await state.choose(choice(state, 'Yes'));
		expect(state.character.coin).toBe(100);
		expect(state.location.current.shop![0].stock).toBe(1);
		await state.character.addToInventory('potion');
		await state.choose(choice(state, 'Sell Potion (7)'));
		state.character.coin = Number.MAX_SAFE_INTEGER;
		expect(await state.choose(choice(state, 'Yes'))).toBe('failed');
		expect(state.character.getInventoryCount('potion')).toBe(1);
		expect(state.location.current.shop![0].stock).toBe(1);
	});
	it('rejects missing prices, duplicate listings, and invalid offers', () => {
		const game = shopGame();
		delete game.items[0].price;
		expect(() => validateAdventure(game)).toThrow('No purchase price');
		game.items[0].price = 10;
		game.locations[0].shop!.push({ ...game.locations[0].shop![0] });
		expect(() => validateAdventure(game)).toThrow('Duplicate shop listing');
	});
});

describe('inventory and messages', () => {
	it('appends to cleared messages and resets exclusivity', () => {
		const message = new Messanger();
		message.set('Secret', true);
		message.clear();
		message.append('First');
		message.append(' Second');
		expect(message.text).toBe('First Second');
		expect(message.exclusive).toBe(false);
	});
	it('rejects invalid quantities and incompatible equipment without mutations', async () => {
		const state = await createGameState(shopGame());
		await expect(state.character.addToInventory('potion', -1)).rejects.toThrow();
		expect(() => state.character.removeFromInventory('potion', 0)).toThrow();
		await expect(state.character.equipItem('potion', 'right')).rejects.toThrow();
		expect(state.character.getInventoryCount('potion')).toBe(1);
	});
	it('merges simultaneous additions after lookup without duplicate inventory rows', async () => {
		const state = await createGameState(shopGame());
		await Promise.all([
			state.character.addToInventory('sword'),
			state.character.addToInventory('sword')
		]);
		expect(state.character.inventory.filter((entry) => entry.item.id === 'sword')).toHaveLength(1);
		expect(state.character.getInventoryCount('sword')).toBe(2);
	});
	it('retains equipped gear when unequipping would overflow inventory', async () => {
		const state = await createGameState(shopGame());
		await state.character.equipItem('sword', 'right');
		await state.character.addToInventory('sword', Number.MAX_SAFE_INTEGER);
		await expect(state.character.unequip('right')).rejects.toThrow();
		expect(state.character.gear.right?.id).toBe('sword');
		expect(state.character.getInventoryCount('sword')).toBe(Number.MAX_SAFE_INTEGER);
	});
	it('supports two copies in separate gear slots and restores them', async () => {
		const game = shopGame();
		game.baseChar.equip = [
			['sword', 'left'],
			['sword', 'right']
		];
		const state = await createGameState(game);
		expect(state.character.equipped).toHaveLength(2);
		expect(await state.save()).toBe(true);
		const restored = await createGameState(game);
		expect(restored.character.gear.left?.id).toBe('sword');
		expect(restored.character.gear.right?.id).toBe('sword');
	});
	it('protects an incompatible equipment checkpoint and discards its world overrides', async () => {
		const game = shopGame();
		const state = await createGameState(game);
		state.location.current.shop![0].stock = 0;
		expect(await state.save()).toBe(true);
		const checkpoint = JSON.parse(localStorage.getItem('gameSave:polish')!);
		checkpoint.character.equip = [['potion', 'right']];
		const corrupt = JSON.stringify(checkpoint);
		localStorage.setItem('gameSave:polish', corrupt);
		const restored = await createGameState(game);
		expect(restored.saveNotice).toContain('protected');
		expect(restored.location.current.shop![0].stock).toBe(1);
		expect(restored.character.equipped).toHaveLength(0);
		expect(await restored.save()).toBe(false);
		expect(localStorage.getItem('gameSave:polish')).toBe(corrupt);
	});
	it('grants every matching loot result including duplicate item quantities', async () => {
		const game = shopGame();
		game.npcTemplates[0].items = {
			formula: '1',
			options: [
				{ trigger: 1, value: 'potion' },
				{ trigger: 1, value: 'potion' },
				{ trigger: 1, value: 'sword' }
			]
		};
		const state = await createGameState(game);
		await state.npc.set(game.npcTemplates[0].id);
		await npcLoot(state);
		expect(state.character.getInventoryCount('potion')).toBe(3);
		expect(state.character.getInventoryCount('sword')).toBe(1);
	});
});

describe('Yearlings healing supplies', () => {
	it('offers all potion tiers at level one with finite stock and charges their prices', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.location.moveTo('yearlings/pylaim/general');
		state.resetInteractions();
		state.character.coin = 2260;
		await state.requestTrade();
		for (const label of ['Cure Potion (10)', 'Greater Cure Potion (250)', 'Elixir (2000)']) {
			await trade(state, label);
		}
		expect(state.character.coin).toBe(0);
		expect(state.location.current.shop!.map((entry) => entry.stock)).toEqual([4, 5, 4, 4]);
		expect(state.character.getInventoryCount('yearlings/greater-cure-potion')).toBe(1);
		expect(state.character.getInventoryCount('yearlings/elixir')).toBe(1);
	});
});

describe('Yearlings inn services', () => {
	it('requires the complete overnight and checkpoint fees', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.location.moveTo('yearlings/pylaim/inn');
		state.resetInteractions();
		state.character.coin = 34;
		state.character.hp = 1;
		await trade(state, 'Spend Night');
		expect(state.character.hp).toBe(1);
		expect(state.character.coin).toBe(34);
		state.character.coin = 35;
		await trade(state, 'Spend Night');
		expect(state.character.hp).toBe(state.character.maxHp);
		expect(state.character.coin).toBe(0);
		state.character.coin = 4;
		await trade(state, 'Save Game');
		expect(localStorage.getItem('gameSave:yearlings')).toBeNull();
		expect(state.character.coin).toBe(4);
		state.character.coin = 5;
		await trade(state, 'Save Game');
		expect(state.character.coin).toBe(0);
		expect(JSON.parse(localStorage.getItem('gameSave:yearlings')!).character.coin).toBe(0);
	});
});
