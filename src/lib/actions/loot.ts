import type { RandomTable } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { rollOnTables } from '$util/table';

/** Shared by creature drops, treasure chests, and room searches. */
export async function lootGrant(state: GameState, tables: (RandomTable<string> | string[])[]) {
	const ids = rollOnTables(tables, { state, ctx: state.actionContext });
	const items = await Promise.all(ids.map((id) => state.data.items.get(id)));
	for (const item of items) {
		await state.character.addToInventory(item);
		state.message.append(`You found: ${item.name}.`);
	}
	return ids;
}
