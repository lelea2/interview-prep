import type {
  AddRowRequest,
  BulkInsertRequest,
  BulkInsertResponse,
  TrackerRow,
  UpdateRowRequest,
} from '@interview-prep/shared';
import { apiClient } from './client';

export function getRows(): Promise<TrackerRow[]> {
  return apiClient.get<TrackerRow[]>('/rows');
}

export function addRow(opportunityId?: string): Promise<TrackerRow> {
  const body: AddRowRequest = opportunityId ? { opportunityId } : {};
  return apiClient.post<TrackerRow>('/rows', body);
}

export function updateRow(id: string, fields: UpdateRowRequest['fields']): Promise<TrackerRow> {
  const body: UpdateRowRequest = { fields };
  return apiClient.patch<TrackerRow>(`/rows/${id}`, body);
}

export function deleteRow(id: string): Promise<void> {
  return apiClient.delete(`/rows/${id}`);
}

export function bulkInsertRows(rows: TrackerRow[]): Promise<BulkInsertResponse> {
  const body: BulkInsertRequest = { rows };
  return apiClient.post<BulkInsertResponse>('/rows/bulk', body);
}
