export type MemoryReaderError = {
  type: "MEMORY_READER_ERROR";
  cause: Error;
};

export type ReadMemoryResult<T> = {
  value: T;
  next: bigint;
};
