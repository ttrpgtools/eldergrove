import type { Location } from '$lib/types';
import { locations as yearlings } from '$lib/games/yearlings';
import { locations as discovery } from '$lib/games/discovery';

const locations: Location[] = [...discovery, ...yearlings];
const locationMap = new Map<string, Location>(locations.map((loc) => [loc.id, loc]));

export async function getLocation(id: string): Promise<Location> {
	const loc = locationMap.get(id);
	if (!loc) throw `Unknown location ${id}`;
	return Promise.resolve(loc);
}
