<script lang="ts">
	import { Button } from '$ui/button';
</script>

<main class="flex flex-col items-center">
	<header class="w-full max-w-6xl">
		<img src="/img/eldergrove-banner.webp" alt="Eldergrove" />
	</header>
	<div class="w-full max-w-6xl p-8">
		If you are here, then thank you for agreeing to help test Eldergrove. It is very early and there
		are many issues already known. The code and issues are available here:
		<a class="block pt-4 text-emerald-300" href="https://github.com/ttrpgtools/eldergrove"
			>https://github.com/ttrpgtools/eldergrove</a
		>
	</div>
	<div class="flex w-full max-w-6xl gap-4 p-8">
		<Button href="/game/test">Play New Game (Pre-Alpha)</Button>
		<Button><del>Login</del></Button>
	</div>
</main>
