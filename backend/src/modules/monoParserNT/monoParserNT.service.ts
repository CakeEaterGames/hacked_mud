import { log } from "@backend/plugins/logger/logger";

import { StructLayoutGenerator } from "../structLayoutGenerator/structLayoutGenerator.service";
import {
  _MonoDomainD,
  _MonoAssemblyD,
  _MonoImageD,
  _MonoClassDefD,
  _MonoClassFieldD,
  _MonoTypeD,
} from "./monoParserNT.models";
import type {
  MonoClass,
  MonoAssembly,
  MonoClassField,
  MonoFieldType,
  MonoAssemblyIndexEntry,
  AssemblyNotFoundError,
} from "./monoParserNT.types";
import { MemoryReader } from "../memoryReaderNT/memoryReader.service";
import { err, errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import type { MemoryReaderError } from "../memoryReader/memoryReader.models";
import { toResultAsync } from "@backend/utils/neverthrow";

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

    const MonoDomainL = new StructLayoutGenerator(_MonoDomainD);

    this.mr.seek(this.root);

    // 48 8b 05 fc 11 44 00      # 0: 48 8b 05 fc 11 44 00   mov rax, qword ptr [rip + 0x4411fc]
    // c3                        # 7: c3                      ret

    this.mr.skip(3n);
    return this.mr
      .readUInt32()
      .andThen(relativeOffset => {
        //because the instruction is 7 bytes long
        this.mr.seek(this.root + 7n + BigInt(relativeOffset));
        return this.mr.readPtr();
      })
      .andThen(appDomainPtr => {
        this.mr.seek(appDomainPtr);
        return this.mr.readBytes(MonoDomainL.layout.size);
      })
      .andThen(rawData => {
        const domain = MonoDomainL.parse(rawData);
        const domain_assemblies = domain.domain_assemblies; /// points to an linked list of pointers
        this.mr.seek(domain_assemblies);
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
  ): Promise<ResultAsync<bigint[], MemoryReaderError>> {
    this.mr.seek(start);
    const assemblyPointers: bigint[] = [];
    while (true) {
      // typedef struct _GSList GSList;
      // struct _GSList {
      // 	gpointer data;
      // 	GSList *next;
      // };
      const next = await this.mr
        .readPtr()
        .andThen(assemblyPtr => {
          // pointer to the element
          assemblyPointers.push(assemblyPtr);
          return this.mr.readPtr();
        })
        .andThen(next => {
          // pointer to the next array element
          this.mr.seek(next);
          return ok(next);
        });

      if (next.isErr()) return err(next.error);
      if (next.value == 0n) break;
    }
    return ok(assemblyPointers);
  }

  private async _collectAssemblyNames(
    assemblyPointers: bigint[]
  ): Promise<ResultAsync<MonoAssemblyIndexEntry[], MemoryReaderError>> {
    const assemblies = [];
    for (const ptr of assemblyPointers) {
      this.mr.seek(ptr);
      this.mr.skip(16n); //skip gint32 ref_count -> ...sneaky 4 bytes here for pointer offset -> char *basedir -> arrive at MonoAssemblyName const char *name;
      const nameStr = await this.mr.readPtr().andThen(MonoAssemblyName_namePtr => {
        this.mr.seek(MonoAssemblyName_namePtr);
        return this.mr.readString();
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

    const MonoAssemblyL = new StructLayoutGenerator(_MonoAssemblyD);
    const MonoImageL = new StructLayoutGenerator(_MonoImageD);

    this.mr.seek(assemblyEntry.addr);

    return this.mr
      .readBytes(MonoAssemblyL.layout.size)
      .andThen(raw => {
        const assembly = MonoAssemblyL.parse(raw);

        this.mr.seek(assembly.aname.name);
        return this.mr.readString().map(nameStr => ({ assembly, nameStr }));
      })
      .andThen(ctx => {
        // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L355

        this.mr.seek(ctx.assembly.image);
        return this.mr.readBytes(MonoImageL.layout.size).map(rawImage => ({ ...ctx, rawImage }));
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

  private async _hashTableLoop(
    rawImage: Buffer
  ): Promise<ResultAsync<MonoClass[], MemoryReaderError>> {
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

    const MonoImageL = new StructLayoutGenerator(_MonoImageD);

    const image = MonoImageL.parse(rawImage);
    const classCacheSize = image.class_cache.size;
    const _num_entries = image.class_cache.num_entries;
    const gpointer = image.class_cache.table;

    const classes = [];

    for (let i = 0; i < classCacheSize; i++) {
      this.mr.seek(gpointer + BigInt(i * 8)); // a pointer is 8 bytes long

      const loopAddrRes = await this.mr.readPtr();
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

  public getClassByAddr(addr: bigint) {
    const klass = this.monoClasses.find(a => a.addr === addr);
    if (klass) return klass;

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

    const layout = new StructLayoutGenerator(_MonoClassDefD);

    this.mr.seek(addr);
    return this.mr
      .readBytes(layout.layout.size)
      .andThen(raw => {
        const classDefinition = layout.parse(raw);
        const klass = classDefinition.klass;

        const flags1 = klass.bitfields1; // inited, size_inited, valuetype, enumtype, blittable, unicode, wastypebuilder, is_array_special_interface, is_byreflike
        const isValueType = (flags1 & (1 << 2)) != 0;
        const isEnum = (flags1 & (1 << 3)) != 0;
        const this_arg_type = this.parseFieldType(klass.this_arg);

        return okAsync({ klass, classDefinition, isValueType, isEnum, this_arg_type });
      })
      .andThen(ctx => {
        this.mr.seek(ctx.klass.name);
        return this.mr.readString().map(name => ({ ...ctx, name }));
      })
      .andThen(ctx => {
        this.mr.seek(ctx.klass.name_space);
        return this.mr.readString().map(name_space => ({ ...ctx, name_space }));
      })
      .andThen(ctx => {
        if (ctx.klass.runtime_info != 0n) {
          // typedef struct {
          // 	guint16 max_domain;
          // 	/* domain_vtables is indexed by the domain id and the size is max_domain + 1 */
          // 	MonoVTable *domain_vtables [MONO_ZERO_LEN_ARRAY];
          // } MonoClassRuntimeInfo;
          this.mr.seek(ctx.klass.runtime_info + 8n);
          return this.mr.readPtr().map(domain_vtables => ({ ...ctx, domain_vtables }));
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
  ): Promise<ResultAsync<MonoClassField[], MemoryReaderError>> {
    if (addr == 0n) return ok([]);

    const classFieldL = new StructLayoutGenerator(_MonoClassFieldD);

    const fields: MonoClassField[] = [];
    //field count is crazy high when dealing with generics. Something is wrong
    for (let i = 0; i < count; i++) {
      // log("field " + i + " / " + count)
      const r = await this.parseClassField(addr + BigInt(i * classFieldL.layout.size));
      // TODO this is ASS
      // There's something I fundamentally don't understand about the fields structure
      // First fields are parsed ok, but last fields are corrupted?
      if (r.isErr()) {
        log.error("Error while parsing fields");
        log.error({ error: r.error });
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

    const classFieldL = new StructLayoutGenerator(_MonoClassFieldD);
    const monoTypeL = new StructLayoutGenerator(_MonoTypeD);

    this.mr.seek(addr);

    return this.mr
      .readBytes(classFieldL.layout.size)
      .andThen(raw => {
        const classField = classFieldL.parse(raw);
        this.mr.seek(classField.name);
        return this.mr.readString().map(name => ({ name, classField }));
      })
      .andThen(ctx => {
        this.mr.seek(ctx.classField.type);
        return this.mr.readBytes(monoTypeL.layout.size).map(rawType => ({ ...ctx, rawType }));
      })
      .andThen(ctx => {
        const monoType = monoTypeL.parse(ctx.rawType);
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
