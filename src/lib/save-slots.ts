import { parseCheckpoint, type Checkpoint } from './saves';
import type { GameDef } from './types';

export const SAVE_SLOT_COUNT = 5;
export interface SaveSlot {
	number: number;
	raw: string | null;
	checkpoint?: Checkpoint;
	savedAt?: string;
	error?: string;
}

/** Slot one retains the original key, so existing saves appear without rewriting storage. */
export function saveSlotKey(adventureId: string, slot: number) {
	if (!Number.isInteger(slot) || slot < 1 || slot > SAVE_SLOT_COUNT) {
		throw new Error('Choose a save slot from 1 to 5.');
	}
	return slot === 1 ? `gameSave:${adventureId}` : `gameSave:${adventureId}:slot:${slot}`;
}

export function readSaveSlots(game: GameDef): SaveSlot[] {
	return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => {
		const number = index + 1;
		const raw = localStorage.getItem(saveSlotKey(game.id, number));
		if (raw === null) return { number, raw };
		try {
			const checkpoint = parseCheckpoint(raw, game);
			const value = JSON.parse(raw);
			const savedAt =
				typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt))
					? value.savedAt
					: undefined;
			return { number, raw, checkpoint, savedAt };
		} catch (error) {
			return {
				number,
				raw,
				error: error instanceof Error ? error.message : 'This save could not be read.'
			};
		}
	});
}
