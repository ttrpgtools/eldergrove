type EventCallback<T> = (arg: T) => void;

export class EventEmitter<Events extends object> {
	private events: { [K in keyof Events]?: EventCallback<Events[K]>[] } = {};

	on<K extends keyof Events>(event: K, listener: EventCallback<Events[K]>): () => void {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event]!.push(listener);

		// Return an unsubscribe function
		return () => {
			this.events[event] = this.events[event]!.filter((l) => l !== listener);
		};
	}

	emit<K extends keyof Events>(event: K, arg: Events[K]): void {
		if (!this.events[event]) return;

		this.events[event]!.forEach((listener) => listener(arg));
	}
}
