<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import * as Dialog from './index.js';
	import { cn, flyAndScale } from '$lib/util.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: Omit<DialogPrimitive.ContentProps, 'child' | 'forceMount'> = $props();
</script>

<Dialog.Portal>
	<Dialog.Overlay />
	<DialogPrimitive.Content bind:ref forceMount {...restProps}>
		{#snippet child({ props, open })}
			{#if open}
				<div
					{...props}
					class={cn('fixed inset-0 z-50 flex items-center justify-center', className)}
					transition:flyAndScale={{ duration: 200 }}
				>
					<div class="pixel-corners relative size-[80vmin] gap-4 bg-background p-6 shadow-lg">
						{@render children?.()}
						<DialogPrimitive.Close class="nes-btn absolute right-2 top-2">
							<i class="nes-icon close is-small nes-pointer"></i>
							<span class="sr-only">Close</span>
						</DialogPrimitive.Close>
					</div>
				</div>
			{/if}
		{/snippet}
	</DialogPrimitive.Content>
</Dialog.Portal>
