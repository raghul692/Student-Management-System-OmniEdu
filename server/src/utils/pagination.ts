export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
  maxLimit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number | string;
  maxLimit?: number;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Standardizes offset-based pagination options with a safe upper bound limit.
 */
export function sanitizePagination(params: PaginationParams) {
  const maxLimit = params.maxLimit || 100;
  const rawPage = parseInt(String(params.page || '1'), 10);
  const rawLimit = parseInt(String(params.limit || '20'), 10);

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Wraps list data and total count into a standard PaginatedResponse.
 */
export function buildPaginationResponse<T>(data: T[], total: number, page: number, limit: number): PaginationResult<T> {
  const totalPages = Math.ceil(total / (limit || 1)) || 1;
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Standardizes cursor-based pagination parameters with a safe upper bound limit.
 */
export function sanitizeCursorPagination(params: CursorPaginationParams) {
  const maxLimit = params.maxLimit || 100;
  const rawLimit = parseInt(String(params.limit || '20'), 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, maxLimit);

  return {
    cursor: params.cursor ? { id: params.cursor } : undefined,
    take: limit + 1, // Fetch 1 extra to check for hasMore
    limit,
  };
}

/**
 * Evaluates cursor pagination results and computes nextCursor.
 */
export function buildCursorPaginationResponse<T extends { id: string }>(
  items: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

  return {
    data,
    nextCursor,
    hasMore,
  };
}
