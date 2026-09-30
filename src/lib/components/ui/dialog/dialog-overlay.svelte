<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import { cn } from '$lib/util.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: Omit<DialogPrimitive.OverlayProps, 'child' | 'children' | 'forceMount'> = $props();
</script>

<DialogPrimitive.Overlay bind:ref forceMount {...restProps}>
	{#snippet child({ props, open })}
		{#if open}
			<div
				{...props}
				class={cn('fixed inset-0 z-50 bg-background/80 backdrop-blur-sm', className)}
				transition:fade={{ duration: 150 }}
			></div>
		{/if}
	{/snippet}
</DialogPrimitive.Overlay>
