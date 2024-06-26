import type { ActionContext } from '$lib/types';
import type { GameState } from '$state/game.svelte';

export async function messageClear(state: GameState) {
	state.message.clear();
}

function injectContext(msg: string, ctx: ActionContext) {
	return msg.replace(/\[([^\]]+)\]/g, (_, key: keyof ActionContext) => {
		if (key in ctx) {
			return ctx[key]?.toString() ?? '';
		} else {
			throw new Error(`Context key '${key}' not found from message '${msg}'`);
		}
	});
}

export async function messageAppend(state: GameState, msg: string, ctx: ActionContext) {
	msg = injectContext(msg, ctx);
	state.message.append(msg);
}

export async function messageSet(state: GameState, msg: string, ctx: ActionContext) {
	const exclusive = msg.startsWith('!!');
	if (exclusive) msg = msg.substring(2);
	msg = injectContext(msg, ctx);
	state.message.set(msg, exclusive);
}
