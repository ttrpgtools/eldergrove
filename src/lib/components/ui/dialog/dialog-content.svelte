<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import * as Dialog from './index.js';
	import { cn, flyAndScale } from '$lib/util.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		hideClose = false,
		...restProps
	}: Omit<DialogPrimitive.ContentProps, 'child' | 'forceMount'> & {
		hideClose?: boolean;
	} = $props();
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
					<div
						class="pixel-corners relative max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl bg-background shadow-lg"
					>
						<div
							class="max-h-[calc(90dvh-1rem)] overflow-y-auto overflow-x-hidden p-4 pt-8 sm:p-6 sm:pt-8"
						>
							{@render children?.()}
						</div>
						{#if !hideClose}
							<DialogPrimitive.Close class="nes-btn absolute right-2 top-2">
								<i class="nes-icon close is-small nes-pointer"></i>
								<span class="sr-only">Close</span>
							</DialogPrimitive.Close>
						{/if}
					</div>
				</div>
			{/if}
		{/snippet}
	</DialogPrimitive.Content>
</Dialog.Portal>
