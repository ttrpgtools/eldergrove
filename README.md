# Eldergrove

I'm going to use this as a place for some notes about what it is that I'm building here.

Basically I'm making a "simple" single adventurer RPG game. I'm going to attempt to separate the UI and the content as much as possible.

At the top level, I'm thinking something like:

```svelte
<Game>
	<AppMenu />

	<Character></Character>
</Game>
```

How much stuff in the URL?

UI Modes

- Viewing Map
- Battle
- NPC Conversation
  - May involve a transaction
- Scene Overview
  - Overworld Tile
  - Town
  - Dungeon Room

Game State

- Active Location
  - With BG image
- Current Scene
-

## Random encounters and loot

`rollOnTable` evaluates one table; `rollOnTables` rolls each table independently and
combines the results in order, keeping duplicates. Tables use inclusive trigger
ranges, optional dice formulas, and optional `active` conditions. A roll with no
matching active entry returns no result. The same table format is used for random
encounters (`encounterRandomNpc`) and item drops.

NPCs can declare an `items` table and optional `lootTables`. Creature loot rolls
the existing `items` table once plus each `lootTables` entry once. Treasure chests
and room searches can use `lootGrant` directly without an NPC:

```ts
const chestChoice = {
	label: 'Open chest',
	show: { condition: 'flagIsNotSet', arg: 'room/chest-open' },
	actions: [
		{
			action: 'lootGrant',
			arg: [
				{ formula: '1', options: [{ trigger: 1, value: 'potion' }] },
				{ formula: 'd6', options: [{ trigger: 6, value: 'rare-sword' }] }
			]
		},
		{ action: 'flagSet', arg: 'room/chest-open' }
	]
} satisfies Choice;
```

Import `Choice` from `$lib/types`. Item IDs must exist in the adventure. Repeated
results increase the inventory quantity. Gate one-time treasure with a saved flag,
as above. Independent tables can also be evaluated in custom encounter hooks with
`rollOnTables(tables, { state })` from `$util/table`.

## Next-scene image loading

The game view preloads artwork referenced by available declarative travel,
encounter, item-find, and dialog choices, including nested alternatives and
destination entry actions. It includes destination biome backgrounds and does not
execute actions, hooks, or dice rolls to predict outcomes. Yearlings exploration
uses declarative encounter tables so its possible creature artwork is discoverable.

For function-based choices, add `preloadImages: ['/img/location/treasure-room.webp']`
to the choice. These paths are checked by content validation. Function bodies are
not inspected or executed. Preloading waits briefly after a choice change, requests
at most two images at once with low priority, and skips requests when the browser's
data-saving preference is enabled. It caches successful requests within the view,
limits candidates to sixteen images, and clears queued work on navigation.
