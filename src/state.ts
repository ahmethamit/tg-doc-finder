import { signal } from '@preact/signals';
import type { DocResult } from './telegram/types';

// The result card the user tapped; null = show the search screen.
export const selected = signal<DocResult | null>(null);
