<script lang="ts">
	import { Button } from '$ui/button';
</script>

<main class="flex flex-col items-center">
	<header class="w-full max-w-6xl">
		<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
	</header>
	<div class="w-full max-w-6xl p-8">
	Welcome to the Eldergrove! We are growing simple retro style RPG games for your enjoyment.
	If you want to use this "engine" to create your own adventure, you can view and fork the code below.
		<a class="block pt-4 text-emerald-300" href="https://github.com/ttrpgtools/eldergrove"
			>https://github.com/ttrpgtools/eldergrove</a
		>
	</div>
	<div class="flex w-full max-w-6xl gap-4 p-8">
		<Button href="/game">Choose a Game</Button>
		<Button><del>Login</del></Button>
	</div>
</main>
