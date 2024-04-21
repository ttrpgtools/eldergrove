<script lang="ts">
	import { Button } from '$ui/button';
	let { data } = $props();
	let game = data.game;
</script>

<main class="flex flex-col items-center">
	<header class="w-full max-w-6xl">
		<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
		<h1 class="p-8 text-3xl">{game.name}</h1>
	</header>
	<div class="w-full max-w-6xl p-8">
		<p class="mb-8">{game.desc}</p>
		<Button href={`/game/${game.id}/${game.start}`}>Play {game.name}</Button>
	</div>
</main>
