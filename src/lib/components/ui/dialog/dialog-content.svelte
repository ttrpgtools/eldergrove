<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import * as Dialog from './index.js';
	import { cn, flyAndScale } from '$lib/util.js';

	type $$Props = DialogPrimitive.ContentProps;

	let className: $$Props['class'] = undefined;
	export let transition: $$Props['transition'] = flyAndScale;
	export let transitionConfig: $$Props['transitionConfig'] = {
		duration: 200
	};
	export { className as class };
</script>

<Dialog.Portal>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		{transition}
		{transitionConfig}
		class={cn('fixed inset-0 z-50 flex items-center justify-center', className)}
		{...$$restProps}
	>
		<div class="pixel-corners relative size-[80vmin] gap-4 bg-background p-6 shadow-lg">
			<slot />
			<DialogPrimitive.Close class="nes-btn absolute right-2 top-2">
				<i class="nes-icon close is-small nes-pointer"></i>
				<span class="sr-only">Close</span>
			</DialogPrimitive.Close>
		</div>
	</DialogPrimitive.Content>
</Dialog.Portal>
