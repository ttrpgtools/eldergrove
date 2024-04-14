export const ENTER = Symbol();
export const EXIT = Symbol();
type State = string;
type Action = string;
type LifecycleArgs<T extends State> = {
	from: T | null;
	to: T;
	event: Action | null;
	args: unknown[];
};
type InstanceType = Record<string, unknown> & Record<symbol, unknown> & { readonly state: State };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transition = (this: InstanceType, ...args: any[]) => State;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoidFunction = (this: InstanceType, ...args: any[]) => void;
type Debouncer = {
	debounce: (wait: number | null) => Promise<State>;
};
type DebouncerWithArgs<T extends unknown[]> = {
	debounce: (wait: number | null, ...args: T) => Promise<State>;
};
type ActionDispatcher = (Transition | VoidFunction) & DebouncerWithArgs<unknown[]>;
type ActionBroker = { [key: Action]: ActionDispatcher };

type ActionFunction = State | Transition | VoidFunction;
type EnterAction<T extends State> = (this: ActionBroker, args: LifecycleArgs<T>) => T | void;
type ExitAction<T extends State> = (this: ActionBroker, args: LifecycleArgs<T>) => void;
type Actions<T extends State = State> = {
	[ENTER]?: EnterAction<T>;
	[EXIT]?: ExitAction<T>;
	[key: Action]: ActionFunction;
};

type States<S extends State = string> = Record<S, Actions<S>>;
type DetectFallBackState<S extends State> = S extends '*' ? string : S;
type ExtractStates<S extends States> = DetectFallBackState<
	Exclude<Exclude<keyof S, symbol>, number>
>;
type ExtractObjectValues<T> = T[keyof T];

type GetActionFunctionMapping<A extends Actions> = {
	[Key in Exclude<keyof A, typeof ENTER | typeof EXIT>]: A[Key] extends State
		? (() => A[Key] extends void ? State : A[Key]) & Debouncer
		: A[Key] extends VoidFunction
			? ((...args: Parameters<A[Key]>) => State) & DebouncerWithArgs<Parameters<A[Key]>>
			: A[Key] extends Transition
				? A[Key] & DebouncerWithArgs<Parameters<A[Key]>>
				: A[Key];
};

type GetActionMapping<S extends States> = ExtractObjectValues<{
	[Key in keyof S]: GetActionFunctionMapping<S[Key]>;
}>;

type ExtractActions<S extends States> = GetActionMapping<S>;
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
	k: infer I
) => void
	? I
	: never;

type StateMachine<T extends State, A> = {
	[Key in keyof A]: A[Key] | ActionDispatcher;
} & {
	readonly state: T;
};

export function createMachine<
	TStates extends Readonly<States>,
	TState extends ExtractStates<TStates>
>(initial: TState, machine: TStates) {
	let state: TState = $state(initial);
	const instance: InstanceType = {
		get state() {
			return state;
		}
	};
	const timeout: Record<Action, ReturnType<typeof setTimeout>> = {};
	const proxy = new Proxy(instance, {
		get(target, property) {
			if (!(property in target) && typeof property === 'string') {
				const invoker: ActionDispatcher = invoke.bind(null, property) as ActionDispatcher;
				invoker.debounce = debounce.bind(null, property);
				target[property] = invoker;
			}
			return target[property];
		}
	}) as StateMachine<ExtractStates<TStates>, UnionToIntersection<ExtractActions<TStates>>>;
	transition(null, initial, null, []);

	function transition(
		oldState: TState | null,
		newState: TState,
		event: Action | null,
		args: unknown[]
	) {
		let metadata: LifecycleArgs<TState> = { from: oldState, to: newState, event, args };

		if (oldState !== null) {
			lifecycle(EXIT, oldState, metadata);
		}
		const hasNotSettled = true;
		while (hasNotSettled) {
			const nextState = lifecycle(ENTER, metadata.to, metadata);
			if (!nextState || nextState === metadata.to) {
				break;
			}
			const from = metadata.to;
			metadata = { from, to: nextState, event, args };
			lifecycle(EXIT, from, metadata);
		}
		if (state !== metadata.to) {
			state = metadata.to;
		}
	}

	function lifecycle(
		stage: typeof ENTER | typeof EXIT,
		forState: TState,
		args: LifecycleArgs<TState>
	) {
		const action = machine[forState]?.[stage] ?? machine['*']?.[stage];
		if (action) {
			return action.call(proxy as unknown as ActionBroker, args) as TState | void;
		}
	}

	function dispatch(event: Action, forState: State, ...args: unknown[]) {
		const action = machine[forState]?.[event] ?? machine['*']?.[event];
		return action instanceof Function
			? action.apply<InstanceType, unknown[], State | void>(proxy, args)
			: action;
	}

	function invoke(event: Action, ...args: unknown[]): State {
		const newState: TState | undefined = dispatch(event, state, ...args)?.valueOf() as
			| TState
			| undefined;
		if ((typeof newState === 'string' || typeof newState === 'symbol') && newState !== state) {
			transition(state, newState, event, args);
		}
		return state;
	}
	/**
	 * Will trigger an event to transition the machine after `wait` milliseconds.
	 * If called again before that time, it will reset the timer. If called with `null`
	 * as a wait parameter, it will cancel any existing timer and not transition.
	 * @param event The event this is bound to.
	 * @param wait Delay in ms to wait before transitioning.
	 * @param args The arguments if any to pass to the transition function.
	 * @returns A promise for the next state.
	 */
	async function debounce(event: Action, wait: number | null, ...args: unknown[]) {
		clearTimeout(timeout[event]);
		if (wait === null) {
			return state;
		} else {
			await new Promise((resolve) => (timeout[event] = setTimeout(resolve, wait)));
			delete timeout[event];
			return invoke(event, ...args);
		}
	}

	return proxy;
}
