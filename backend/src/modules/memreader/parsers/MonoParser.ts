import { MemoryReader } from "./MemoryReader";
import type { MonoAssembly, MonoClass, MonoClassField, MonoFieldType } from "./types";
import {
  _MonoClassDefD,
  _MonoClassFieldD,
  _MonoClassD,
  _MonoTypeD,
  _MonoAssemblyNameD,
  _MonoAssemblyD,
  _MonoImageD,
  _MonoDomainD,
} from "../StructLayoutGenerator/definitions";
import { StructLayoutGenerator } from "../StructLayoutGenerator";
import { log } from "@backend/plugins/logger/logger";

type MonoAssemblyIndexEntry = {
  name: string;
  addr: bigint;
};

export class MonoParser {
  constructor(
    public pid: number,
    private origin: bigint,
    private mono_get_root_domain: bigint
  ) {}

  public assemblyIndexes: MonoAssemblyIndexEntry[] = [];
  public monoClasses: MonoClass[] = [];

  public async init() {
    const root = this.origin + this.mono_get_root_domain;
    this.assemblyIndexes = await this.findMonoAssemblies(root);
  }
  public async parseAssemblyByName(name: string) {
    const ass = this.assemblyIndexes.find(a => a.name == name);
    if (!ass) throw new Error("Failed to find assembly: " + name);
    return await this.parseAssembly(ass?.addr);
  }

  private async findMonoAssemblies(addr: bigint): Promise<MonoAssemblyIndexEntry[]> {
    //The function accepts a pointer to
    // mono_get_root_domain (void)
    // {
    // 	return mono_root_domain;
    // }
    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/domain.c#L964

    const mr = new MemoryReader(this.pid, addr);

    // log((await mr.readBytes(32, false, false)))
    // 48 8b 05 fc 11 44 00      # 0: 48 8b 05 fc 11 44 00   mov rax, qword ptr [rip + 0x4411fc]
    // c3                        # 7: c3                      ret

    mr.skip(3n);
    const relativeOffset = await mr.readUInt32();
    //because the instruction is 7 bytes long
    mr.seek(addr + 7n + BigInt(relativeOffset));
    const appDomainPtr = await mr.readPtr();

    // log("appDomainPtr " + appDomainPtr)

    const MonoDomainL = new StructLayoutGenerator(_MonoDomainD);
    mr.seek(appDomainPtr);
    const domain = MonoDomainL.parse(await mr.readBytes(MonoDomainL.layout.size));

    const domain_assemblies = domain.domain_assemblies; /// points to an linked list of pointers
    mr.seek(domain_assemblies);

    const assemblyPtrs = [];
    while (true) {
      // typedef struct _GSList GSList;
      // struct _GSList {
      // 	gpointer data;
      // 	GSList *next;
      // };
      const assemblyPtr = await mr.readPtr(); // pointer to the element
      const next = await mr.readPtr(); // pointer to next linked list element
      mr.seek(next);

      if (next == 0n) break;
      assemblyPtrs.push(assemblyPtr);
    }
    // log(assemblyPtrs)

    const assemblies = [];

    for (const ptr of assemblyPtrs) {
      const mr = new MemoryReader(this.pid, ptr);
      mr.skip(16n); //skip gint32 ref_count -> ...sneaky 4 bytes here for pointer offset -> char *basedir -> arrive at MonoAssemblyName const char *name;
      const MonoAssemblyName_namePtr = await mr.readPtr();
      mr.seek(MonoAssemblyName_namePtr);
      const nameStr = await mr.readString();
      // log(nameStr)

      assemblies.push({ name: nameStr, addr: ptr });
      // let ass = await this.parseAssembly(ptr)
      // if (ass) assemblies.push(ass)
    }
    return assemblies;
  }

  private async parseAssembly(addr: bigint): Promise<MonoAssembly | undefined> {
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
    const mr2 = new MemoryReader(this.pid, addr);

    const assembly = MonoAssemblyL.parse(await mr2.readBytes(MonoAssemblyL.layout.size));
    const nameStr = await MemoryReader.readString(this.pid, assembly.aname.name);
    // log(nameStr)
    // log(assembly)

    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L355

    const MonoImageL = new StructLayoutGenerator(_MonoImageD);
    mr2.seek(assembly.image);
    const image = MonoImageL.parse(await mr2.readBytes(MonoImageL.layout.size));

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

    const classCacheSize = image.class_cache.size;
    const _num_entries = image.class_cache.num_entries;
    const gpointer = image.class_cache.table;

    const classes = [];
    for (let i = 0; i < classCacheSize; i++) {
      mr2.seek(gpointer + BigInt(i * 8)); // apointer is 8 bytes long

      let somePtr = await mr2.readPtr();
      while (somePtr != 0n) {
        //points to https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/class-private-definition.h#L145
        const klass = await this.parseMonoClass(somePtr);
        classes.push(klass);
        somePtr = klass.next_class_cache;
      }
    }

    const ass: MonoAssembly = {
      name: nameStr!,
      // addr: addr,
      classes: classes,
    };

    return ass;
  }

  public async getClassByAddr(addr: bigint) {
    let klass = this.monoClasses.find(a => a.addr === addr);

    if (!klass) {
      klass = await this.parseMonoClass(addr);
      this.monoClasses.push(klass);
    }

    return klass;
  }

  private async parseMonoClass(addr: bigint): Promise<MonoClass> {
    const layout = new StructLayoutGenerator(_MonoClassDefD);
    const mr2 = new MemoryReader(this.pid, addr);
    const buf = await mr2.readBytes(layout.layout.size);
    const clDef = layout.parse(buf);
    const cl = clDef.klass;

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

    const flags1 = cl.bitfields1; // inited, size_inited, valuetype, enumtype, blittable, unicode, wastypebuilder, is_array_special_interface, is_byreflike
    const isValueType = (flags1 & (1 << 2)) != 0;
    const isEnum = (flags1 & (1 << 3)) != 0;

    const name = await MemoryReader.readString(this.pid, cl.name);
    const namespace = await MemoryReader.readString(this.pid, cl.name_space);

    const this_arg_type = this.parseFieldType(cl.this_arg);

    let domain_vtables = 0n;
    if (cl.runtime_info != 0n) {
      // typedef struct {
      // 	guint16 max_domain;
      // 	/* domain_vtables is indexed by the domain id and the size is max_domain + 1 */
      // 	MonoVTable *domain_vtables [MONO_ZERO_LEN_ARRAY];
      // } MonoClassRuntimeInfo;
      const mr = new MemoryReader(this.pid, cl.runtime_info + 8n);
      domain_vtables = await mr.readPtr();
    }

    const fields = await this.parseClassFields(cl.fields, clDef.field_count);

    const data: MonoClass = {
      addr,
      parent_ptr: cl.parent,
      name,
      namespace,
      isValueType,
      isEnum,
      type: this_arg_type,
      size: cl.sizes,
      fields,
      domain_vtables,
      next_class_cache: clDef.next_class_cache,
    };

    // log(name)

    return data;
  }

  private async parseClassFields(addr: bigint, count: number): Promise<MonoClassField[]> {
    if (addr == 0n) return [];

    const classFieldL = new StructLayoutGenerator(_MonoClassFieldD);

    const fields: MonoClassField[] = [];
    //field count is crazy high when dealing with generics. Something is wrong
    for (let i = 0; i < count; i++) {
      // log("field " + i + " / " + count)
      try {
        const r = await this.parseClassField(addr + BigInt(i * classFieldL.layout.size));
        if (!r) break;
        fields.push(r);
      } catch (e) {
        log.error("Error while parsing fields");
        log.error({ e });
        break;
      }
    }

    return fields;
  }

  private async parseClassField(addr: bigint): Promise<MonoClassField | undefined> {
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
    const mr = new MemoryReader(this.pid, addr);
    const buf = await mr.readBytes(classFieldL.layout.size);
    const classField = classFieldL.parse(buf);

    const name = await MemoryReader.readString(this.pid, classField.name);

    const monoTypeL = new StructLayoutGenerator(_MonoTypeD);
    mr.seek(classField.type);
    const buf2 = await mr.readBytes(monoTypeL.layout.size);
    const monoType = monoTypeL.parse(buf2);

    const type = this.parseFieldType(monoType);

    const data: MonoClassField = {
      name: name!,
      type: type,
      parent_ptr: classField.parent,
      offset: classField.offset,
    };

    // log(data)
    return data;
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
