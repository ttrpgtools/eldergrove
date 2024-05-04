import type { ActionContext, Location } from '$lib/types';
import type { GameState } from '$state/game.svelte';

async function* setLocation(location: string | Location, state: GameState, ctx: ActionContext) {
	console.log(`setLocation`, location);
	// yield to Exit actions
	if (state.location.current.exit) {
		yield state.location.current.exit;
	}
	if (ctx.locations.has(typeof location === 'string' ? location : location.id)) {
		//loop
		console.error(`Location loop detected attempting to head to ${location}`);
		return;
	}
	const dest = await state.location.moveTo(location);
	ctx.locations.add(dest.id);
	if (state.location.current.choices && state.location.current.choices.length) {
		state.choices = state.location.current.choices;
	}
	// yield to Enter actions
	if (state.location.current.enter) {
		yield state.location.current.enter;
	}
}

export async function locationChange(state: GameState, location: string, ctx: ActionContext) {
	return setLocation(location, state, ctx);
}

export async function locationReturn(state: GameState, _: never, ctx: ActionContext) {
	if (!state.location.previous) {
		state.message.set(`I don't know from whence I came...`);
	} else {
		return setLocation(state.location.previous, state, ctx);
	}
}
