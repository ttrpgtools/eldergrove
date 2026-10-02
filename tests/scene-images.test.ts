import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectSceneImages, createImagePreloader } from '../src/lib/scene-images';
import { createGameState } from '../src/lib/state/game.svelte';
import { yearlings } from '../src/lib/games/yearlings';
import { validateAdventure } from '../src/lib/content';

beforeEach(() => {
	vi.stubGlobal('localStorage', { getItem: () => null });
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('possible next scene artwork', () => {
	it('validates image hints in both location choices and nested dialogs', () => {
		const game = {
			...yearlings,
			locations: [
				{
					...yearlings.locations[0],
					choices: [{ label: 'Bad hint', actions: [], preloadImages: ['javascript:bad'] }]
				},
				...yearlings.locations.slice(1)
			]
		};
		expect(() => validateAdventure(game)).toThrow('preloadImages[0]');
		game.locations[0].choices = [
			{
				label: 'Dialog',
				actions: [
					{
						action: 'dialogStart',
						arg: {
							choices: [
								{
									label: 'Bad nested hint',
									actions: [],
									preloadImages: ['javascript:bad']
								}
							]
						}
					}
				]
			}
		];
		expect(() => validateAdventure(game)).toThrow('preloadImages[0]');
	});
	it('finds real Yearlings travel and exploration images without changing the session', async () => {
		const state = await createGameState(yearlings);
		const before = JSON.stringify(state.toJSON());
		const roll = vi.spyOn(state, 'roll');
		const images = collectSceneImages(state, state.availableChoices);
		expect(images).toContain('/img/npc/rat.webp');
		expect(images).toContain('/img/location/rocky-area.webp');
		expect(images).not.toContain('/img/location/grassy-field.webp');
		expect(images).not.toContain('/img/location/doomed-woods.webp');
		expect(new Set(images).size).toBe(images.length);
		expect(roll).not.toHaveBeenCalled();
		expect(JSON.stringify(state.toJSON())).toBe(before);
	});
	it('inspects nested possibilities, return travel, hints and entry hooks without executing hooks', async () => {
		const state = await createGameState(yearlings);
		const hook = vi.fn();
		const condition = vi.fn(() => true);
		await state.location.moveTo('yearlings/rocky-area');
		const images = collectSceneImages(state, [
			{ label: 'Dynamic', actions: hook, preloadImages: ['/img/custom.webp'] },
			{
				label: 'Branch',
				actions: [
					{
						action: 'branch',
						arg: {
							on: condition,
							isTrue: [{ action: 'locationReturn' }],
							isFalse: [
								{
									action: 'yesno',
									arg: {
										yes: [{ action: 'encounterStart', arg: { npc: 'yearlings/rat' } }],
										no: [{ action: 'locationChange', arg: 'yearlings/unknown' }]
									}
								}
							]
						}
					}
				]
			}
		]);
		expect(images).toContain('/img/custom.webp');
		expect(images).toContain('/img/location/grassy-field.webp');
		expect(images).toContain('/img/npc/rat.webp');
		expect(hook).not.toHaveBeenCalled();
		expect(condition).not.toHaveBeenCalled();
	});
	it('includes the destination biome and immediate declarative entry encounter', async () => {
		const game = {
			...yearlings,
			locations: yearlings.locations.map((location) =>
				location.id === 'yearlings/rocky-area'
					? {
							...location,
							enter: [
								{
									action: 'encounterRandomNpc' as const,
									arg: {
										table: {
											formula: 'd2',
											options: [
												{ trigger: 1, value: 'yearlings/rat' },
												{ trigger: 2, value: 'yearlings/rat' }
											]
										}
									}
								}
							]
						}
					: location
			)
		};
		const state = await createGameState(game);
		const images = collectSceneImages(state, [
			{ label: 'Go', actions: [{ action: 'locationChange', arg: 'yearlings/rocky-area' }] }
		]);
		expect(images).toContain(state.data.biomes.values.find((biome) => biome.id === 'rocky')!.image);
		expect(images.filter((image) => image === '/img/npc/rat.webp')).toHaveLength(1);
		expect(state.npc.current).toBeUndefined();
	});
});

describe('background image queue', () => {
	let requests: FakeImage[];
	class FakeImage {
		src = '';
		fetchPriority = '';
		decoding = '';
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		constructor() {
			requests.push(this);
		}
	}
	beforeEach(() => {
		requests = [];
		vi.useFakeTimers();
		vi.stubGlobal('Image', FakeImage);
		vi.stubGlobal('navigator', { connection: { saveData: false } });
	});
	it('limits concurrency, deduplicates, caches successes, and retries failures on a later update', () => {
		const loader = createImagePreloader();
		loader.update(['/a.webp', '/a.webp', '/b.webp', '/c.webp']);
		vi.advanceTimersByTime(150);
		expect(requests.map((image) => image.src)).toEqual(['/a.webp', '/b.webp']);
		expect(requests[0].fetchPriority).toBe('low');
		requests[0].onload!();
		expect(requests[2].src).toBe('/c.webp');
		requests[1].onerror!();
		requests[2].onload!();
		loader.update(['/a.webp', '/b.webp', '/c.webp']);
		vi.advanceTimersByTime(150);
		expect(requests.map((image) => image.src)).toEqual([
			'/a.webp',
			'/b.webp',
			'/c.webp',
			'/b.webp'
		]);
	});
	it('replaces pending work and clears queued work on cleanup', () => {
		const loader = createImagePreloader();
		loader.update(['/old.webp']);
		loader.update(['/a.webp', '/b.webp', '/queued.webp']);
		vi.advanceTimersByTime(150);
		loader.clear();
		requests.forEach((image) => image.onload!());
		expect(requests.map((image) => image.src)).toEqual(['/a.webp', '/b.webp']);
		loader.update(['/cancelled.webp']);
		loader.clear();
		vi.runAllTimers();
		expect(requests).toHaveLength(2);
	});
	it('skips speculative requests when data saving is enabled or there is no browser', () => {
		vi.stubGlobal('navigator', { connection: { saveData: true } });
		createImagePreloader().update(['/a.webp']);
		vi.runAllTimers();
		expect(requests).toHaveLength(0);
		vi.stubGlobal('Image', undefined);
		expect(() => createImagePreloader().update(['/a.webp'])).not.toThrow();
	});
});
