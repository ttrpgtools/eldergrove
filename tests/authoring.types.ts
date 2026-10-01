// Checked by npm run check; these assertions verify the public authoring contracts.
import { action, condition, createAuthoring } from '../src/lib/authoring';
import type { Action } from '../src/lib/actions';
import type { Conditional } from '../src/lib/conditions';
import { integer } from '../src/lib/contracts';

function contracts() {
	action('hpHeal', 5);
	action('hpHeal', { from: 'rollResult' });
	action('messageClear');
	action('shopStart');
	condition('hpFull');
	// @ts-expect-error numeric amounts must be explicit
	action('hpHeal');
	// @ts-expect-error the action argument is not a string
	action('hpDamage', 'five');
	// @ts-expect-error commands without arguments reject extras
	action('messageClear', 1);
	// @ts-expect-error condition requires an amount
	condition('coinsAtLeast');
	// @ts-expect-error tuples require a numeric counter value
	condition('counterIsEqual', ['wins', 'three']);
	// @ts-expect-error no-argument condition
	condition('ctxWasVictory', true);
	// @ts-expect-error nested actions retain their own argument contracts
	action('yesno', { yes: [{ action: 'hpHeal' }], no: [] });
	// @ts-expect-error raw object syntax enforces the same contracts
	const invalid: Action = { action: 'hpHeal' };
	// @ts-expect-error raw conditions enforce the same contracts
	const badCondition: Conditional = { condition: 'inventoryContains' };
	void invalid;
	void badCondition;
	const author = createAuthoring();
	const reward = author.registerAction('test/reward', {
		parse: (arg) => integer(arg, 'reward', 1),
		run: (s, arg) => {
			s.character.coin += arg;
		}
	});
	reward(3);
	// @ts-expect-error registered action uses its parser's inferred numeric type
	reward('three');
	// @ts-expect-error registered action requires its argument
	reward();
	const threshold = author.registerCondition('test/threshold', {
		parse: (arg) => integer(arg, 'threshold'),
		check: (s, arg) => s.character.coin >= arg
	});
	threshold(3);
	// @ts-expect-error registered condition arguments are also typed
	threshold(false);
}
void contracts;
