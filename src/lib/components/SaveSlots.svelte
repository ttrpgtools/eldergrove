<script lang="ts">
	import type { GameState } from '$state/game.svelte';
	import type { SaveSlot } from '$lib/save-slots';
	import * as Dialog from '$ui/dialog';

	let { gamestate }: { gamestate: GameState } = $props();
	const request = $derived(gamestate.saveDialog!);
	let selected: SaveSlot | undefined = $state();
	const title = $derived(
		request.kind === 'save'
			? 'Save game'
			: request.kind === 'new'
				? 'Start a new game?'
				: 'Load a saved game'
	);
	function close() {
		if (!gamestate.busy && !request.startup) gamestate.saveDialog = undefined;
	}
	async function save(slot: SaveSlot) {
		await gamestate.runCommand(async () => {
			await gamestate.save(slot.number, slot.raw, request.fee);
		});
	}
	async function choose(slot: SaveSlot) {
		if (request.kind === 'save' && slot.raw === null) await save(slot);
		else if (request.kind === 'load' && request.startup)
			await gamestate.loadSlot(slot.number, slot.raw);
		else selected = slot;
	}
</script>

<Dialog.Root
	open
	onOpenChange={(open) => {
		if (!open) close();
	}}
>
	<Dialog.Content
		hideClose={request.startup || gamestate.busy}
		onEscapeKeydown={(event) => {
			if (request.startup || gamestate.busy) event.preventDefault();
		}}
		onInteractOutside={(event) => {
			if (request.startup || gamestate.busy) event.preventDefault();
		}}
	>
		<Dialog.Title>{title}</Dialog.Title>
		<Dialog.Description class="mb-4 text-sm">
			{#if request.kind === 'new'}
				Your unsaved progress will be lost. All saved games will be kept.
			{:else if request.kind === 'save'}
				Choose a slot. Saving costs {request.fee} coins, charged only when your game is saved.
			{:else}
				Choose a game to resume, or start a new adventure. Saves are stored in this browser.
			{/if}
		</Dialog.Description>
		{#if gamestate.saveNotice || gamestate.commandNotice}
			<p role="status" class="mb-4 border border-amber-400 p-3 text-sm text-amber-200">
				{gamestate.saveNotice ?? gamestate.commandNotice}
			</p>
		{/if}
		{#if selected}
			<p class="mb-4 text-sm">
				{#if request.kind === 'save'}
					Overwrite slot {selected.number}? Its existing save will be replaced.
				{:else}
					Load slot {selected.number}? Your unsaved progress will be lost.
				{/if}
			</p>
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					class="nes-btn is-primary"
					disabled={gamestate.busy}
					onclick={async () => {
						if (request.kind === 'save') await save(selected!);
						else await gamestate.loadSlot(selected!.number, selected!.raw);
					}}>{request.kind === 'save' ? 'Overwrite save' : 'Load game'}</button
				>
				<button
					type="button"
					class="nes-btn"
					disabled={gamestate.busy}
					onclick={() => {
						selected = undefined;
					}}>Back to slots</button
				>
			</div>
		{:else if request.kind === 'new'}
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					class="nes-btn is-primary"
					disabled={gamestate.busy}
					onclick={() => gamestate.newGame()}>Start new game</button
				>
				<button type="button" class="nes-btn" disabled={gamestate.busy} onclick={close}
					>Cancel</button
				>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#each request.slots as slot (slot.number)}
					<button
						type="button"
						class="nes-btn min-h-16 text-left"
						disabled={gamestate.busy || (request.kind === 'load' && !slot.checkpoint)}
						onclick={() => choose(slot)}
					>
						<span class="block"
							>Slot {slot.number} · {slot.checkpoint?.character.name ??
								(slot.error ? 'Unavailable save' : 'Empty')}</span
						>
						{#if slot.checkpoint}
							<span class="mt-2 block text-xs"
								>Level {slot.checkpoint.character.level} · {gamestate.definition.locations.find(
									(location) => location.id === slot.checkpoint!.location
								)?.name}</span
							>
							<span class="mt-2 block text-xs opacity-75"
								>{slot.savedAt
									? new Date(slot.savedAt).toLocaleString()
									: 'Save time unavailable'}</span
							>
						{:else if slot.error}
							<span class="mt-2 block text-xs">{slot.error}</span>
						{/if}
					</button>
				{/each}
			</div>
			<div class="mt-6 flex flex-wrap gap-3">
				{#if request.kind === 'load'}
					<button
						type="button"
						class="nes-btn is-primary"
						disabled={gamestate.busy}
						onclick={() => (request.startup ? gamestate.newGame() : gamestate.requestNewGame())}
						>Start a new game</button
					>
				{/if}
				{#if !request.startup}
					<button type="button" class="nes-btn" disabled={gamestate.busy} onclick={close}
						>Cancel</button
					>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
