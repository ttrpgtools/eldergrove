import type { Entity } from '$lib/types';

const biomes: Entity[] = [
	{
		id: 'meadow',
		name: 'Sunny Meadow',
		image: '/img/biome/sunny-meadow.webp'
	},
	{
		id: 'town',
		name: 'Town',
		image: '/img/biome/town.webp'
	},
	{
		id: 'beach',
		name: 'Beach',
		image: '/img/biome/beach.webp'
	},
	{
		id: 'rocky',
		name: 'Rocky',
		image: '/img/biome/rocky.webp'
	},
	{
		id: 'forest',
		name: 'Forest',
		image: '/img/biome/forest.webp'
	}
];
const biomeMap = new Map<string, Entity>(biomes.map((bio) => [bio.id, bio]));

export function getBiome(id: string) {
	const bio = biomeMap.get(id);
	if (!bio) throw `Unknown biome ${id}`;
	return Promise.resolve(bio);
}
