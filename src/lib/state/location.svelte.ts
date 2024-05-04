import { getLocation } from '$lib/data/locations';
import type { Entity, Location } from '$lib/types';
import { getBiome } from '$data/biomes';

async function getTopLocationNames(s: Location): Promise<string[]> {
	const names: string[] = [s.name];
	while (s.parent) {
		s = await getLocation(s.parent);
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

	constructor(starting: Location, names: string[], biome: Entity) {
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
			location = await getLocation(location);
		}
		const biome = await getBiome(location.biome);
		const names = await getTopLocationNames(location);
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
	starting = DEFAULT_STARTING_LOCATION
): Promise<LocationManager> {
	if (!manager) {
		const loc = await getLocation(starting);
		const biome = await getBiome(loc.biome);
		const names = await getTopLocationNames(loc);
		manager = new LocationManagerImpl(loc, names, biome);
	}
	return manager;
}
