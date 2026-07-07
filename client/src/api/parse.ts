import type { ParseResponse } from '@interview-prep/shared';
import { apiClient } from './client';

export function postParseInput(raw: string): Promise<ParseResponse> {
  return apiClient.post<ParseResponse>('/parse', { raw });
}
