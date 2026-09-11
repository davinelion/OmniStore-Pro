/** Pagination envelope shared by every list endpoint. */
export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** Standard list response. `items` are domain models. */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

/** Machine-readable OmniSource API error. */
export interface ApiError {
  status: number;
  code: string;
  message: string;
}

/** Result of a request that may fail gracefully. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export const EMPTY_PAGINATION: Pagination = {
  page: 1,
  perPage: 0,
  total: 0,
  totalPages: 0,
};

export function paginated<T>(items: T[], pagination?: Partial<Pagination>): Paginated<T> {
  const total = pagination?.total ?? items.length;
  const perPage = pagination?.perPage ?? items.length;
  return {
    items,
    pagination: {
      page: pagination?.page ?? 1,
      perPage,
      total,
      totalPages: pagination?.totalPages ?? (perPage > 0 ? Math.ceil(total / perPage) : 0),
    },
  };
}
