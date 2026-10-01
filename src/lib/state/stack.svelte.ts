export class Stack<T> {
	#items: T[] = $state([]);

	get current() {
		return this.#items.at(-1);
	}

	currentOrDefault(def: T) {
		return this.#items.at(-1) ?? def;
	}

	push(item: T) {
		this.#items.push(item);
	}

	pop() {
		return this.#items.pop();
	}

	/** Remove an owned frame without disturbing newer interactions above it. */
	remove(item: T) {
		const index = this.#items.indexOf(item);
		if (index !== -1) this.#items.splice(index, 1);
	}

	clear() {
		this.#items = [];
	}

	set(item: T) {
		this.#items = [item];
	}

	get depth() {
		return this.#items.length;
	}
}
