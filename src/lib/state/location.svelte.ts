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
	current: Location = $state()!;
	previous: Location | undefined = $state();
	biome: Entity = $state()!;
	primary: string = $state()!;
	secondary: string | undefined = $state();
	#locations: DataManager['locations'];
	#biomes: DataManager['biomes'];

	constructor(
		starting: Location,
		names: string[],
		biome: Entity,
		locations: DataManager['locations'],
		biomes: DataManager['biomes']
	) {
		this.#locations = locations;
		this.#biomes = biomes;
		this.#setLocation(starting, names, biome);
	}

	#setLocation(location: Location, names: string[], biome: Entity) {
		this.previous = this.current;
		this.current = location;
		this.primary = names[0] ?? location.name;
		this.secondary = names[1];
		this.biome = biome;
	}

	async moveTo(location: string | Location) {
		if (typeof location === 'string') {
			location = await this.#locations.get(location);
		}
		const biome = await this.#biomes.get(location.biome);
		const names = await getTopLocationNames(location, this.#locations);
		this.#setLocation(location, names, biome);
		return location;
	}

	nameAlreadyShown(name: string) {
		return name === (this.secondary == null ? this.primary : this.secondary);
	}
}
export type LocationManager = LocationManagerImpl;

const DEFAULT_STARTING_LOCATION = 'opening';

/**
 * Singleton location manager.
 */
let manager: LocationManager | undefined;
export async function getLocationManager(
	data: DataManager,
	starting = DEFAULT_STARTING_LOCATION
): Promise<LocationManager> {
	if (!manager) {
		const loc = await data.locations.get(starting);
		const biome = await data.biomes.get(loc.biome);
		const names = await getTopLocationNames(loc, data.locations);
		manager = new LocationManagerImpl(loc, names, biome, data.locations, data.biomes);
	}
	return manager;
}
