import { apiClient } from "../../shared/api/client";
import { readPaginated, type Paginated } from "../../shared/lib/guards";
import { isIncidentListItem, type IncidentListItem } from "./types";

export const SEARCH_QUERY_MAX_LENGTH = 50;

type IncidentListParams = {
  q?: string;
  page?: number;
  signal?: AbortSignal;
};

export async function fetchIncidents({
  q,
  page,
  signal,
}: IncidentListParams = {}): Promise<Paginated<IncidentListItem>> {
  const query = q?.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
  const response = await apiClient.get<unknown>("/incidents/", {
    params: { q: query || undefined, page },
    signal,
  });
  return readPaginated(response.data, isIncidentListItem);
}
