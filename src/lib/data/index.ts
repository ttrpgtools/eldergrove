import {
	type Entity,
	type Item,
	type Identifiable,
	type Location,
	type NpcTemplate,
	type NpcInstance
} from '$lib/types';
import { RuntimeLocation, RuntimeNpc } from '$state/world.svelte';
import { immutableSnapshot } from '$lib/definitions';

class DataCollection<T extends Identifiable, TDefinition extends Identifiable = T> {
	constructor(private make: (definition: TDefinition) => T = (x) => x as unknown as T) {}
	#collection = new Map<string, T>();
	get values(): T[] {
		return [...this.#collection.values()];
	}
	add(items: readonly TDefinition[]) {
		items.forEach((x) => this.#collection.set(x.id, this.make(x)));
	}

	async get(id: string): Promise<T> {
		const item = this.#collection.get(id);
		if (!item) throw new Error(`Unknown entity ID: ${id}`);
		return Promise.resolve(item);
	}
}

class TemplateDataCollection<TTemplate extends Identifiable, TInstance extends Identifiable> {
	#templates = new Map<string, TTemplate>();
	#instances = new Map<string, TInstance>();
	get instances(): TInstance[] {
		return [...this.#instances.values()];
	}
	#name: string;
	#makeInstance: (tmpl: TTemplate | NpcInstance) => TInstance;
	constructor(name: string, makeInstance: (tmpl: TTemplate | NpcInstance) => TInstance) {
		this.#name = name;
		this.#makeInstance = makeInstance;
	}

	addTemplate(items: TTemplate[]) {
		items.forEach((x) => this.#templates.set(x.id, immutableSnapshot(x) as TTemplate));
	}

	addInstance(items: NpcInstance[]) {
		items.forEach((x) => this.#instances.set(x.id, this.#makeInstance(x)));
	}

	async get(id: string): Promise<TInstance> {
		const instance = this.#instances.get(id);
		if (instance) return Promise.resolve(instance);
		const template = this.#templates.get(id);
		if (!template) throw new Error(`Unknown ${this.#name} ID: ${id}`);
		return Promise.resolve(this.#makeInstance(template));
	}
}

export class DataManager {
	locations = new DataCollection<RuntimeLocation, Location>(
		(x) => new RuntimeLocation(immutableSnapshot(x) as Location)
	);
	items = new DataCollection<Item>((x) => immutableSnapshot(x) as Item);
	biomes = new DataCollection<Entity>((x) => immutableSnapshot(x) as Entity);
	npcs = new TemplateDataCollection<NpcTemplate, RuntimeNpc>(
		'npc',
		(x) => new RuntimeNpc(immutableSnapshot(x) as NpcTemplate | NpcInstance)
	);
}
