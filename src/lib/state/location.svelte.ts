import type { RuntimeLocation } from './world.svelte';
import type { Entity, Location } from '$lib/types';
import type { DataManager } from '$data/index';

async function getTopLocationNames(
	s: Location,
	locations: DataManager['locations']
): Promise<string[]> {
	const names: string[] = [s.name];
	while (s.parent) {
		s = await locations.get(s.parent);
		names.unshift(s.name);
	}
	return names;
}

/**
 * You are always somewhere. This can help you find out where.
 */
class LocationManagerImpl {
	current: RuntimeLocation = $state()!;
	previous: RuntimeLocation | undefined = $state();
	biome: Entity = $state()!;
	primary: string = $state()!;
	secondary: string | undefined = $state();
	#locations: DataManager['locations'];
	#biomes: DataManager['biomes'];

	constructor(
		starting: RuntimeLocation,
		names: string[],
		biome: Entity,
		locations: DataManager['locations'],
		biomes: DataManager['biomes']
	) {
		this.#locations = locations;
		this.#biomes = biomes;
		this.#setLocation(starting, names, biome);
	}

	#setLocation(location: RuntimeLocation, names: string[], biome: Entity) {
		this.previous = this.current;
		this.current = location;
		this.primary = names[0] ?? location.name;
		this.secondary = names[1];
		this.biome = biome;
	}

	async moveTo(location: string | Location) {
		const current = await this.#locations.get(
			typeof location === 'string' ? location : location.id
		);
		const biome = await this.#biomes.get(current.biome);
		const names = await getTopLocationNames(current, this.#locations);
		this.#setLocation(current, names, biome);
		return current;
	}

	nameAlreadyShown(name: string) {
		return name === (this.secondary == null ? this.primary : this.secondary);
	}
}
export type LocationManager = LocationManagerImpl;

const DEFAULT_STARTING_LOCATION = 'opening';

export async function createLocationManager(
	data: DataManager,
	starting = DEFAULT_STARTING_LOCATION
): Promise<LocationManager> {
	const loc = await data.locations.get(starting);
	const biome = await data.biomes.get(loc.biome);
	const names = await getTopLocationNames(loc, data.locations);
	return new LocationManagerImpl(loc, names, biome, data.locations, data.biomes);
}
