import type { Choice } from '$lib/types';
import { locationReturn } from './location';

export const BACK = (label = 'Leave') => ({ label, actions: (s) => locationReturn(s) }) as Choice;
