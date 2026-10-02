import type { Entity, Location, NpcInstance, NpcTemplate, ShopItem } from '$lib/types';

/** Static fields are read from a frozen definition. Only explicitly supported overrides are writable. */
class RuntimeEntity<T extends Entity> {
	constructor(private readonly source: Readonly<T>) {}
	get definition() {
		return this.source;
	}
	get id() {
		return this.definition.id;
	}
	get name() {
		return this.definition.name;
	}
	get image() {
		return this.definition.image;
	}
	get icon() {
		return this.definition.icon;
	}
	get desc() {
		return this.definition.desc;
	}
	get effects() {
		return this.definition.effects;
	}
	get enter() {
		return this.definition.enter;
	}
	get exit() {
		return this.definition.exit;
	}
}
export class RuntimeShopItem {
	stock = $state(0);
	constructor(private readonly source: Readonly<ShopItem>) {
		this.stock = source.stock;
	}
	get definition() {
		return this.source;
	}
	get item() {
		return this.definition.item;
	}
	get cost() {
		return this.definition.cost;
	}
	get willBuy() {
		return this.definition.willBuy;
	}
}
export class RuntimeLocation extends RuntimeEntity<Location> {
	#desc: string | undefined = $state();
	#shop: RuntimeShopItem[] | undefined;
	get shop() {
		return this.#shop;
	}
	constructor(definition: Readonly<Location>) {
		super(definition);
		this.#desc = definition.desc;
		this.#shop = definition.shop?.map((item) => new RuntimeShopItem(item));
		if (this.shop) Object.freeze(this.shop);
	}
	get desc() {
		return this.#desc;
	}
	set desc(value: string | undefined) {
		this.#desc = value;
	}
	get trade() {
		return this.definition.trade;
	}
	get biome() {
		return this.definition.biome;
	}
	get parent() {
		return this.definition.parent;
	}
	get choices() {
		return this.definition.choices;
	}
	get coins() {
		return this.definition.coins;
	}
	get items() {
		return this.definition.items;
	}
}
export class RuntimeNpc extends RuntimeEntity<NpcTemplate> {
	hp = $state(0);
	constructor(definition: Readonly<NpcTemplate> | Readonly<NpcInstance>) {
		super(definition);
		this.hp = 'hp' in definition ? definition.hp : definition.maxHp;
	}
	get maxHp() {
		return this.definition.maxHp;
	}
	get exp() {
		return this.definition.exp;
	}
	get coins() {
		return this.definition.coins;
	}
	get items() {
		return this.definition.items;
	}
	get lootTables() {
		return this.definition.lootTables;
	}
	get defend() {
		return this.definition.defend;
	}
}
