<script lang="ts">
	let { icon, class: clazz = 'size-4' }: { icon: string; class?: string } = $props();
	const href = $derived(`/icon/all.svg?1#${icon}`);
</script>

{#if icon}
	<svg preserveAspectRatio="xMidYMid meet" class="m-0 !mt-0 inline-block {clazz}"
		><use xlink:href={href} /></svg
	>
{/if}
