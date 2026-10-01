import type { Location } from '$lib/types';
import type { GameState } from '$state/game.svelte';

async function setLocation(location: string | Location, state: GameState) {
	console.log(`setLocation`, location);
	// yield to Exit actions
	if (state.location.current.exit) {
		console.log(`[setLoc] About to yield exit actions for ${location}`);
		await state.resolveActions(state.location.current.exit);
	}
	console.log(`[setLoc] About to moveTo(${location})`);
	state.throwIfCommandCancelled();
	await state.location.moveTo(location);
	state.throwIfCommandCancelled();
	state.resetInteractions();
	// yield to Enter actions
	if (state.location.current.enter) {
		console.log(`[setLoc] About to yield enter actions for ${location}`);
		await state.resolveActions(state.location.current.enter);
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
