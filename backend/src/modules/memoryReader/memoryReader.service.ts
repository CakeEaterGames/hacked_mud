import * as fs from "fs";
import type { FileHandle, FileReadResult } from "fs/promises";
import { err, ok, Result, ResultAsync } from "neverthrow";
import type { MemoryReaderError } from "./memoryReader.models";

const alloc = Result.fromThrowable(
  Buffer.alloc.bind(Buffer),
  e => ({ cause: e as Error, type: "MEMORY_READER_ERROR" }) satisfies MemoryReaderError
);

export class MemoryReader {
  private constructor(
    public pid: number,
    private file: FileHandle
  ) {}

  public static create(pid: number): ResultAsync<MemoryReader, MemoryReaderError> {
    const memPath = `/proc/${pid}/mem`;
    return ResultAsync.fromPromise(
      fs.promises.open(memPath, "r"),
      e =>
        ({
          type: "MEMORY_READER_ERROR",
          cause: e as Error,
        }) satisfies MemoryReaderError
    ).map(file => {
      return new MemoryReader(pid, file);
    });
  }

  close(): ResultAsync<void, MemoryReaderError> {
    return ResultAsync.fromPromise(
      this.file.close(),
      e =>
        ({
          type: "MEMORY_READER_ERROR",
          cause: e as Error,
        }) satisfies MemoryReaderError
    );

    // .map(_ => {
    //   this.file = undefined;
    // });
  }

  fileRead(
    f: FileHandle,
    buffer: Buffer<ArrayBuffer>,
    bufferSize: number,
    address: bigint
  ): ResultAsync<FileReadResult<Buffer<ArrayBuffer>>, MemoryReaderError> {
    return ResultAsync.fromPromise(
      f.read(buffer, 0, bufferSize, Number(address)),
      e =>
        ({
          type: "MEMORY_READER_ERROR",
          cause: e as Error,
        }) satisfies MemoryReaderError
    );
  }

  readMemory(address: bigint, size: number): ResultAsync<Buffer, MemoryReaderError> {
    return alloc(size)
      .map(buffer => ({ buffer }))
      .asyncAndThen(ctx =>
        this.fileRead(this.file, ctx.buffer, size, address).map(data => ({ ...ctx, data }))
      )
      .andThen(ctx => {
        if (ctx.data.bytesRead != size) {
          return err({
            type: "MEMORY_READER_ERROR",
            cause: new Error(
              `Only read ${ctx.data.bytesRead} of ${size} bytes at 0x${address.toString(16)}`
            ),
          } satisfies MemoryReaderError);
        }
        return ok(ctx.buffer);
      });
  }

  readBytes(addr: bigint, n: number): ResultAsync<Buffer, MemoryReaderError> {
    return this.readMemory(addr, n);
  }

  readUInt8(addr: bigint): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(addr, 1).map(res => res.readUInt8(0));
  }

  readInt8(addr: bigint): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(addr, 1).map(res => res.readInt8(0));
  }

  readUInt16(addr: bigint): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(addr, 2).map(res => res.readUInt16LE(0));
  }

  readInt16(addr: bigint): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(addr, 2).map(res => res.readInt16LE(0));
  }

  readUInt32(addr: bigint): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(addr, 4).map(res => res.readUInt32LE(0));
  }

  readInt32(addr: bigint): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(addr, 4).map(res => res.readInt32LE(0));
  }

  readInt64(addr: bigint): ResultAsync<bigint, MemoryReaderError> {
    return this.readMemory(addr, 8).map(res => res.readBigInt64LE(0));
  }

  readUInt64(addr: bigint): ResultAsync<bigint, MemoryReaderError> {
    return this.readMemory(addr, 8).map(res => res.readBigUInt64LE(0));
  }

  alignForPtr(addr: bigint) {
    const alignedPos = (addr + 7n) & ~7n;
    if (alignedPos > addr) return alignedPos;
    return addr;
  }

  readPtr(addr: bigint): ResultAsync<bigint, MemoryReaderError> {
    return this.readUInt64(this.alignForPtr(addr));
  }

  readString(addr: bigint, maxLength: number = 512): ResultAsync<string, MemoryReaderError> {
    return this.readMemory(addr, maxLength).andThen(buffer => {
      let end = 0;
      // TODO can this read an incomplete string?
      while (end < maxLength && buffer[end] !== 0) end++;
      // const next = addr + BigInt(end) + 1n;
      return ok(buffer.toString("utf8", 0, end));
    });
  }
}
