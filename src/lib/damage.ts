import { resolveNumber } from './arguments';
import { ruleAmount, type Damage, type DamageArgument } from './rules';
import type { ActionContext } from './types';
export function resolveDamage(value: DamageArgument, ctx: ActionContext): Damage {
	const packet = typeof value === 'object' && 'amount' in value ? value : { amount: value };
	return Object.freeze({
		amount: ruleAmount(resolveNumber(packet.amount, ctx), 'damage'),
		type: packet.type,
		source: packet.source ?? 'effect'
	});
}
