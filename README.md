# Eldergrove

I'm going to use this as a place for some notes about what it is that I'm building here.

Basically I'm making a "simple" single adventurer RPG game. I'm going to attempt to separate the UI and the content as much as possible.

At the top level, I'm thinking something like:

```svelte
<Game>
  <AppMenu/>

  <Character>

  </Character>
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