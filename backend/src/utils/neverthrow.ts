import { ok, ResultAsync, type Result } from "neverthrow";
import { log } from "../plugins/logger/logger";

export type PResult<T, E> = Promise<Result<T, E>>;

export type QueryError = {
  type: "QUERY_ERROR";
  cause: Error;
};

// TODO вынести куда-нибудь
function errorToObject(err: Error) {
  return { message: err.message, cause: err.cause, name: err.name, stack: err.stack };
}

export function safeQuery<T>(query: Promise<T>): ResultAsync<T, QueryError> {
  return ResultAsync.fromPromise(query, e => {
    const err = errorToObject(e as Error);
    // log.error("Ошибка запроса к базе данных {message} ", err)

    log.error("Ошибка запроса к базе данных {*}", err);
    return { type: "QUERY_ERROR", cause: err } satisfies QueryError;
  });
}

/**
 * Converts a Promise<Result<T, E>> into ResultAsync<T, E>
 * Assumes the promise never rejects (only resolves with a Result)
 *
 * @param promiseResult - A promise that resolves to a Result<T, E>
 * @returns ResultAsync<T, E>
 */
export function toResultAsync<T, E>(promiseResult: Promise<Result<T, E>>): ResultAsync<T, E> {
  return ResultAsync.fromPromise(promiseResult, error => {
    throw error;
  }).andThen(result => result);
}

import axios, { AxiosError } from "axios";

// Type-safe error wrapper
export type AxiosResponseError = {
  type: "NETWORK_ERROR" | "AXIOS_ERROR_400" | "AXIOS_ERROR_500" | "AXIOS_ERROR_UNKNOWN";
  status?: number;
  originalError?: unknown;
};

// Safe axios wrapper function
export function safeRequest<T>(
  axiosPromise: Promise<{ data: T }>
): ResultAsync<T, AxiosResponseError> {
  return ResultAsync.fromPromise(axiosPromise, e => {
    return handleAxiosError(e);
  }).andThen(a => ok(a.data));
}

function handleAxiosError(error: unknown): AxiosResponseError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      // Server responded with error status
      const status = axiosError.response.status;
      if (status >= 400 && status < 500) {
        return {
          type: "AXIOS_ERROR_400",
          status: status,
          originalError: error,
        };
      }
      if (status >= 500) {
        return {
          type: "AXIOS_ERROR_500",
          status: status,
          originalError: error,
        };
      }

      return {
        type: "AXIOS_ERROR_UNKNOWN",
        status: axiosError.response.status,
        originalError: error,
      };
    } else if (axiosError.request) {
      // Request made but no response
      return {
        type: "NETWORK_ERROR",
        originalError: error,
      };
    }
  }

  // Something else went wrong
  return {
    type: "AXIOS_ERROR_UNKNOWN",
    originalError: error,
  };
}
