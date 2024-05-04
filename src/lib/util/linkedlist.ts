class ListNode<T> {
	value: T;
	next: ListNode<T> | null = null;
	constructor(data: T) {
		this.value = data;
	}
}

export class LinkedList<T> {
	head: ListNode<T> | null = null;
	tail: ListNode<T> | null = null;
	current: ListNode<T> | null = null;
	constructor(iter?: Iterable<T>) {
		if (iter) this.appendAll(iter);
	}

	append(item: T) {
		const node = new ListNode(item);
		// if the head of this linked list is empty add the node as a head
		if (!this.head || !this.tail) {
			this.head = node;
			this.tail = node;
			return;
		}
		this.tail.next = node;
		this.tail = node;
	}

	appendAll(items: Iterable<T>) {
		for (const item of items) {
			this.append(item);
		}
	}

	/**
	 * Inserts a list of items at the current node in the iteration
	 * or at the beginning if not iterating.
	 * @param items A list of items to insert
	 */
	insert(items: T[]) {
		if (!this.head) return this.appendAll(items);
		let ptr = this.current ?? this.head;
		for (let ri = items.length - 1; ri >= 0; ri -= 1) {
			const nn = new ListNode(items[ri]);
			nn.next = ptr;
			ptr = nn;
		}
		if (!this.current || this.current === this.head) this.head = ptr;
		if (this.current) this.current = ptr;
	}

	[Symbol.iterator]() {
		this.current = this.head;

		const next = () => {
			if (!this.current) return { value: undefined, done: true } as const;
			const returnValue = {
				value: this.current.value,
				done: false
			} as const;
			this.current = this.current.next;
			return returnValue;
		};
		return { next };
	}
}
