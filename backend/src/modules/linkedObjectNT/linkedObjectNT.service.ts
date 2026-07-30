import { log } from "@backend/plugins/logger/logger";
import type { MonoClass, MonoClassField } from "../monoParser/monoParser.types";

import type { ModuleInfo } from "../procParser/procParser.types";
import {
  TypeCode,
  type ReadAnyObjectResponse,
  type FieldNotFoundError,
  type ReadFieldResponse,
} from "./linkedObjectNT.types";
import type { MemoryReader } from "../memoryReaderNT/memoryReader.service";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import type { MemoryReaderError } from "../memoryReader/memoryReader.models";
import { MonoParser } from "../monoParserNT/monoParserNT.service";
import {
  toResultAsync,
  type NullPointerError,
  type UnsupportedError,
} from "@backend/utils/neverthrow";

export class LinkedObject {
  constructor(
    public pid: number,
    public mono: MonoParser,
    public klass: MonoClass,
    public objectAddr: bigint,
    private mr: MemoryReader
  ) {}

  public getFieldValueByName(
    name: string
  ): ResultAsync<ReadFieldResponse, MemoryReaderError | FieldNotFoundError | UnsupportedError> {
    const field = this.klass.fields.find(a => a.name == name);
    if (!field) {
      return errAsync({
        type: "FIELD_NOT_FOUND_ERROR",
        name,
      } satisfies FieldNotFoundError);
    }

    return this.readField(field, this.objectAddr);
  }
  public getFieldValueByNameToObj(
    name: string
  ): ResultAsync<
    LinkedObject,
    MemoryReaderError | FieldNotFoundError | UnsupportedError | NullPointerError
  > {
    return this.getFieldValueByName(name).andThen(fieldValue => {
      if (fieldValue.type != "CLASS") {
        return err({
          type: "UNSUPPORTED",
          message: "This function can only accept fields that are class objects",
        } satisfies UnsupportedError);
      }

      const field = fieldValue.value;
      if (!field.class_type) {
        return err({
          type: "NULL_POINTER_ERROR",
          var: "class_type",
        } satisfies NullPointerError);
      }

      const outputLinkedObj = new LinkedObject(
        this.pid,
        this.mono,
        field.class_type,
        field.objectPtr,
        this.mr
      );

      return ok(outputLinkedObj);
    });
  }

  static async findAllObjects(
    klass: MonoClass,
    allModules: ModuleInfo[],
    mr: MemoryReader
  ): Promise<ResultAsync<bigint[], MemoryReaderError>> {
    const results = [];
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

    for (const module of allModules) {
      if (module.path) continue;

      log.debug("Reading module with size: " + module.size);

      // Process in chunks to avoid holding entire buffer
      for (let offset = 0; offset < module.size; offset += CHUNK_SIZE) {
        const chunkSize = Math.min(CHUNK_SIZE, Number(module.size) - offset);

        const chunkRes = await mr.readBytes(module.start + BigInt(offset), chunkSize);
        if (chunkRes.isErr()) return err(chunkRes.error);
        const chunk = chunkRes.value;

        for (let pos = 0; pos < chunk.length - 8; pos += 8) {
          const value = chunk.readBigUint64LE(pos);
          if (value == klass.domain_vtables) {
            results.push(module.start + BigInt(offset + pos));
          }
        }
      }
    }
    return ok(results);
  }

  async readAllFields() {
    const fields = [];
    for (const f of this.klass.fields) {
      const data = await this.readField(f, this.objectAddr);
      if (data) fields.push(data);
    }
    return fields;
  }

  readField(
    field: MonoClassField,
    objAddr: bigint
  ): ResultAsync<ReadFieldResponse, MemoryReaderError | UnsupportedError> {
    //TODO
    // const offset = this.class_type.is_value_type && field.type.is_static ? field.offset - 0x10 : field.offset
    if (field.type.isStatic)
      return errAsync({
        type: "UNSUPPORTED",
        message: "Static fields are not supported yet",
      } satisfies UnsupportedError);

    const offset = BigInt(field.offset);
    const address = objAddr + offset;

    return this.readAnyObject(field.type.typeCode, address).map(data => ({
      name: field.name,
      ...data,
    }));
  }

  readAnyObject(
    type: TypeCode,
    addr: bigint
  ): ResultAsync<ReadAnyObjectResponse, MemoryReaderError> {
    switch (type) {
      case TypeCode.U1:
        return this.mr.readUInt8(addr).map(value => ({ type: "number", value }));
      case TypeCode.U2:
        return this.mr.readUInt16(addr).map(value => ({ type: "number", value }));
      case TypeCode.U4:
        return this.mr.readUInt32(addr).map(value => ({ type: "number", value }));
      case TypeCode.U8:
        return this.mr.readUInt64(addr).map(value => ({ type: "bigint", value }));

      case TypeCode.I1:
        return this.mr.readInt8(addr).map(value => ({ type: "number", value }));
      case TypeCode.I2:
        return this.mr.readInt16(addr).map(value => ({ type: "number", value }));
      case TypeCode.I4:
        return this.mr.readInt32(addr).map(value => ({ type: "number", value }));
      case TypeCode.I8:
        return this.mr.readInt64(addr).map(value => ({ type: "bigint", value }));

      case TypeCode.R4:
        return this.mr
          .readUInt32(addr)
          .map(value => ({ type: "number", value: bigintToFloat32(BigInt(value)) }));

      case TypeCode.R8:
        return this.mr
          .readUInt64(addr)
          .map(value => ({ type: "number", value: bigintToFloat64(value) }));

      case TypeCode.BOOLEAN:
        return this.mr.readUInt8(addr).map(value => ({ type: "boolean", value: value != 0 }));

      case TypeCode.CHAR:
        return this.mr
          .readUInt16(addr)
          .map(value => ({ type: "string", value: String.fromCharCode(value) }));

      case TypeCode.STRING:
        return this.readStringField(addr).map(value => ({ type: "string", value }));

      case TypeCode.SZARRAY:
        return this.readArrayField(addr).map(value => ({ type: "array", value }));

      case TypeCode.VALUETYPE:
        return this.mr.readInt16(addr).map(value => ({ type: "VALUETYPE", value }));

      case TypeCode.CLASS:
        return this.readObjField(addr).map(value => ({ type: "CLASS", value }));

      case TypeCode.GENERICINST:
        return this.readGenericField(addr).map(value => ({ type: "GENERICINST", value }));

      default:
        return okAsync({
          type: "unknown",
          value: "UNKNOWN! CODE: " + type,
        });
    }
  }

  readStringField(addr: bigint): ResultAsync<string | null, MemoryReaderError> {
    return this.mr.readPtr(addr).andThen(ptr => {
      if (ptr == 0n) {
        return ok(null);
      }
      //there are 2 pointers to something... let's ignore them and skip to the string length
      const offset = ptr + 16n;
      return this.mr
        .readInt32(offset)
        .andThen(len => {
          const stringStart = offset + 4n;
          return this.mr.readBytes(stringStart, len * 2);
        })
        .map(str => {
          return str.toString("utf16le");
        });
    });
  }

  readArrayField(
    addr: bigint,
    startIndex?: number,
    endIndex?: number
  ): ResultAsync<ReadAnyObjectResponse[] | null, MemoryReaderError> {
    return this.mr.readPtr(addr).andThen(objectPtr => {
      if (objectPtr == 0n) ok(null);

      const ctx = {
        arrayDefinitionPtr: undefined as bigint | undefined,
        arrayDefinition: undefined as MonoClass | undefined,
        elementDefinition: undefined as MonoClass | undefined,
      };

      return this.mr
        .readPtr(objectPtr)
        .andThen(vtable => this.mr.readPtr(vtable))
        .andThen(arrayDefinitionPtr => {
          ctx.arrayDefinitionPtr = arrayDefinitionPtr;
          return this.mono.getClassByAddr(arrayDefinitionPtr);
        })
        .andThen(arrayDefinition => {
          ctx.arrayDefinition = arrayDefinition;
          return this.mr.readPtr(ctx.arrayDefinitionPtr!);
        })
        .andThen(elementDefinitionPtr => {
          return this.mono.getClassByAddr(elementDefinitionPtr);
        })
        .andThen(elementDefinition => {
          ctx.elementDefinition = elementDefinition;
          //skipping over objectPtr and 2 other pointers??
          return this.mr.readInt32(objectPtr + 8n + 8n + 8n);
        })
        .andThen(elementCount => {
          //skipping over objectPtr and 2 other pointers and element count
          const start = this.mr.alignForPtr(objectPtr + 8n + 8n + 8n + 4n);

          const st = startIndex !== undefined ? startIndex : 0;
          let ed = endIndex !== undefined ? endIndex : elementCount;

          if (ed > elementCount) ed = elementCount;

          return toResultAsync(
            this._readArrayData(ctx.arrayDefinition!, ctx.elementDefinition!, start, st, ed)
          );
        });
    });
  }

  async _readArrayData(
    arrayDefinition: MonoClass,
    elementDefinition: MonoClass,
    origin: bigint,
    startIndex: number,
    endIndex: number
  ): Promise<Result<ReadAnyObjectResponse[], MemoryReaderError>> {
    const elements = [];

    for (let i = startIndex; i < endIndex; i++) {
      const elementPtrAddr = origin + BigInt(i * arrayDefinition.size);
      const obj = await this.readAnyObject(elementDefinition.type.typeCode, elementPtrAddr);
      if (obj.isErr()) return err(obj.error);
      elements.push(obj.value);
    }

    return ok(elements);
  }

  //TODO add type
  readObjField(
    addr: bigint
  ): ResultAsync<{ objectPtr: bigint; class_type: MonoClass | null }, MemoryReaderError> {
    return this.mr.readPtr(addr).andThen(objectPtr => {
      if (objectPtr == 0n)
        return okAsync({
          objectPtr,
          class_type: null,
        });

      return this.mr
        .readPtr(objectPtr)
        .andThen(vtable => this.mr.readPtr(vtable))
        .andThen(definitionPtr => this.mono.getClassByAddr(definitionPtr))
        .map(class_type => ({
          objectPtr,
          class_type,
        }));
    });
  }

  // private async readGenericField(type: MonoFieldType, addr: bigint) {
  private readGenericField(addr: bigint) {
    // const mr = new MemoryReader(this.pid, type.ptr)
    // const typeDefPtr = await mr.readPtr() // name possible doesn't make sense

    //TODO
    //We only need the type param to check this
    // const generic_type = await this.mono.getClassByAddr(typeDefPtr)!
    // if (generic_type.is_value_type) return "UNSUPPORTED"

    return this.readObjField(addr);
  }
}

function bigintToFloat64(rawBits: bigint): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Number(rawBits & 0xffffffffn), true);
  view.setUint32(4, Number((rawBits >> 32n) & 0xffffffffn), true);
  return view.getFloat64(0, true);
}

function bigintToFloat32(rawBits: bigint): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, Number(rawBits & 0xffffffffn), true);
  return view.getFloat32(0, true);
}
