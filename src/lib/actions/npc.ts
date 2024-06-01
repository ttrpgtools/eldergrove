import type { GameState } from '$state/game.svelte';
import { rollFormula } from '$util/dice';
import { minZero } from '$util/math';
import { rollOnTable } from '$util/table';

export async function npcDamage(state: GameState, amt: number) {
	if (state.npc.current) {
		amt = minZero(amt);
		state.npc.current.hp = minZero(state.npc.current.hp - amt);
		state.events.emit('npcHpChange', 0 - amt);
	}
}

export async function npcHeal(state: GameState, amt: number) {
	if (state.npc.current) {
		state.npc.current.hp = Math.min(state.npc.current.maxHp, state.npc.current.hp + (amt ?? 0));
	}
}

export async function npcLoot(state: GameState) {
	if (state.npc.current) {
		const npc = state.npc.current;
		const coin = typeof npc.coins === 'string' ? rollFormula(npc.coins) : npc.coins ?? 0;
		state.character.coin += coin;
		const leveled = state.character.gainExperience(npc.exp ?? 0);
		state.message.append(` You found ${coin} coins and earned ${npc.exp} experience.`);
		if (npc.items) {
			const itemId = rollOnTable(npc.items);
			const item = await state.data.items.get(itemId[0]);
			await state.character.addToInventory(item);
			state.message.append(` You also found: ${item.name}.`);
		}
		if (leveled) {
			state.message.append(` You leveled up!`);
		}
	}
}
