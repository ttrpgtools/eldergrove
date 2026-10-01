import { ruleAmount, type DamageArgument } from '$lib/rules';
import { resolveDamage } from '$lib/damage';
import { resolveNumber, type NumericValue } from '$lib/arguments';
import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { minZero } from '$util/math';
import { rollOnTable } from '$util/table';

export async function npcDamage(
	state: GameState,
	value: DamageArgument,
	ctx: ActionContext = state.actionContext
) {
	const damage = resolveDamage(value, ctx);
	const amt = ruleAmount(state.rules.combat.defendNpc(state, damage), 'damage');
	if (state.npc.current) {
		state.npc.current.hp = minZero(state.npc.current.hp - amt);
		state.events.emit('npcHpChange', 0 - amt);
		return amt;
	}
}

export async function npcHeal(
	state: GameState,
	value: NumericValue,
	ctx: ActionContext = state.actionContext
) {
	const amt = resolveNumber(value, ctx);
	if (state.npc.current) {
		state.npc.current.hp = Math.min(state.npc.current.maxHp, state.npc.current.hp + minZero(amt));
	}
}

export async function npcLoot(state: GameState) {
	if (state.npc.current) {
		const npc = state.npc.current;
		const coin = typeof npc.coins === 'string' ? state.roll(npc.coins) : (npc.coins ?? 0);
		state.character.coin += coin;
		const leveled = state.character.gainExperience(npc.exp ?? 0);
		state.message.append(` You found ${coin} coins and earned ${npc.exp} experience.`);
		if (npc.items) {
			const itemId = rollOnTable(npc.items, { state, ctx: state.actionContext });
			const loot = await Promise.all(itemId.map((id) => state.data.items.get(id)));
			for (const item of loot) {
				await state.character.addToInventory(item);
				state.message.append(`You also found: ${item.name}.`);
			}
		}
		if (leveled) {
			state.message.append(` You leveled up!`);
		}
	}
}
