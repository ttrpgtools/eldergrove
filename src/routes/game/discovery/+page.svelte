<script lang="ts">
	import GameUi from '$lib/components/GameUi.svelte';

	let { data } = $props();
</script>

<GameUi gamestate={data.gamestate} />
