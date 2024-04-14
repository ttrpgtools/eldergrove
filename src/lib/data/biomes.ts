import type { Entity } from '$lib/types';

const biomes: Entity[] = [
	{
		id: 'meadow',
		name: 'Sunny Meadow',
		image: '/img/sunny-meadow.webp'
	},
	{
		id: 'town',
		name: 'Town',
		image: '/img/town.webp'
	},
	{
		id: 'beach',
		name: 'Beach',
		image: '/img/beach.webp'
	}
];
const biomeMap = new Map<string, Entity>(biomes.map((bio) => [bio.id, bio]));

export function getBiome(id: string) {
	const bio = biomeMap.get(id);
	if (!bio) throw `Unknown biome ${id}`;
	return Promise.resolve(bio);
}
