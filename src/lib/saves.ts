import { resolveRules } from './rules';
import type { CharDef, GameDef, Gear } from './types';

export const SAVE_VERSION = 1;

/** Persistent world fields. Interaction stacks and random encounters are transient. */
export interface Checkpoint {
	version: typeof SAVE_VERSION;
	adventureId: string;
	contentVersion: number;
	character: CharDef;
	location: string;
	previousLocation: string | null;
	world: {
		locations: { id: string; desc: string | null; stock?: number[] }[];
		npcs: { id: string; hp: number }[];
	};
}

const slots: (keyof Gear)[] = ['right', 'left', 'head', 'torso', 'feet'];

function record(value: unknown, field: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Invalid checkpoint field: ${field}.`);
	}
	return value as Record<string, unknown>;
}

function text(value: unknown, field: string, allowEmpty = false): string {
	if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
		throw new Error(`Invalid checkpoint field: ${field}.`);
	}
	return value;
}

function integer(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
		throw new Error(`Invalid checkpoint field: ${field}.`);
	}
	return value;
}

function list(value: unknown, field: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`Invalid checkpoint field: ${field}.`);
	return value;
}

function pair(value: unknown, field: string): unknown[] {
	const result = list(value, field);
	if (result.length !== 2) throw new Error(`Invalid checkpoint field: ${field}.`);
	return result;
}

function unique(value: string, seen: Set<string>, field: string) {
	if (seen.has(value)) throw new Error(`Duplicate checkpoint field: ${field}.`);
	seen.add(value);
}

function character(value: unknown, game: GameDef, legacy: boolean): CharDef {
	const char = record(value, 'character');
	const maxHp = integer(char.maxHp, 'maxHp', 1);
	const itemIds = new Set(game.items.map((item) => item.id));
	const knownItem = (value: unknown) => {
		const id = text(value, 'item ID');
		if (!itemIds.has(id)) throw new Error(`The checkpoint references an unavailable item: ${id}.`);
		return id;
	};
	const inventoryIds = new Set<string>();
	const inventory: CharDef['inventory'] = list(char.inventory, 'inventory').map((entry) => {
		const [item, quantity] = pair(entry, 'inventory entry');
		const id = knownItem(item);
		unique(id, inventoryIds, 'inventory item');
		return [id, integer(quantity, 'item quantity', 1)];
	});
	const equippedSlots = new Set<string>();
	const equip: CharDef['equip'] = [];
	for (const entry of list(char.equip, 'equipment')) {
		const [item, slot] = pair(entry, 'equipment entry');
		if (!slots.includes(slot as keyof Gear)) throw new Error('Invalid checkpoint equipment slot.');
		unique(slot as string, equippedSlots, 'equipment slot');
		// Old saves emitted empty IDs after unequipping. This is the only lossy
		// normalization: the slot was already empty, so no item is discarded.
		if (legacy && item === '') continue;
		equip.push([knownItem(item), slot as keyof Gear]);
	}
	const flags = new Set<string>();
	for (const flag of list(char.flags === undefined ? [] : char.flags, 'flags')) {
		unique(text(flag, 'flag'), flags, 'flag');
	}
	const counterIds = new Set<string>();
	const counters: NonNullable<CharDef['counters']> = list(
		char.counters === undefined ? [] : char.counters,
		'counters'
	).map((entry) => {
		const [key, value] = pair(entry, 'counter entry');
		const id = text(key, 'counter ID');
		unique(id, counterIds, 'counter ID');
		return [id, integer(value, 'counter value', Number.MIN_SAFE_INTEGER)];
	});
	return {
		name: text(char.name, 'name'),
		hp: integer(legacy && char.hp === undefined ? maxHp : char.hp, 'hp', 1, maxHp),
		maxHp,
		coin: integer(char.coin, 'coin'),
		str: integer(char.str, 'strength'),
		dex: integer(char.dex, 'dexterity'),
		wil: integer(char.wil, 'willpower'),
		xp: integer(char.xp, 'experience'),
		level: integer(char.level, 'level', 1, resolveRules(game).progression.maxLevel),
		inventory,
		equip,
		flags: [...flags],
		counters
	};
}

/** Validate structure, numeric ranges, adventure identity, and entity references. */
export function validateCheckpoint(value: unknown, game: GameDef, legacy = false): Checkpoint {
	const save = record(value, 'checkpoint');
	if (save.version !== SAVE_VERSION)
		throw new Error('This checkpoint uses an unsupported save version.');
	if (save.adventureId !== game.id)
		throw new Error('This checkpoint belongs to a different adventure.');
	const contentVersion = integer(save.contentVersion, 'content version', 1);
	if (contentVersion !== (game.contentVersion ?? 1)) {
		throw new Error('This checkpoint belongs to a different version of this adventure.');
	}
	const locations = new Map(game.locations.map((location) => [location.id, location]));
	const locationId = (value: unknown) => {
		const id = text(value, 'location ID');
		if (!locations.has(id))
			throw new Error(`The checkpoint references an unavailable location: ${id}.`);
		return id;
	};
	const world = record(save.world, 'world');
	const changedLocations = new Set<string>();
	const worldLocations: Checkpoint['world']['locations'] = list(
		world.locations,
		'world locations'
	).map((entry) => {
		const location = record(entry, 'world location');
		const id = locationId(location.id);
		unique(id, changedLocations, 'world location');
		const desc = location.desc === null ? null : text(location.desc, 'description', true);
		const result: Checkpoint['world']['locations'][number] = { id, desc };
		if (location.stock !== undefined) {
			const stock = list(location.stock, 'shop stock');
			const shop = locations.get(id)!.shop;
			if (!shop || stock.length !== shop.length)
				throw new Error('The checkpoint shop layout has changed.');
			result.stock = stock.map((count) => integer(count, 'shop stock'));
		}
		return result;
	});
	const npcs = new Map(game.npcInstances.map((npc) => [npc.id, npc]));
	const changedNpcs = new Set<string>();
	const worldNpcs = list(world.npcs, 'world NPCs').map((entry) => {
		const npc = record(entry, 'world NPC');
		const id = text(npc.id, 'NPC ID');
		const definition = npcs.get(id);
		if (!definition) throw new Error(`The checkpoint references an unavailable NPC: ${id}.`);
		unique(id, changedNpcs, 'world NPC');
		return { id, hp: integer(npc.hp, 'NPC health', 0, definition.maxHp) };
	});
	return {
		version: SAVE_VERSION,
		adventureId: game.id,
		contentVersion,
		character: character(save.character, game, legacy),
		location: locationId(save.location),
		previousLocation: save.previousLocation === null ? null : locationId(save.previousLocation),
		world: { locations: worldLocations, npcs: worldNpcs }
	};
}

/** Legacy migration is in memory only; the source checkpoint stays untouched. */
export function parseCheckpoint(raw: string, game: GameDef): Checkpoint {
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		throw new Error('The saved checkpoint contains unreadable data.');
	}
	const save = record(value, 'checkpoint');
	if (save.version === undefined) {
		if ('adventureId' in save || 'contentVersion' in save || 'world' in save) {
			throw new Error('The checkpoint is missing its save version.');
		}
		const checkpoint = validateCheckpoint(
			{
				version: SAVE_VERSION,
				adventureId: game.id,
				contentVersion: 1,
				character: save.character,
				location: save.location,
				previousLocation: null,
				world: { locations: [], npcs: [] }
			},
			{ ...game, contentVersion: 1 },
			true
		);
		return validateCheckpoint(
			game.migrateCheckpoint ? game.migrateCheckpoint(checkpoint) : checkpoint,
			game
		);
	}
	return validateCheckpoint(game.migrateCheckpoint ? game.migrateCheckpoint(save) : save, game);
}
