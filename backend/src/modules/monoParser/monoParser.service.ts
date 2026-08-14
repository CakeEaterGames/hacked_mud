import { log } from "@backend/plugins/logger/logger";

import {
  _MonoDomainL,
  _MonoAssemblyL,
  _MonoImageL,
  _MonoClassDefL,
  _MonoClassFieldL,
  _MonoTypeL,
  _GSListL,
} from "./monoParser.models";
import type {
  MonoClass,
  MonoAssembly,
  MonoClassField,
  MonoFieldType,
  MonoAssemblyIndexEntry,
  AssemblyNotFoundError,
} from "./monoParser.types";
import { MemoryReader } from "../memoryReader/memoryReader.service";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { toResultAsync } from "@backend/utils/neverthrow";
import type { MemoryReaderError } from "../memoryReader/memoryReader.models";

export class MonoParser {
  constructor(
    public pid: number,
    origin: bigint,
    mono_get_root_domain: bigint,
    private mr: MemoryReader
  ) {
    this.root = origin + mono_get_root_domain;
  }

  private root: bigint;
  public assemblyIndexes?: MonoAssemblyIndexEntry[];
  public monoClasses: MonoClass[] = [];

  public parseAssemblyByName(
    name: string
  ): ResultAsync<MonoAssembly, MemoryReaderError | AssemblyNotFoundError> {
    return this.findMonoAssemblies().andThen(assemblies => {
      const assembly = assemblies.find(a => a.name == name);
      if (!assembly) {
        return errAsync({
          type: "ASSEMBLY_NOT_FOUND_ERROR",
          name: name,
        } satisfies AssemblyNotFoundError);
      }
      return this.parseAssembly(assembly);
    });
  }

  private findMonoAssemblies(): ResultAsync<MonoAssemblyIndexEntry[], MemoryReaderError> {
    //The function accepts a pointer to
    // mono_get_root_domain (void)
    // {
    // 	return mono_root_domain;
    // }
    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/domain.c#L964

    if (this.assemblyIndexes) return okAsync(this.assemblyIndexes);

    // 48 8b 05 fc 11 44 00      # 0: 48 8b 05 fc 11 44 00   mov rax, qword ptr [rip + 0x4411fc]
    // c3                        # 7: c3                     ret

    return this.mr
      .readUInt32(this.root + 3n)
      .andThen(relativeOffset => {
        //because the instruction is 7 bytes long
        return this.mr.readPtr(this.root + 7n + BigInt(relativeOffset));
      })
      .andThen(appDomainPtr => {
        return this.mr.readBytes(appDomainPtr, _MonoDomainL.layout.size);
      })
      .andThen(rawData => {
        const domain = _MonoDomainL.parse(rawData);
        const domain_assemblies = domain.domain_assemblies; /// points to an linked list of pointers
        return toResultAsync(this._collectAssemblyPointers(domain_assemblies));
      })
      .andThen(assemblyPointers => {
        return toResultAsync(this._collectAssemblyNames(assemblyPointers));
      })
      .andThen(result => {
        this.assemblyIndexes = result;
        return ok(result);
      });
  }

  private async _collectAssemblyPointers(
    start: bigint
  ): Promise<Result<bigint[], MemoryReaderError>> {
    const assemblyPointers: bigint[] = [];
    let ptr = start;

    while (true) {
      // typedef struct _GSList GSList;
      // struct _GSList {
      // 	gpointer data;
      // 	GSList *next;
      // };

      const read = await this.mr.readBytes(ptr, _GSListL.layout.size).andThen(rawList => {
        const list = _GSListL.parse(rawList);
        // pointer to the assembly
        assemblyPointers.push(list.data);
        // pointer to the next list element
        ptr = list.next;
        return ok(ptr);
      });

      if (read.isErr()) return err(read.error);
      if (read.value == 0n) break;
    }

    return ok(assemblyPointers);
  }

  private async _collectAssemblyNames(
    assemblyPointers: bigint[]
  ): Promise<Result<MonoAssemblyIndexEntry[], MemoryReaderError>> {
    const assemblies = [];
    for (const ptr of assemblyPointers) {
      // Skipping 16 bytes to arrive at at MonoAssemblyName const char *name;
      // Refer to _MonoAssemblyD struct definition
      // This is done to not read the entire struct
      const nameStr = await this.mr.readPtr(ptr + 16n).andThen(MonoAssemblyName_namePtr => {
        return this.mr.readString(MonoAssemblyName_namePtr);
      });
      if (nameStr.isErr()) return err(nameStr.error);
      assemblies.push({ name: nameStr.value, addr: ptr });
    }
    return ok(assemblies);
  }

  private parseAssembly(
    assemblyEntry: MonoAssemblyIndexEntry
  ): ResultAsync<MonoAssembly, MemoryReaderError> {
    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214

    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L162

    // struct _MonoAssemblyName {
    // 	const char *name;
    // 	const char *culture;
    // 	const char *hash_value;
    // 	const mono_byte* public_key;
    // 	// string of 16 hex chars + 1 NULL
    // 	mono_byte public_key_token [MONO_PUBLIC_KEY_TOKEN_LENGTH];
    // 	uint32_t hash_alg;
    // 	uint32_t hash_len;
    // 	uint32_t flags;
    // #ifdef ENABLE_NETCORE
    // 	int32_t major, minor, build, revision, arch;
    // #else
    // 	uint16_t major, minor, build, revision, arch;
    // #endif
    // 	//Add members for correct work with mono_stringify_assembly_name
    // 	MonoBoolean without_version;
    // 	MonoBoolean without_culture;
    // 	MonoBoolean without_public_key_token;
    // };

    return this.mr
      .readBytes(assemblyEntry.addr, _MonoAssemblyL.layout.size)
      .andThen(raw => {
        const assembly = _MonoAssemblyL.parse(raw);

        return this.mr.readString(assembly.aname.name).map(nameStr => ({ assembly, nameStr }));
      })
      .andThen(ctx => {
        // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L355

        return this.mr
          .readBytes(ctx.assembly.image, _MonoImageL.layout.size)
          .map(rawImage => ({ ...ctx, rawImage }));
      })
      .andThen(ctx => {
        return toResultAsync(this._hashTableLoop(ctx.rawImage)).map(classes => ({
          ...ctx,
          classes,
        }));
      })
      .map(ctx => {
        const assembly: MonoAssembly = {
          name: ctx.nameStr,
          // addr: addr,
          classes: ctx.classes,
        };
        return assembly;
      });
  }

  private async _hashTableLoop(rawImage: Buffer): Promise<Result<MonoClass[], MemoryReaderError>> {
    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/utils/mono-internal-hash.h#L36
    // struct _MonoInternalHashTable
    // {
    // 	GHashFunc hash_func;
    // 	MonoInternalHashKeyExtractFunc key_extract;
    // 	MonoInternalHashNextValueFunc next_value;
    // 	gint size;
    // 	gint num_entries;
    // 	gpointer *table;
    // };

    const image = _MonoImageL.parse(rawImage);
    const classCacheSize = image.class_cache.size;
    const _num_entries = image.class_cache.num_entries;
    const gpointer = image.class_cache.table;

    const classes = [];

    for (let i = 0; i < classCacheSize; i++) {
      // a pointer is 8 bytes long
      const loopAddrRes = await this.mr.readPtr(gpointer + BigInt(i * 8));
      if (loopAddrRes.isErr()) return err(loopAddrRes.error);
      let loopAddr = loopAddrRes.value;

      while (loopAddr != 0n) {
        //points to https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/class-private-definition.h#L145
        const klass = await this.parseMonoClass(loopAddr);
        if (klass.isErr()) return err(klass.error);

        classes.push(klass.value);
        loopAddr = klass.value.next_class_cache;
      }
    }

    return ok(classes);
  }

  public getClassByAddr(addr: bigint): ResultAsync<MonoClass, MemoryReaderError> {
    const klass = this.monoClasses.find(a => a.addr === addr);
    if (klass) return okAsync(klass);

    return this.parseMonoClass(addr).andThen(klass => {
      this.monoClasses.push(klass);
      return ok(klass);
    });
  }

  private parseMonoClass(addr: bigint) {
    // struct _MonoClassDef {
    // 	MonoClass klass;
    // 	guint32	flags;
    // 	/*
    // 	 * From the TypeDef table
    // 	 */
    // 	guint32 first_method_idx;
    // 	guint32 first_field_idx;
    // 	guint32 method_count, field_count;
    // 	/* next element in the class_cache hash list (in MonoImage) */
    // 	MonoClass *next_class_cache;
    // };

    return this.mr
      .readBytes(addr, _MonoClassDefL.layout.size)
      .andThen(raw => {
        const classDefinition = _MonoClassDefL.parse(raw);
        const klass = classDefinition.klass;

        const flags1 = klass.bitfields1; // inited, size_inited, valuetype, enumtype, blittable, unicode, wastypebuilder, is_array_special_interface, is_byreflike
        const isValueType = (flags1 & (1 << 2)) != 0;
        const isEnum = (flags1 & (1 << 3)) != 0;
        const this_arg_type = this.parseFieldType(klass.this_arg);

        return okAsync({ klass, classDefinition, isValueType, isEnum, this_arg_type });
      })
      .andThen(ctx => {
        return this.mr.readString(ctx.klass.name).map(name => ({ ...ctx, name }));
      })
      .andThen(ctx => {
        return this.mr.readString(ctx.klass.name_space).map(name_space => ({ ...ctx, name_space }));
      })
      .andThen(ctx => {
        if (ctx.klass.runtime_info != 0n) {
          // typedef struct {
          // 	guint16 max_domain;
          // 	/* domain_vtables is indexed by the domain id and the size is max_domain + 1 */
          // 	MonoVTable *domain_vtables [MONO_ZERO_LEN_ARRAY];
          // } MonoClassRuntimeInfo;
          return this.mr
            .readPtr(ctx.klass.runtime_info + 8n)
            .map(domain_vtables => ({ ...ctx, domain_vtables }));
        }
        return okAsync({ ...ctx, domain_vtables: 0n });
      })
      .andThen(ctx => {
        return toResultAsync(
          this._parseClassFields(ctx.klass.fields, ctx.classDefinition.field_count)
        ).map(fields => ({ ...ctx, fields }));
      })
      .map(ctx => {
        const data: MonoClass = {
          addr,
          parent_ptr: ctx.klass.parent,
          name: ctx.name,
          namespace: ctx.name_space,
          isValueType: ctx.isValueType,
          isEnum: ctx.isEnum,
          type: ctx.this_arg_type,
          size: ctx.klass.sizes,
          fields: ctx.fields,
          domain_vtables: ctx.domain_vtables,
          next_class_cache: ctx.classDefinition.next_class_cache,
        };

        return data;
      });
  }

  private async _parseClassFields(
    addr: bigint,
    count: number
  ): Promise<Result<MonoClassField[], MemoryReaderError>> {
    if (addr == 0n) return ok([]);

    const fields: MonoClassField[] = [];
    //field count is crazy high when dealing with generics. Something is wrong
    for (let i = 0; i < count; i++) {
      // log("field " + i + " / " + count)
      const r = await this.parseClassField(addr + BigInt(i * _MonoClassFieldL.layout.size));
      // TODO this is ASS
      // There's something I fundamentally don't understand about the fields structure
      // First fields are parsed ok, but last fields are corrupted sometimes?
      if (r.isErr()) {
        log.warn("Error while parsing fields");
        log.warn({ error: r.error });
        break;
      }
      fields.push(r.value);
    }

    return ok(fields);
  }

  private parseClassField(addr: bigint): ResultAsync<MonoClassField, MemoryReaderError> {
    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/class-internals.h#L150
    // struct _MonoClassField {
    // 	/* Type of the field */
    // 	MonoType        *type;
    // 	const char      *name;
    // 	/* Type where the field was defined */
    // 	MonoClass       *parent;
    // 	/*
    // 	 * Offset where this field is stored; if it is an instance
    // 	 * field, it's the offset from the start of the object, if
    // 	 * it's static, it's from the start of the memory chunk
    // 	 * allocated for statics for the class.
    // 	 * For special static fields, this is set to -1 during vtable construction.
    // 	 */
    // 	int              offset;
    // };

    return this.mr
      .readBytes(addr, _MonoClassFieldL.layout.size)
      .andThen(raw => {
        const classField = _MonoClassFieldL.parse(raw);
        return this.mr.readString(classField.name).map(name => ({ name, classField }));
      })
      .andThen(ctx => {
        return this.mr
          .readBytes(ctx.classField.type, _MonoTypeL.layout.size)
          .map(rawType => ({ ...ctx, rawType }));
      })
      .andThen(ctx => {
        const monoType = _MonoTypeL.parse(ctx.rawType);
        const type = this.parseFieldType(monoType);
        const data: MonoClassField = {
          name: ctx.name,
          type: type,
          parent_ptr: ctx.classField.parent,
          offset: ctx.classField.offset,
        };
        return ok(data);
      });
  }

  public parseFieldType(tp: { klass: bigint; bitfields: number }): MonoFieldType {
    //https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L24
    // struct _MonoType {
    // 	union {
    // 		MonoClass *klass; /* for VALUETYPE and CLASS */
    // 		MonoType *type;   /* for PTR */
    // 		MonoArrayType *array; /* for ARRAY */
    // 		MonoMethodSignature *method;
    // 		MonoGenericParam *generic_param; /* for VAR and MVAR */
    // 		MonoGenericClass *generic_class; /* for GENERICINST */
    // 	} data;
    // 	unsigned int attrs    : 16; /* param attributes or field flags */
    // 	MonoTypeEnum type     : 8;
    // 	unsigned int has_cmods : 1;
    // 	unsigned int byref    : 1;
    // 	unsigned int pinned   : 1;  /* valid when included in a local var signature */
    // };

    const ptr = tp.klass;
    const attributes = tp.bitfields;

    const isStatic = (attributes & 0x10) == 0x10;
    const isConstant = (attributes & 0x40) == 0x40;
    const typeCode = 0xff & (attributes >> 16);

    return { ptr, attributes, isStatic, isConstant, typeCode };
  }
}
