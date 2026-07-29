import { log } from "@backend/plugins/logger/logger";
import { MemoryReader } from "./MemoryReader";
import type { MonoParser } from "./MonoParser";
import type { ModuleInfo } from "./ProcParser";
import type { MonoClass, MonoClassField } from "./types";

export class LinkedObject {
  constructor(
    public pid: number,
    public mono: MonoParser,
    public klass: MonoClass,
    public objectAddr: bigint
  ) {}

  public async getFieldValueByName(name: string) {
    const field = this.klass.fields.find(a => a.name == name);
    if (!field) {
      throw new Error("Field not found: " + name);
    }

    const data = await this.readField(field, this.objectAddr);
    return data;
  }
  public async getFieldValueByNameToObj(name: string) {
    const field = (await this.getFieldValueByName(name)) as ClassField;

    if (!field.value) {
      throw new Error("Failed to turn field into an object: " + name);
    }
    const outp2 = field.value;
    const outputLinkedObj = new LinkedObject(
      this.pid,
      this.mono,
      outp2.class_type!,
      outp2.objectPtr
    );

    return outputLinkedObj;
  }

  static async findAllObjects(klass: MonoClass, allModules: ModuleInfo[], pid: number) {
    const results = [];
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

    for (const module of allModules) {
      if (module.path) continue;

      log.debug("Reading module with size: " + module.size);

      // Process in chunks to avoid holding entire buffer
      for (let offset = 0; offset < module.size; offset += CHUNK_SIZE) {
        const chunkSize = Math.min(CHUNK_SIZE, Number(module.size) - offset);
        let chunk;

        try {
          const mr = new MemoryReader(pid, module.start + BigInt(offset));
          chunk = await mr.readBytes(chunkSize);
        } catch (error) {
          log.error({ error, offset });
          break;
        }

        for (let pos = 0; pos < chunk.length - 8; pos += 8) {
          const value = chunk.readBigUint64LE(pos);
          if (value == klass.domain_vtables) {
            results.push(module.start + BigInt(offset + pos));
          }
        }

        // chunk will be GC'd on next iteration
      }
    }
    return results;
  }

  async readAllFields() {
    const fields = [];
    for (const f of this.klass.fields) {
      const data = await this.readField(f, this.objectAddr);
      if (data) fields.push(data);
    }
    return fields;
  }

  async readField(field: MonoClassField, objAddr: bigint) {
    //TODO
    // const offset = this.class_type.is_value_type && field.type.is_static ? field.offset - 0x10 : field.offset
    if (field.type.isStatic) return;

    const offset = BigInt(field.offset);
    const address = objAddr + offset;

    const data = await this.readAnyObject(field.type.typeCode, address);
    const res = {
      name: field.name,
      ...data,
    };

    return res;
  }

  async readAnyObject(type: TypeCode | undefined, addr: bigint): Promise<ReadAnyObjectResponse> {
    const mr = new MemoryReader(this.pid, addr);

    switch (type) {
      case TypeCode.U1:
        return { type: "number", value: await mr.readUInt8() };
      case TypeCode.U2:
        return { type: "number", value: await mr.readUInt16() };
      case TypeCode.U4:
        return { type: "number", value: await mr.readUInt32() };
      case TypeCode.U8:
        return { type: "bigint", value: await mr.readUInt64() };

      case TypeCode.I1:
        return { type: "number", value: await mr.readInt8() };
      case TypeCode.I2:
        return { type: "number", value: await mr.readInt16() };
      case TypeCode.I4:
        return { type: "number", value: await mr.readInt32() };
      case TypeCode.I8:
        return { type: "bigint", value: await mr.readInt64() };

      case TypeCode.R4:
        return {
          type: "number",
          value: bigintToFloat32(BigInt(await mr.readUInt32())),
        };
      case TypeCode.R8:
        return {
          type: "number",
          value: bigintToFloat64(await mr.readUInt64()),
        };

      case TypeCode.BOOLEAN:
        return {
          type: "boolean",
          value: (await mr.readUInt8()) != 0,
        };

      case TypeCode.CHAR:
        return {
          type: "string",
          value: String.fromCharCode(await mr.readUInt16()),
        };

      case TypeCode.STRING:
        return {
          type: "string",
          value: await this.readStringField(addr),
        };

      case TypeCode.SZARRAY:
        return {
          type: "array",
          value: await this.readArrayField(addr),
        };

      case TypeCode.VALUETYPE:
        return {
          type: "VALUETYPE",
          value: await mr.readInt32(),
        };

      case TypeCode.CLASS:
        return {
          type: "CLASS",
          value: await this.readObjField(addr),
        };

      case TypeCode.GENERICINST:
        return {
          type: "GENERICINST",
          value: await this.readGenericField(addr),
          // value: await this.readGenericField(type, addr)
        };

      default:
        return {
          type: "unknown",
          value: "UNKNOWN! CODE: " + type,
        };
    }
  }

  async readStringField(addr: bigint) {
    const mr = new MemoryReader(this.pid, addr);
    try {
      const ptr = await mr.readPtr();
      if (ptr == 0n) {
        return null;
      }
      mr.seek(ptr);

      // if (addr == 0n) return ""
      // await mr.seek(addr)

      //there are 2 pointers to something... let's ignore them and skip to the length
      mr.skip(16n);
      // await mr.skip(8n)

      const len = await mr.readInt32();

      // log("Str len", len)

      // let str = ""
      // for (let i = 0; i < len; i++) {
      //     str+= (await mr.readBytes(2)).toString('utf16le')
      // }
      const str = await mr.readBytes(len * 2);

      return str.toString("utf16le");
    } catch (e) {
      return (e as Error).message;
    }
  }

  async readArrayField(
    addr: bigint,
    startIdx?: number,
    endIdx?: number
  ): Promise<ReadAnyObjectResponse[] | undefined> {
    const mr = new MemoryReader(this.pid, addr);
    try {
      const objectPtr = await mr.readPtr();
      if (objectPtr == 0n) return [];

      mr.seek(objectPtr);
      const vtable = await mr.readPtr();

      mr.seek(vtable);
      const arrayDefinitionPtr = await mr.readPtr();
      const arrayDefinition = await this.mono.getClassByAddr(arrayDefinitionPtr);

      mr.seek(arrayDefinitionPtr);
      const elementDefinitionPtr = await mr.readPtr();
      const elementDefinition = await this.mono.getClassByAddr(elementDefinitionPtr);

      // log(elementDefinition)

      mr.seek(objectPtr);
      mr.skip(8n + 8n + 8n); //skipping over objectPtr and 2 other pointers??
      const count = await mr.readInt32();

      mr.alignForPtr();
      const start = mr.pos;
      // log("Count ", count)
      // log("Size ", BigInt(arrayDefinition.size))
      const elements = [];

      const st = startIdx !== undefined ? BigInt(startIdx) : 0n;
      let ed = endIdx !== undefined ? BigInt(endIdx) : count;

      if (ed > count) ed = count;

      // const st = 0n;
      // const ed = count;

      for (let i = st; i < ed; i++) {
        const elementPtrAddr = start + i * BigInt(arrayDefinition.size);
        elements.push(await this.readAnyObject(elementDefinition.type.typeCode, elementPtrAddr));
      }
      return elements;
    } catch (e) {
      console.error("Failed to parse array");
      console.error(e);
      return;
    }
  }

  async readObjField(addr: bigint) {
    const mr = new MemoryReader(this.pid, addr);
    try {
      const objectPtr = await mr.readPtr();
      if (objectPtr == 0n) return;

      mr.seek(objectPtr);
      const vtable = await mr.readPtr();

      mr.seek(vtable);
      const definitionPtr = await mr.readPtr();

      let class_type: MonoClass | undefined;
      try {
        class_type = await this.mono.getClassByAddr(definitionPtr);
      } catch (e) {
        console.error("failed to get class type " + (e as Error).message);
      }

      return {
        objectPtr,
        class_type,
      };
    } catch (e) {
      console.error("failed to readObjField " + (e as Error).message);
      // return (e as Error).message
      return;
    }
  }

  // private async readGenericField(type: MonoFieldType, addr: bigint) {
  private async readGenericField(addr: bigint) {
    // const mr = new MemoryReader(this.pid, type.ptr)
    // const typeDefPtr = await mr.readPtr() // name possible doesn't make sense

    //TODO
    //We only need the type param to check this
    // const generic_type = await this.mono.getClassByAddr(typeDefPtr)!
    // if (generic_type.is_value_type) return "UNSUPPORTED"

    return this.readObjField(addr);
  }
}

export type GetFieldValueByNameResponse = ReadAnyObjectResponse & { name: string };

export type ReadAnyObjectResponse =
  | NumberField
  | BigIntField
  | StringField
  | BooleanField
  | ValueTypeField
  | ClassField
  | GenericInstField
  | ArrayField
  | UnknownField;

export type NumberField = {
  type: "number";
  value: number;
};
export type BigIntField = {
  type: "bigint";
  value: bigint;
};
export type StringField = {
  type: "string";
  value: string | null;
};
export type ArrayField = {
  type: "array";
  value: ReadAnyObjectResponse[] | undefined;
};
export type BooleanField = {
  type: "boolean";
  value: boolean;
};
export type ValueTypeField = {
  type: "VALUETYPE";
  value: number;
};
export type ClassField = {
  type: "CLASS";
  value: ClassFieldValue | undefined;
};
export type GenericInstField = {
  type: "GENERICINST";
  value: ClassFieldValue | undefined;
};
export type UnknownField = {
  type: "unknown";
  value: unknown;
};

export type ClassFieldValue = {
  objectPtr: bigint;
  class_type: MonoClass | undefined;
};

//https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/data/lldb/mono.py#L40
export enum TypeCode {
  END = 0x00,
  VOID = 0x01,
  BOOLEAN = 0x02,
  CHAR = 0x03,
  I1 = 0x04,
  U1 = 0x05,
  I2 = 0x06,
  U2 = 0x07,
  I4 = 0x08,
  U4 = 0x09,
  I8 = 0x0a,
  U8 = 0x0b,
  R4 = 0x0c,
  R8 = 0x0d,
  STRING = 0x0e,
  PTR = 0x0f,
  BYREF = 0x10,
  VALUETYPE = 0x11,
  CLASS = 0x12,
  VAR = 0x13,
  ARRAY = 0x14,
  GENERICINST = 0x15,
  TYPEDBYREF = 0x16,
  I = 0x18,
  U = 0x19,
  FNPTR = 0x1b,
  OBJECT = 0x1c,
  SZARRAY = 0x1d,
  MVAR = 0x1e,
  CMOD_REQD = 0x1f,
  CMOD_OPT = 0x20,
  INTERNAL = 0x21,
  MODIFIER = 0x40,
  SENTINEL = 0x41,
  PINNED = 0x45,
  ENUM = 0x55,
}

export function bigintToFloat64(rawBits: bigint): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Number(rawBits & 0xffffffffn), true);
  view.setUint32(4, Number((rawBits >> 32n) & 0xffffffffn), true);
  return view.getFloat64(0, true);
}

export function bigintToFloat32(rawBits: bigint): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, Number(rawBits & 0xffffffffn), true);
  return view.getFloat32(0, true);
}
