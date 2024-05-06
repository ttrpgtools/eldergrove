import { getItem } from '$data/items';
import type { Choice } from '$lib/types';
import type { GameState } from '$state/game.svelte';
import { resolveList } from '$util/async';

function noEncounter(state: GameState) {
	state.message.set(`This place doesn't seem to have any wares available at the moment.`);
	state.choices.set([{ label: `OK`, actions: [{ action: 'messageClear' }] }]);
}

export async function shopStart(state: GameState, msg?: string) {
	if (!state.location.current.shop) return noEncounter(state);
	const fullshop = await resolveList(state.location.current.shop, 'item', getItem);
	const shopChoices: Choice[] = fullshop.map((inv) => ({
		label: `${inv.item.name} (${inv.cost})`,
		actions: [
			{ action: 'itemPush', arg: inv.item },
			{ action: 'messageSet', arg: `It costs ${inv.cost} coin, interested?` },
			{
				action: 'yesno',
				arg: {
					yes: [
						{
							action: 'messageSet',
							arg: `Looks like you don't have enough coin at the moment...`,
							valid: { condition: 'coinsLessThan', arg: inv.cost }
						},
						{
							action: 'messageSet',
							arg: `A pleasure doing business with you.`,
							valid: { condition: 'coinsAtLeast', arg: inv.cost }
						},
						{
							action: 'inventoryAdd',
							arg: inv.item,
							valid: { condition: 'coinsAtLeast', arg: inv.cost }
						},
						{
							action: 'coinsRemove',
							arg: inv.cost,
							valid: { condition: 'coinsAtLeast', arg: inv.cost }
						},
						{ action: 'itemPop' }
					],
					no: [
						{ action: 'messageSet', arg: `Hopefully it'll be here if you reconsider.` },
						{ action: 'itemPop' }
					]
				}
			}
		]
	}));
	shopChoices.push({ label: 'No Thanks', actions: [{ action: 'choicesPop' }] });
	state.choices.push(shopChoices);
	if (msg) {
		state.message.set(msg);
	}
}

export async function shopFinish(state: GameState) {
	state.choices.pop();
}
