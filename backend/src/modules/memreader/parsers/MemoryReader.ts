import * as fs from "fs";

export class MemoryReader {
  constructor(
    public pid: number,
    public pos: bigint
  ) {
    // this.pos = 0n;
  }

  async readMemory(address: bigint, size: number, toAdvance = true): Promise<Buffer> {
    const memPath = `/proc/${this.pid}/mem`;
    const fd = await fs.promises.open(memPath, "r");

    try {
      const buffer = Buffer.alloc(size);
      const { bytesRead } = await fd.read(buffer, 0, size, Number(address));

      if (bytesRead !== size) {
        throw new Error(`Only read ${bytesRead} of ${size} bytes at 0x${address.toString(16)}`);
      }

      if (toAdvance) this.pos += BigInt(size);
      return buffer;
    } finally {
      await fd.close();
    }
  }
  seek(pos: bigint) {
    this.pos = pos;
  }

  skip(n: bigint) {
    this.pos += n;
  }

  async readBytes(n: number, toAdvance = true) {
    const r = await this.readMemory(this.pos, n, toAdvance);
    return r;
  }

  async readUInt8(): Promise<number> {
    const buffer = await this.readMemory(this.pos, 1);
    return buffer.readUInt8(0);
  }
  async readInt8(): Promise<number> {
    const buffer = await this.readMemory(this.pos, 1);
    return buffer.readInt8(0);
  }

  async readUInt16(): Promise<number> {
    const buffer = await this.readMemory(this.pos, 2);
    return buffer.readUInt16LE(0);
  }
  async readInt16(): Promise<number> {
    const buffer = await this.readMemory(this.pos, 2);
    return buffer.readInt16LE(0);
  }

  async readUInt32(): Promise<number> {
    const buffer = await this.readMemory(this.pos, 4);
    return buffer.readUInt32LE(0);
  }

  async readInt32(): Promise<number> {
    const buffer = await this.readMemory(this.pos, 4);
    return buffer.readInt32LE(0);
  }

  async readInt64(): Promise<bigint> {
    const buffer = await this.readMemory(this.pos, 8);
    return buffer.readBigInt64LE(0);
  }
  async readUInt64(): Promise<bigint> {
    const buffer = await this.readMemory(this.pos, 8);
    return buffer.readBigUInt64LE(0);
  }

  alignForPtr() {
    const currentPos = this.pos;
    const alignedPos = (currentPos + 7n) & ~7n;
    if (alignedPos > currentPos) {
      this.seek(alignedPos);
    }
  }

  async readPtr() {
    this.alignForPtr();
    return await this.readUInt64();
  }

  async readString(maxLength: number = 512): Promise<string> {
    const origin = this.pos;
    const buffer = await this.readMemory(this.pos, maxLength);

    let end = 0;
    while (end < maxLength && buffer[end] !== 0) end++;

    this.pos = origin + BigInt(end) + 1n;

    return buffer.toString("utf8", 0, end);
  }

  static async readString(pid: number, pos: bigint) {
    if (!pos) return null;
    const nsReader = new MemoryReader(pid, pos);
    return await nsReader.readString();
  }
}
