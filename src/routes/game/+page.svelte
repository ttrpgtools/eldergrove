<script lang="ts">
	import { Button } from '$ui/button';
	let { data } = $props();
</script>

<main class="flex flex-col items-center">
	<header class="w-full max-w-6xl">
		<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
		<h1 class="p-8 text-3xl">Select A Game</h1>
	</header>
	<div class="w-full max-w-6xl p-8">
		Eldergrove is a game engine/system that can host multiple stories. Choose your game/story.
	</div>
	<div class="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
		{#each data.games as game}
			<div class="pixel-corners p-4">
				<p class="nes-text is-primary mb-2 text-xl">{game.name}</p>
				<p class="my-4">{game.desc}</p>
				<Button href={`/game/${game.id}`}>Play {game.name}</Button>
			</div>
		{/each}
	</div>
</main>
