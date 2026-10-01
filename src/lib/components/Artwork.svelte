<script lang="ts">
	let {
		src,
		alt,
		class: className = '',
		eager = false,
		fit = 'contain'
	}: {
		src?: string;
		alt: string;
		class?: string;
		eager?: boolean;
		fit?: 'contain' | 'cover';
	} = $props();
	let failedSource: string | undefined = $state();
</script>

<div class="relative aspect-square w-full overflow-hidden bg-neutral-900 {className}">
	{#if src && failedSource !== src}
		<img
			{src}
			{alt}
			width="512"
			height="512"
			class={['size-full', fit === 'cover' ? 'object-cover' : 'object-contain']}
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			onerror={() => {
				failedSource = src;
			}}
		/>
	{:else}
		<div
			role="img"
			aria-label={alt}
			class="flex size-full items-center justify-center p-6 text-center text-sm text-gray-400"
		>
			{alt}
		</div>
	{/if}
</div>
