import type { Location } from '$lib/types';
import type { GameState } from '$state/game.svelte';

async function setLocation(location: string | Location, state: GameState) {
	console.log(`setLocation`, location);
	// yield to Exit actions
	if (state.location.current.exit) {
		console.log(`[setLoc] About to yield exit actions for ${location}`);
		state.resolveActions(state.location.current.exit);
	}
	console.log(`[setLoc] About to moveTo(${location})`);
	await state.location.moveTo(location);
	if (state.location.current.choices && state.location.current.choices.length) {
		state.choices.set(state.location.current.choices);
	}
	// yield to Enter actions
	if (state.location.current.enter) {
		console.log(`[setLoc] About to yield enter actions for ${location}`);
		state.resolveActions(state.location.current.enter);
	}
}

export async function locationChange(state: GameState, location: string) {
	return await setLocation(location, state);
}

export async function locationReturn(state: GameState) {
	if (!state.location.previous) {
		state.message.set(`I don't know from whence I came...`);
	} else {
		return setLocation(state.location.previous, state);
	}
}

export async function locationDesc(state: GameState, desc: string) {
	if (state.location.current) {
		state.location.current.desc = desc;
	}
}
