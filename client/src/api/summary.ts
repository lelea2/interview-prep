import type { TrackerSummary } from '@interview-prep/shared';
import { apiClient } from './client';

export function getSummary(): Promise<TrackerSummary> {
  return apiClient.get<TrackerSummary>('/summary');
}
