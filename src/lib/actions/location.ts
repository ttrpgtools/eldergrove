import type { ActionContext, Location } from '$lib/types';
import type { GameState } from '$state/game.svelte';

async function* setLocation(location: string | Location, state: GameState, ctx: ActionContext) {
	console.log(`setLocation`, location);
	// yield to Exit actions
	if (state.location.current.exit) {
		console.log(`[setLoc] About to yield exit actions for ${location}`);
		yield state.location.current.exit;
	}
	if (ctx.locations.has(typeof location === 'string' ? location : location.id)) {
		//loop
		console.error(`Location loop detected attempting to head to ${location}`);
		return;
	}
	console.log(`[setLoc] About to moveTo(${location})`);
	const dest = await state.location.moveTo(location);
	ctx.locations.add(dest.id);
	if (state.location.current.choices && state.location.current.choices.length) {
		state.choices.set(state.location.current.choices);
	}
	// yield to Enter actions
	if (state.location.current.enter) {
		console.log(`[setLoc] About to yield enter actions for ${location}`);
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

export async function locationDesc(state: GameState, desc: string) {
	if (state.location.current) {
		state.location.current.desc = desc;
	}
}
