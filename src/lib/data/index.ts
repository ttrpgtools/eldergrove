import {
	type Entity,
	type Item,
	type Identifiable,
	type Location,
	type NpcTemplate,
	type NpcInstance
} from '$lib/types';

class DataCollection<T extends Identifiable> {
	#collection = new Map<string, T>();
	add(items: T[]) {
		items.forEach((x) => this.#collection.set(x.id, x));
	}

	async get(id: string): Promise<T> {
		const item = this.#collection.get(id);
		if (!item) throw `Unknown ${id}`;
		return Promise.resolve(item);
	}
}

class TemplateDataCollection<TTemplate extends Identifiable, TInstance extends Identifiable> {
	#templates = new Map<string, TTemplate>();
	#instances = new Map<string, TInstance>();
	#name: string;
	#makeInstance: (tmpl: TTemplate) => TInstance;
	constructor(name: string, makeInstance: (tmpl: TTemplate) => TInstance) {
		this.#name = name;
		this.#makeInstance = makeInstance;
	}

	addTemplate(items: TTemplate[]) {
		items.forEach((x) => this.#templates.set(x.id, x));
	}

	addInstance(items: TInstance[]) {
		items.forEach((x) => this.#instances.set(x.id, x));
	}

	async get(id: string): Promise<TInstance> {
		const instance = this.#instances.get(id);
		if (instance) return Promise.resolve(instance);
		const template = this.#templates.get(id);
		if (!template) throw `Unknown ${this.#name} ${id}`;
		return Promise.resolve(this.#makeInstance(template));
	}
}

export class DataManager {
	locations = new DataCollection<Location>();
	items = new DataCollection<Item>();
	biomes = new DataCollection<Entity>();
	npcs = new TemplateDataCollection<NpcTemplate, NpcInstance>('npc', (x) => ({
		...x,
		hp: x.maxHp
	}));
}
