<script lang="ts" generics="TMachine">
	import { rollFormula } from '$lib/util/dice';

	import type { NpcInstance } from '$lib/types';
	import type { Character } from '$lib/util/character.svelte';
	import { attackNpc, npcLabel } from '$lib/util/npc';
	import { ENTER, createMachine } from '$lib/util/fsm.svelte';
	import type { Messanger } from '$lib/util/messanger.svelte';

	let {
		npc,
		character,
		message,
		ondone
	}: {
		npc: NpcInstance;
		character: Character;
		message: Messanger;
		ondone: VoidFunction;
	} = $props();
	const battle = createMachine('yourTurn', {
		yourTurn: {
			attack() {
				const dmg = attackNpc(npc, character);
				message.set(`You did ${dmg} damage to ${npcLabel(npc, true, false)}.`);
				if (npc.hp <= 0) {
					return 'itDied';
				}
				return 'itsTurn';
			},
			run: ondone
		},
		itsTurn: {
			[ENTER]() {
				this.counter.debounce(2000); // Computer thinking time :)
			},
			counter: () => {
				const dmg = character.inflictDamage('d4');
				message.set(
					dmg === 0
						? `${npcLabel(npc, true)} missed you!`
						: `${npcLabel(npc, true)} hit you for ${dmg} damage.`
				);
				if (character.hp <= 0) {
					message.append(` You died :(`);
					return 'youDied';
				}
				return 'yourTurn';
			}
		},
		itDied: {
			[ENTER]() {
				const coin = typeof npc.coins === 'string' ? rollFormula(npc.coins) : npc.coins ?? 0;
				character.coin += coin;
				character.xp += npc?.exp ?? 0;
				message.set(
					` You killed ${npcLabel(npc, true, false)} and found ${coin} coins and earned ${npc.exp} experience.`
				);
			},
			leave: ondone
		},
		youDied: {
			// Nothing yet
		}
	});
</script>

{#if battle.state === 'itDied'}
	<button type="button" class="nes-btn is-primary" onclick={battle.leave}>Leave</button>
{:else}
	<button type="button" class="nes-btn is-primary" onclick={battle.attack}>Attack</button>
	<button type="button" class="nes-btn">Use Item</button>
	<button type="button" class="nes-btn" onclick={battle.run}>Run</button>
{/if}
