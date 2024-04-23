<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$ui/button';
</script>

<main class="flex flex-col items-center">
	<header class="w-full max-w-6xl">
		<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
		<h1 class="p-8 text-3xl">A wild Error encountered! ({$page.status})</h1>
	</header>
	<div class="w-full max-w-6xl p-8">
		<p class="mb-8">{$page.error?.message}</p>
		<Button href="/game">Game List</Button>
	</div>
</main>
