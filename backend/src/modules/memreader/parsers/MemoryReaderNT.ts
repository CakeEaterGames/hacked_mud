import * as fs from "fs";
import type { FileHandle, FileReadResult } from "fs/promises";
import { err, ok, okAsync, Result, ResultAsync } from "neverthrow";

const alloc = Result.fromThrowable(
  Buffer.alloc.bind(Buffer),
  e => ({ cause: e as Error, type: "MEMORY_READER_ERROR" }) satisfies MemoryReaderError
);

export type MemoryReaderError = {
  type: "MEMORY_READER_ERROR";
  cause: Error;
};

export class MemoryReader {
  file?: FileHandle;

  constructor(
    public pid: number,
    public pos: bigint
  ) {}

  private open(): ResultAsync<FileHandle, MemoryReaderError> {
    if (this.file) return okAsync(this.file);
    const memPath = `/proc/${this.pid}/mem`;
    return ResultAsync.fromPromise(
      fs.promises.open(memPath, "r"),
      e =>
        ({
          type: "MEMORY_READER_ERROR",
          cause: e as Error,
        }) satisfies MemoryReaderError
    ).map(fileHandle => {
      this.file = fileHandle;
      return fileHandle;
    });
  }

  close(): ResultAsync<void, MemoryReaderError> {
    if (!this.file) return okAsync();
    return ResultAsync.fromPromise(
      this.file.close(),
      e =>
        ({
          type: "MEMORY_READER_ERROR",
          cause: e as Error,
        }) satisfies MemoryReaderError
    ).map(_ => {
      this.file = undefined;
    });
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

  readMemory(
    address: bigint,
    size: number,
    toAdvance = true
  ): ResultAsync<Buffer<ArrayBuffer>, MemoryReaderError> {
    return this.open()
      .andThen(file => alloc(size).map(buffer => ({ file, buffer })))
      .andThen(ctx =>
        this.fileRead(ctx.file, ctx.buffer, size, address).map(data => ({ ...ctx, data }))
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
        if (toAdvance) this.pos += BigInt(size);
        return ok(ctx.buffer);
      });
  }

  seek(pos: bigint) {
    this.pos = pos;
    return this.pos;
  }

  skip(n: bigint) {
    this.pos += n;
    return this.pos;
  }

  readBytes(n: number, toAdvance = true): ResultAsync<Buffer, MemoryReaderError> {
    return this.readMemory(this.pos, n, toAdvance);
  }

  readUInt8(): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(this.pos, 1).map(buffer => buffer.readUInt8(0));
  }

  readInt8(): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(this.pos, 1).map(buffer => buffer.readInt8(0));
  }

  readUInt16() {
    return this.readMemory(this.pos, 2).map(buffer => buffer.readUInt16LE(0));
  }

  readInt16(): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(this.pos, 2).map(buffer => buffer.readInt16LE(0));
  }

  readUInt32(): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(this.pos, 4).map(buffer => buffer.readUInt32LE(0));
  }

  readInt32(): ResultAsync<number, MemoryReaderError> {
    return this.readMemory(this.pos, 4).map(buffer => buffer.readInt32LE(0));
  }

  readInt64(): ResultAsync<bigint, MemoryReaderError> {
    return this.readMemory(this.pos, 8).map(buffer => buffer.readBigInt64LE(0));
  }

  readUInt64(): ResultAsync<bigint, MemoryReaderError> {
    return this.readMemory(this.pos, 8).map(buffer => buffer.readBigUInt64LE(0));
  }

  alignForPtr() {
    const currentPos = this.pos;
    const alignedPos = (currentPos + 7n) & ~7n;
    if (alignedPos > currentPos) {
      this.seek(alignedPos);
    }
    return this.pos;
  }

  readPtr(): ResultAsync<bigint, MemoryReaderError> {
    this.alignForPtr();
    return this.readUInt64();
  }

  readString(maxLength: number = 512): ResultAsync<string, MemoryReaderError> {
    return this.readMemory(this.pos, maxLength).andThen(buffer => {
      const origin = this.pos;
      let end = 0;
      while (end < maxLength && buffer[end] !== 0) end++;
      this.pos = origin + BigInt(end) + 1n;
      return ok(buffer.toString("utf8", 0, end));
    });
  }

  static readString(pid: number, pos: bigint): ResultAsync<string, MemoryReaderError> {
    const nsReader = new MemoryReader(pid, pos);
    return nsReader.readString().andTee(_ => {
      nsReader.close();
    });
  }
}
