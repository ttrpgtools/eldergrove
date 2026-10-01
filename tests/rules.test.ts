import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../src/lib/state/game.svelte';
import { createAuthoring, defineAdventure } from '../src/lib/authoring';
import { defineRuleModule, resolveRules, type RuleOverrides } from '../src/lib/rules';
import { validateAdventure } from '../src/lib/content';
import { attackFromCharacter, attackFromNpc } from '../src/lib/actions/attacks';
import { npcDamage } from '../src/lib/actions/npc';
import { hpDamage } from '../src/lib/actions/hp';
import { encounterFinish, encounterRandomNpc } from '../src/lib/games/encounter';
import type { GameDef } from '../src/lib/types';

function adventure(rules?: RuleOverrides): GameDef {
	return {
		id: 'rules',
		start: 'start',
		rules,
		baseChar: {
			name: 'Hero',
			maxHp: 10,
			coin: 30,
			str: 4,
			dex: 3,
			wil: 3,
			xp: 0,
			level: 1,
			inventory: [['sword', 1]],
			equip: []
		},
		locations: [
			{
				id: 'start',
				name: 'Start',
				biome: 'meadow',
				desc: 'Original',
				shop: [{ item: 'sword', cost: 10, stock: 5 }],
				choices: []
			}
		],
		items: [
			{
				id: 'sword',
				name: 'Sword',
				type: 'weapon',
				damage: { amt: '5', type: 'sharp' },
				where: 'hand'
			},
			{ id: 'shield', name: 'Shield', type: 'armor', defence: 2, where: 'hand' }
		],
		npcTemplates: [{ id: 'rat', name: 'Rat', maxHp: 10, exp: 0 }],
		npcInstances: [{ id: 'boss', name: 'Boss', maxHp: 20, hp: 20, exp: 0 }]
	};
}
const reload = vi.fn();
beforeEach(() => {
	const values = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key)
	});
	reload.mockClear();
	vi.stubGlobal('window', { location: { reload } });
});

describe('immutable content and runtime overrides', () => {
	it('freezes an authoring snapshot without freezing the source or hooks', async () => {
		const game = adventure();
		const hook = vi.fn();
		game.locations[0].enter = hook;
		const definition = defineAdventure(game);
		expect(Object.isFrozen(definition.locations[0])).toBe(true);
		expect(Object.isFrozen(game.locations[0])).toBe(false);
		expect(definition.locations[0].enter).toBe(hook);
		const state = await createGameState(definition);
		expect(hook).toHaveBeenCalledOnce();
		expect(() => Reflect.set(state.definition.locations[0], 'name', 'Changed')).not.toThrow();
		expect(state.definition.locations[0].name).toBe('Start');
	});
	it('holds an independent immutable snapshot, including content version and rules', async () => {
		const game = adventure({ combat: { npcAttack: '1' } });
		const state = await createGameState(game);
		game.contentVersion = 2;
		game.locations[0].name = 'Edited';
		game.items[0].name = 'Edited';
		game.rules!.combat!.npcAttack = '9';
		expect(state.toJSON().contentVersion).toBe(1);
		expect(state.location.current.name).toBe('Start');
		expect(state.rules.combat.npcAttack).toBe('1');
		expect((await state.data.items.get('sword')).name).toBe('Sword');
		expect(await state.save()).toBe(true);
		expect(Reflect.set(state.location.current, 'name', 'Changed')).toBe(false);
		expect(Reflect.set(await state.data.items.get('sword'), 'name', 'Changed')).toBe(false);
		expect(Reflect.set(state.location.current.definition, 'name', 'Changed')).toBe(false);
	});
	it('round trips only mutable world fields and isolates fresh sessions', async () => {
		const game = adventure();
		const state = await createGameState(game);
		state.location.current.desc = 'Changed';
		state.location.current.shop![0].stock = 2;
		await state.npc.set('boss');
		state.npc.current!.hp = 3;
		state.npc.clear();
		expect(await state.save()).toBe(true);
		const restored = await createGameState(game);
		expect(restored.location.current.desc).toBe('Changed');
		expect(restored.location.current.shop![0].stock).toBe(2);
		await restored.npc.set('boss');
		expect(restored.npc.current!.hp).toBe(3);
		expect(game.locations[0].desc).toBe('Original');
		expect(game.locations[0].shop![0].stock).toBe(5);
		localStorage.removeItem('gameSave:rules');
		const fresh = await createGameState(game);
		expect(fresh.location.current.desc).toBe('Original');
	});
	it('retains named health but creates fresh template encounters', async () => {
		const state = await createGameState(adventure());
		await state.npc.set('boss');
		state.npc.current!.hp = 2;
		state.npc.clear();
		await state.npc.set('boss');
		expect(state.npc.current!.hp).toBe(2);
		await state.npc.set('rat');
		state.npc.current!.hp = 1;
		await state.npc.set('rat');
		expect(state.npc.current!.hp).toBe(10);
		expect(Reflect.set(state.npc.current!, 'maxHp', 99)).toBe(false);
	});
	it('rejects cyclic and class content instead of silently flattening it', async () => {
		const game = adventure();
		Object.assign(game, { extra: new Date() });
		await expect(createGameState(game)).rejects.toThrow('plain objects');
		Object.assign(game, { extra: game });
		await expect(createGameState(game)).rejects.toThrow('cyclic');
	});
});

describe('rules registration and validation', () => {
	it('composes scoped modules in order, with direct overrides last', () => {
		const author = createAuthoring();
		const module = author.registerRules('test/combat', {
			combat: { npcAttack: '1', retaliationDelay: 0 }
		});
		expect(() => author.registerRules('test/combat', {})).toThrow('Duplicate');
		const game = adventure({ combat: { npcAttack: '3' } });
		game.ruleModules = [module, defineRuleModule('test/other', { combat: { npcAttack: '2' } })];
		const rules = resolveRules(game);
		expect(rules.combat.npcAttack).toBe('3');
		expect(rules.combat.retaliationDelay).toBe(0);
		expect(Object.isFrozen(rules.combat)).toBe(true);
		expect(resolveRules({}).combat.retaliationDelay).toBe(1500);
		game.ruleModules.push(module);
		expect(() => resolveRules(game)).toThrow('Duplicate');
	});
	it.each([
		{ progression: { thresholds: [10, 10] } },
		{ progression: { thresholds: [10], maxLevel: 3 } },
		{ progression: { gains: { str: -1 } } },
		{ combat: { npcAttack: 'd0' } },
		{ combat: { retaliationDelay: 60001 } }
	] satisfies RuleOverrides[])('rejects invalid rules before entry hooks: %j', async (rules) => {
		const game = adventure(rules);
		const hook = vi.fn();
		game.locations[0].enter = hook;
		await expect(createGameState(game)).rejects.toThrow();
		expect(hook).not.toHaveBeenCalled();
	});
	it('validates rule action trees and death scene references without executing hooks', () => {
		const hook = vi.fn();
		const game = adventure({
			death: { item: 'missing', onDeath: hook },
			encounters: { onFinish: [{ action: 'locationChange', arg: 'missing' }] }
		});
		expect(() => validateAdventure(game)).toThrow('Unknown referenced ID');
		expect(hook).not.toHaveBeenCalled();
	});
});

describe('progression', () => {
	it('uses inclusive thresholds and applies every crossed level without healing', async () => {
		const state = await createGameState(
			adventure({
				progression: {
					thresholds: [10, 20, 30],
					gains: (level) => ({ str: level, wil: 1, maxHp: 2 })
				}
			})
		);
		state.character.hp = 1;
		expect(state.character.gainExperience(10)).toBe(true);
		expect(state.character.level).toBe(2);
		expect(state.character.gainExperience(25)).toBe(true);
		expect(state.character.level).toBe(4);
		expect(state.character.str).toBe(13);
		expect(state.character.wil).toBe(6);
		expect(state.character.maxHp).toBe(16);
		expect(state.character.hp).toBe(1);
		expect(state.character.gainExperience(100)).toBe(false);
		expect(state.character.level).toBe(4);
		expect(state.character.xp).toBe(135);
	});
	it('preserves default stat gains and ends at level 16', async () => {
		const state = await createGameState(adventure());
		state.character.gainExperience(6200);
		expect(state.character.level).toBe(16);
		expect(state.character.str).toBe(34);
		expect(state.character.dex).toBe(33);
		expect(state.character.wil).toBe(3);
		expect(state.character.maxHp).toBe(130);
	});
	it('supports an explicit lower cap or no further levels', async () => {
		const state = await createGameState(
			adventure({ progression: { thresholds: [10, 20], maxLevel: 2 } })
		);
		state.character.gainExperience(100);
		expect(state.character.level).toBe(2);
		const single = await createGameState(adventure({ progression: { thresholds: [] } }));
		single.character.gainExperience(100);
		expect(single.character.level).toBe(1);
	});
	it('rejects malformed rewards and gains atomically', async () => {
		const state = await createGameState(
			adventure({
				progression: { thresholds: [10, 20], gains: (level) => ({ str: level === 3 ? NaN : 2 }) }
			})
		);
		const before = state.character.toJSON();
		expect(() => state.character.gainExperience(30)).toThrow();
		expect(state.character.toJSON()).toEqual(before);
		expect(() => state.character.gainExperience(-1)).toThrow();
		expect(() => state.character.gainExperience(Infinity)).toThrow();
	});
	it('protects a checkpoint whose level exceeds the adventure cap', async () => {
		const game = adventure();
		const state = await createGameState(game);
		state.character.level = 3;
		expect(await state.save()).toBe(true);
		game.rules = { progression: { maxLevel: 2 } };
		const restored = await createGameState(game);
		expect(restored.saveNotice).toContain('protected');
		expect(await restored.save()).toBe(false);
	});
});

describe('combat and equipment policies', () => {
	it('finds the left weapon when the right hand holds armor', async () => {
		const state = await createGameState(adventure());
		await state.character.equipItem('shield', 'right');
		await state.character.equipItem('sword', 'left');
		await state.npc.set('boss');
		expect(await attackFromCharacter(state)).toBe(5);
		expect(state.npc.current!.hp).toBe(15);
	});
	it('applies NPC defence to attacks and item damage exactly once', async () => {
		const game = adventure();
		const defend = vi.fn((_, type: string, damage: number) => (type === 'sharp' ? damage / 2 : 0));
		game.npcInstances[0].defend = defend;
		const state = await createGameState(game);
		await state.npc.set('boss');
		expect(await npcDamage(state, { amount: 5, type: 'sharp' })).toBe(2);
		expect(await npcDamage(state, 20)).toBe(0);
		expect(state.npc.current!.hp).toBe(18);
		expect(defend).toHaveBeenCalledTimes(2);
	});
	it('uses custom attack, armor, and character defence rules', async () => {
		const state = await createGameState(
			adventure({
				combat: {
					armor: () => 4,
					npcAttack: '10-[@armor]',
					defendCharacter: (_, damage) => (damage.source === 'attack' ? damage.amount - 1 : 0)
				}
			})
		);
		await state.npc.set('boss');
		expect(await attackFromNpc(state, undefined)).toBe(5);
		expect(state.character.hp).toBe(5);
		expect(await hpDamage(state, 3)).toBe(0);
		expect(state.character.hp).toBe(5);
	});
	it('rejects invalid defence results without damaging health', async () => {
		const state = await createGameState(adventure({ combat: { defendNpc: () => NaN } }));
		await state.npc.set('boss');
		await expect(npcDamage(state, 3)).rejects.toThrow();
		expect(state.npc.current!.hp).toBe(20);
	});
	it('supports equipment requirements and rejects unowned items', async () => {
		const state = await createGameState(
			adventure({
				equipment: { slots: () => ['left'], canEquip: (character) => character.level >= 2 }
			})
		);
		const sword = await state.data.items.get('sword');
		await state.character.autoEquip(sword);
		expect(state.character.gear.left).toBeUndefined();
		state.character.level = 2;
		await state.character.autoEquip(sword);
		expect(state.character.gear.left?.id).toBe('sword');
		expect(state.character.getInventoryCount(sword)).toBe(0);
		await state.character.autoEquip(await state.data.items.get('shield'));
		expect(state.character.gear.left?.id).toBe('sword');
	});
});

describe('encounter outcomes and recovery', () => {
	it('supports alternative streak keys, retention on running, and finish hooks', async () => {
		const state = await createGameState(
			adventure({
				encounters: {
					streakKey: () => 'all-wins',
					resetOnRun: false,
					onFinish: async (state, ctx) => {
						state.character.flags.add(ctx.encounterVictory ? 'win' : 'run');
					}
				}
			})
		);
		await encounterRandomNpc(state, { table: ['rat'] });
		await encounterFinish(state, 'win');
		await encounterRandomNpc(state, { table: ['rat'] });
		await encounterFinish(state, 'run');
		expect(state.character.counters.get('all-wins')).toBe(1);
		expect(state.character.flags.has('run')).toBe(true);
	});
	it('can disable streak counters', async () => {
		const state = await createGameState(adventure({ encounters: { streakKey: () => undefined } }));
		await encounterRandomNpc(state, { table: ['rat'] });
		await encounterFinish(state, 'win');
		expect(state.character.counters.size).toBe(0);
	});
	it('gives real Discovery a generic death screen and preserves checkpoints on retry', async () => {
		const { discovery } = await import('../src/lib/games/discovery');
		const state = await createGameState(discovery);
		expect(await state.save()).toBe(true);
		const saved = localStorage.getItem('gameSave:discovery');
		await state.runCommand(async (state) => {
			await state.die();
		});
		expect(state.character.hp).toBe(0);
		expect(state.item.current?.id).toBe('engine/death');
		expect(await state.choose(state.choices.current![0])).toBe('completed');
		expect(reload).toHaveBeenCalledOnce();
		expect(localStorage.getItem('gameSave:discovery')).toBe(saved);
		localStorage.setItem('gameSave:other', 'other');
		expect(await state.choose(state.choices.current![1])).toBe('completed');
		expect(localStorage.getItem('gameSave:discovery')).toBeNull();
		expect(localStorage.getItem('gameSave:other')).toBe('other');
	});
	it('uses Yearlings death artwork and prevents duplicate death hooks', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.die('A fall.');
		await state.die();
		expect(state.item.depth).toBe(1);
		expect(state.item.current?.id).toBe('yearlings/you-die');
	});

	it('routes the Yearlings rotten-rope hazard through shared death recovery', async () => {
		const { yearlings } = await import('../src/lib/games/yearlings');
		const state = await createGameState(yearlings);
		await state.location.moveTo('yearlings/morlin-cave');
		await state.character.addToInventory('yearlings/old-rope');
		state.character.flags.add('found-rope');
		const climb = state.location.current.choices?.find((choice) => choice.label === 'Climb down');
		expect(climb).toBeDefined();
		expect(await state.runCommand(climb!.actions)).toBe('completed');
		expect(state.character.hp).toBe(0);
		expect(state.item.current?.id).toBe('yearlings/you-die');
		expect(await state.save()).toBe(false);
	});
	it('allows a death hook to revive the character', async () => {
		const state = await createGameState(
			adventure({
				death: {
					onDeath: async (state) => {
						state.character.hp = 1;
					}
				}
			})
		);
		await state.die();
		expect(state.character.hp).toBe(1);
		expect(state.item.current).toBeUndefined();
	});
	it('still presents recovery if a death hook fails', async () => {
		const state = await createGameState(
			adventure({
				death: {
					onDeath: () => {
						throw new Error('death hook');
					}
				}
			})
		);
		expect(
			await state.runCommand(async (state) => {
				await state.die();
			})
		).toBe('failed');
		expect(state.item.current?.id).toBe('engine/death');
		expect(state.choices.current).toHaveLength(2);
	});
	it('uses configured delay and death rules from a complete combat turn', async () => {
		const state = await createGameState(
			adventure({
				combat: { unarmed: { amt: '0', type: 'blunt' }, npcAttack: '20', retaliationDelay: 0 },
				death: { message: 'Defeated' }
			})
		);
		await encounterRandomNpc(state, { table: ['rat'] });
		expect(await state.choose(state.choices.current![0])).toBe('completed');
		expect(state.character.hp).toBe(0);
		expect(state.item.current?.id).toBe('engine/death');
		expect(state.message.text).toBe('Defeated');
	});
});
