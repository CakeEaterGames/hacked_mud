import {
  defineStruct,
  StructLayoutGenerator,
} from "../structLayoutGenerator/structLayoutGenerator.service";

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
export const _MonoTypeD = defineStruct({
  name: "MonoType",
  fields: [
    { ctype: "Union MonoClass*", name: "klass", type: "ptr" },
    { ctype: "unsigned int", name: "bitfields", type: "int32" },
  ],
} as const);
export const _MonoTypeL = new StructLayoutGenerator(_MonoTypeD);

// struct _MonoClass {
// 	MonoClass *element_class;
// 	MonoClass *cast_class;
// 	MonoClass **supertypes;
// 	guint16     idepth;
// 	guint8     rank;
// 	guint8     class_kind;
// 	guint inited          : 1;

// 	/* ALL BITFIELDS SHOULD BE WRITTEN WHILE HOLDING THE LOADER LOCK */
// 	guint size_inited     : 1;
// 	guint valuetype       : 1; /* derives from System.ValueType */
// 	guint enumtype        : 1; /* derives from System.Enum */
// 	guint blittable       : 1; /* class is blittable */
// 	guint unicode         : 1; /* class uses unicode char when marshalled */
// 	guint wastypebuilder  : 1; /* class was created at runtime from a TypeBuilder */
// 	guint is_array_special_interface : 1; /* gtd or ginst of once of the magic interfaces that arrays implement */
// 	guint is_byreflike    : 1; /* class is a valuetype and has System.Runtime.CompilerServices.IsByRefLikeAttribute */

// 	/* next byte */
// 	guint8 min_align;
// 	guint packing_size    : 4;
// 	guint ghcimpl         : 1; /* class has its own GetHashCode impl */
// 	guint has_finalize    : 1; /* class has its own Finalize impl */
// 	guint marshalbyref    : 1; /* class is a MarshalByRefObject */
// 	guint contextbound    : 1; /* class is a ContextBoundObject */

// 	/* next byte */
// 	guint delegate        : 1; /* class is a Delegate */
// 	guint gc_descr_inited : 1; /* gc_descr is initialized */
// 	guint has_cctor       : 1; /* class has a cctor */
// 	guint has_references  : 1; /* it has GC-tracked references in the instance */
// 	guint has_static_refs : 1; /* it has static fields that are GC-tracked */
// 	guint no_special_static_fields : 1; /* has no thread/context static fields */
// 	guint is_com_object : 1;
// 	guint nested_classes_inited : 1; /* Whenever nested_class is initialized */

// 	/* next byte*/
// 	guint interfaces_inited : 1; /* interfaces is initialized */
// 	guint simd_type : 1; /* class is a simd intrinsic type */
// 	guint has_finalize_inited    : 1; /* has_finalize is initialized */
// 	guint fields_inited : 1; /* setup_fields () has finished */
// 	guint has_failure : 1; /* See mono_class_get_exception_data () for a MonoErrorBoxed with the details */
// 	guint has_weak_fields : 1; /* class has weak reference fields */
// 	guint has_dim_conflicts : 1; /* Class has conflicting default interface methods */

// 	MonoClass  *parent;
// 	MonoClass  *nested_in;
// 	MonoImage *image;
// 	const char *name;
// 	const char *name_space;
// 	guint32    type_token;
// 	int        vtable_size; /* number of slots */
// 	guint16     interface_count;
// 	guint32     interface_id;        /* unique inderface id (for interfaces) */
// 	guint32     max_interface_id;
// 	guint16     interface_offsets_count;
// 	MonoClass **interfaces_packed;
// 	guint16    *interface_offsets_packed;
// 	guint8     *interface_bitmap;
// 	MonoClass **interfaces;
// 	union _MonoClassSizes sizes;
// 	MonoClassField *fields;
// 	MonoMethod **methods;
// 	MonoType this_arg;
// 	MonoType _byval_arg;
// 	MonoGCDescriptor gc_descr;
// 	MonoClassRuntimeInfo *runtime_info;
// 	MonoMethod **vtable;
// 	MonoPropertyBag infrequent_data;
// 	void *unity_user_data;
// };
export const _MonoClassD = defineStruct({
  name: "_MonoClass",
  fields: [
    { ctype: "MonoClass*", name: "element_class", type: "ptr" },
    { ctype: "MonoClass*", name: "cast_class", type: "ptr" },
    { ctype: "MonoClass*", name: "supertypes", type: "ptr" },
    { ctype: "guint16", name: "idepth", type: "uint16" },
    { ctype: "guint8", name: "rank", type: "uint8" },
    { ctype: "guint8", name: "class_kind", type: "uint8" },

    { ctype: "guint", name: "bitfields1", type: "uint32" }, // This represents bitfields from 'inited' through 'is_byreflike'

    // Next byte - alignment and packing
    { ctype: "guint8", name: "min_align", type: "uint8" },
    { type: "uint8", name: "bitfields2" }, // Bitfields from 'packing_size' through 'contextbound'
    { type: "uint8", name: "bitfields3" }, // Bitfields from 'delegate' through 'nested_classes_inited'
    { type: "uint8", name: "bitfields4" }, // Bitfields from 'interfaces_inited' through 'has_dim_conflicts'

    { ctype: "MonoClass*", name: "parent", type: "ptr" },
    { ctype: "MonoClass*", name: "nested_in", type: "ptr" },
    { ctype: "MonoImage*", name: "image", type: "ptr" },
    { ctype: "const char*", name: "name", type: "ptr" },
    { ctype: "const char*", name: "name_space", type: "ptr" },
    { ctype: "guint32", name: "type_token", type: "uint32" },

    { ctype: "int", name: "vtable_size", type: "int32" },
    { ctype: "guint16", name: "interface_count", type: "uint16" },
    { ctype: "guint32", name: "interface_id", type: "uint32" },
    { ctype: "guint32", name: "max_interface_id", type: "uint32" },
    { ctype: "guint16", name: "interface_offsets_count", type: "uint16" },
    { ctype: "MonoClass*", name: "interfaces_packed", type: "ptr" },
    { ctype: "guint16*", name: "interface_offsets_packed", type: "ptr" },
    { ctype: "guint8*", name: "interface_bitmap", type: "ptr" },
    { ctype: "MonoClass*", name: "interfaces", type: "ptr" },

    {
      ctype: "union _MonoClassSizes",
      name: "sizes",
      type: "int32",
    },

    { ctype: "MonoClassField*", name: "fields", type: "ptr" },
    { ctype: "MonoMethod*", name: "methods", type: "ptr" },

    {
      ctype: "MonoType",
      name: "this_arg",
      type: "struct",
      definition: _MonoTypeD,
    },
    {
      ctype: "MonoType",
      name: "_byval_arg",
      type: "struct",
      definition: _MonoTypeD,
    },

    {
      ctype: "MonoGCDescriptor*", // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/sgen/sgen-conf.h#L32
      name: "gc_descr",
      type: "ptr",
    },
    {
      ctype: "MonoClassRuntimeInfo*",
      name: "runtime_info",
      type: "ptr",
    },

    { ctype: "MonoMethod*", name: "vtable", type: "ptr" },
    {
      ctype: "MonoPropertyBag*", //https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/property-bag.h#L24
      name: "infrequent_data",
      type: "ptr",
    },

    { ctype: "void*", name: "unity_user_data", type: "ptr" },
  ],
} as const);
export const _MonoClassL = new StructLayoutGenerator(_MonoClassD);

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
export const _MonoClassDefD = defineStruct({
  name: "_MonoClassDef",
  fields: [
    { ctype: "MonoClass", name: "klass", type: "struct", definition: _MonoClassD },
    { ctype: "guint32", name: "flags", type: "uint32" },
    { ctype: "guint32", name: "first_method_idx", type: "uint32" },
    { ctype: "guint32", name: "first_field_idx", type: "uint32" },
    { ctype: "guint32", name: "method_count", type: "uint32" },
    { ctype: "guint32", name: "field_count", type: "uint32" },
    { ctype: "MonoClass*", name: "next_class_cache", type: "ptr" },
  ],
});
export const _MonoClassDefL = new StructLayoutGenerator(_MonoClassDefD);

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
export const _MonoClassFieldD = defineStruct({
  name: "_MonoClassField",
  fields: [
    { ctype: "MonoType*", name: "type", type: "ptr" },
    { ctype: "char*", name: "name", type: "ptr" },
    { ctype: "MonoClass*", name: "parent", type: "ptr" },
    { ctype: "int", name: "offset", type: "int32" },
  ],
});
export const _MonoClassFieldL = new StructLayoutGenerator(_MonoClassFieldD);

// https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214
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
export const _MonoAssemblyNameD = defineStruct({
  name: "_MonoAssemblyName",
  fields: [
    { ctype: "char*", name: "name", type: "ptr" },
    { ctype: "char*", name: "culture", type: "ptr" },
    { ctype: "char*", name: "hash_value", type: "ptr" },
    { ctype: "mono_byte*", name: "public_key", type: "ptr" },
    {
      ctype: "mono_byte",
      name: "public_key_token",
      type: "array",
      arrayType: { type: "uint8", name: "element" },
      count: 17,
    },
    { ctype: "uint32_t", name: "hash_alg", type: "uint32" },
    { ctype: "uint32_t", name: "hash_len", type: "uint32" },
    { ctype: "uint32_t", name: "flags", type: "uint32" },
    // { ctype: "int32_t", name: "major", type: "int32" },
    // { ctype: "int32_t", name: "minor", type: "int32" },
    // { ctype: "int32_t", name: "build", type: "int32" },
    // { ctype: "int32_t", name: "revision", type: "int32" },
    // { ctype: "int32_t", name: "arch", type: "int32" },

    { ctype: "uint16_t", name: "major", type: "uint16" },
    { ctype: "uint16_t", name: "minor", type: "uint16" },
    { ctype: "uint16_t", name: "build", type: "uint16" },
    { ctype: "uint16_t", name: "revision", type: "uint16" },
    { ctype: "uint16_t", name: "arch", type: "uint16" },

    { ctype: "MonoBoolean", name: "without_version", type: "uint8" },
    { ctype: "MonoBoolean", name: "without_culture", type: "uint8" },
    { ctype: "MonoBoolean", name: "without_public_key_token", type: "uint8" },
  ],
});
export const _MonoAssemblyNameL = new StructLayoutGenerator(_MonoAssemblyNameD);

// https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214
// struct _MonoAssembly {
// 	/*
// 	 * The number of appdomains which have this assembly loaded plus the number of
// 	 * assemblies referencing this assembly through an entry in their image->references
// 	 * arrays. The latter is needed because entries in the image->references array
// 	 * might point to assemblies which are only loaded in some appdomains, and without
// 	 * the additional reference, they can be freed at any time.
// 	 * The ref_count is initially 0.
// 	 */
// 	gint32 ref_count; /* use atomic operations only */
// 	char *basedir;
// 	MonoAssemblyName aname;
// 	MonoImage *image;
// 	GSList *friend_assembly_names; /* Computed by mono_assembly_load_friends () */
// 	guint8 friend_assembly_names_inited;
// 	guint8 in_gac;
// 	guint8 dynamic;
// 	guint8 corlib_internal;
// 	MonoAssemblyContext context;
// 	guint8 wrap_non_exception_throws;
// 	guint8 wrap_non_exception_throws_inited;
// 	guint8 jit_optimizer_disabled;
// 	guint8 jit_optimizer_disabled_inited;
// 	/* security manager flags (one bit is for lazy initialization) */
// 	guint32 ecma:2;		/* Has the ECMA key */
// 	guint32 aptc:2;		/* Has the [AllowPartiallyTrustedCallers] attributes */
// 	guint32 fulltrust:2;	/* Has FullTrust permission */
// 	guint32 unmanaged:2;	/* Has SecurityPermissionFlag.UnmanagedCode permission */
// 	guint32 skipverification:2;	/* Has SecurityPermissionFlag.SkipVerification permission */
// };
export const _MonoAssemblyD = defineStruct({
  name: "_MonoAssembly",
  fields: [
    { ctype: "gint32", name: "ref_count", type: "int32" },
    { ctype: "char*", name: "basedir", type: "ptr" },
    { ctype: "MonoAssemblyName", name: "aname", type: "struct", definition: _MonoAssemblyNameD },
    { ctype: "MonoImage*", name: "image", type: "ptr" },
    { ctype: "GSList*", name: "friend_assembly_names", type: "ptr" },
    { ctype: "guint8", name: "friend_assembly_names_inited", type: "uint8" },
    { ctype: "guint8", name: "in_gac", type: "uint8" },
    { ctype: "guint8", name: "dynamic", type: "uint8" },
    { ctype: "guint8", name: "corlib_internal", type: "uint8" },
    { ctype: "MonoAssemblyContext", name: "context", type: "int32" },
    { ctype: "guint8", name: "wrap_non_exception_throws", type: "uint8" },
    { ctype: "guint8", name: "wrap_non_exception_throws_inited", type: "uint8" },
    { ctype: "guint8", name: "jit_optimizer_disabled", type: "uint8" },
    { ctype: "guint8", name: "jit_optimizer_disabled_inited", type: "uint8" },
    { ctype: "guint32", name: "flags", type: "uint32" },
  ],
});
export const _MonoAssemblyL = new StructLayoutGenerator(_MonoAssemblyD);

// https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L287
// typedef struct {
// 	const char* data;
// 	guint32  size;
// } MonoStreamHeader;
export const MonoStreamHeaderD = defineStruct({
  name: "MonoStreamHeader",
  fields: [
    { ctype: "char*", name: "data", type: "ptr" },
    { ctype: "guint32", name: "size", type: "uint32" },
  ],
});
export const MonoStreamHeaderL = new StructLayoutGenerator(MonoStreamHeaderD);

// https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L289
// struct _MonoTableInfo {
// 	const char *base;
// 	guint       rows     : 24;
// 	guint       row_size : 8;

// 	/*
// 	 * Tables contain up to 9 columns and the possible sizes of the
// 	 * fields in the documentation are 1, 2 and 4 bytes.  So we
// 	 * can encode in 2 bits the size.
// 	 *
// 	 * A 32 bit value can encode the resulting size
// 	 *
// 	 * The top eight bits encode the number of columns in the table.
// 	 * we only need 4, but 8 is aligned no shift required.
// 	 */
// 	guint32   size_bitfield;
// };
export const _MonoTableInfoD = defineStruct({
  name: "_MonoTableInfo",
  fields: [
    { ctype: "char*", name: "base", type: "ptr" },
    { ctype: "guint", name: "row_info", type: "uint32" },
    { ctype: "guint32", name: "size_bitfield", type: "uint32" },
  ],
});
export const _MonoTableInfoL = new StructLayoutGenerator(_MonoTableInfoD);

// https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/utils/mono-internal-hash.h#L36
// struct _MonoInternalHashTable
// {
// 	GHashFunc hash_func;
// 	MonoInternalHashKeyExtractFunc key_extract;
// 	MonoInternalHashNextValueFunc next_value;
// 	gint size; //according to deepseek I can treat it as an int32
// 	gint num_entries;
// 	gpointer *table;
// };
export const _MonoInternalHashTableD = defineStruct({
  name: "_MonoInternalHashTable",
  fields: [
    { ctype: "GHashFunc*", name: "hash_func", type: "ptr" },
    { ctype: "MonoInternalHashKeyExtractFunc*", name: "key_extract", type: "ptr" },
    { ctype: "MonoInternalHashNextValueFunc*", name: "next_value", type: "ptr" },
    { ctype: "gint", name: "size", type: "int32" },
    { ctype: "gint", name: "num_entries", type: "int32" },
    { ctype: "gpointer*", name: "table", type: "ptr" },
  ],
});
export const _MonoInternalHashTableL = new StructLayoutGenerator(_MonoInternalHashTableD);

// https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L355
// struct _MonoImage {
// 	int   ref_count;
// 	MonoImageStorage *storage;
// 	char *raw_data;
// 	guint32 raw_data_len;
// 	guint8 dynamic : 1;
// 	guint8 ref_only : 1;
// 	guint8 uncompressed_metadata : 1;
// 	guint8 metadata_only : 1;
// 	guint8 load_from_context: 1;
// 	guint8 checked_module_cctor : 1;
// 	guint8 has_module_cctor : 1;
// 	guint8 idx_string_wide : 1;
// 	guint8 idx_guid_wide : 1;
// 	guint8 idx_blob_wide : 1;
// 	guint8 core_clr_platform_code : 1;
// 	guint8 minimal_delta : 1;

// 	char *name;
// 	char *filename;
// 	const char *assembly_name;
// 	const char *module_name;
// 	guint32 time_date_stamp;
// 	char *version;
// 	gint16 md_version_major, md_version_minor;
// 	char *guid;
// 	MonoCLIImageInfo    *image_info;
// 	MonoMemPool         *mempool; /*protected by the image lock*/
// 	char                *raw_metadata;
// 	MonoStreamHeader     heap_strings;
// 	MonoStreamHeader     heap_us;
// 	MonoStreamHeader     heap_blob;
// 	MonoStreamHeader     heap_guid;
// 	MonoStreamHeader     heap_tables;
// 	MonoStreamHeader     heap_pdb;
// 	const char          *tables_base;
// 	guint64 referenced_tables;
// 	int *referenced_table_rows;
// 	MonoTableInfo        tables [MONO_TABLE_NUM];
// 	MonoAssembly **references;
// 	int nreferences;
// 	MonoImage **modules;
// 	guint32 module_count;
// 	gboolean *modules_loaded;
// 	MonoImage **files;
// 	guint32 file_count;
// 	MonoAotModule *aot_module;
// 	guint8 aotid[16];
// 	MonoAssembly *assembly;
// 	MonoAssemblyLoadContext *alc;
// 	GHashTable *method_cache; /*protected by the image lock*/
// 	MonoInternalHashTable class_cache;
// 	GHashTable *methodref_cache; /*protected by the image lock*/
// 	MonoConcurrentHashTable *field_cache; /*protected by the image lock*/
// 	MonoConcurrentHashTable *typespec_cache; /* protected by the image lock */
// 	GHashTable *memberref_signatures;
// 	GHashTable *method_signatures;
// 	GHashTable *name_cache;  /*protected by the image lock*/
// 	GHashTable *array_cache;
// 	GHashTable *ptr_cache;
// 	GHashTable *szarray_cache;
// 	mono_mutex_t szarray_cache_lock;
// 	GHashTable *native_func_wrapper_cache;
// 	GHashTable *wrapper_param_names;
// 	GHashTable *array_accessor_cache;
// 	GHashTable *ldfld_wrapper_cache;
// 	GHashTable *ldflda_wrapper_cache;
// 	GHashTable *stfld_wrapper_cache;
// 	GHashTable *isinst_cache;
// 	GHashTable *icall_wrapper_cache;
// 	GHashTable *castclass_cache;
// 	GHashTable *proxy_isinst_cache;
// 	GHashTable *rgctx_template_hash; /* LOCKING: templates lock */
// 	MonoPropertyHash *property_hash;
// 	void *reflection_info;
// 	void *user_info;

// #ifndef DISABLE_DLLMAP
// 	/* dll map entries */
// 	MonoDllMap *dll_map;
// #endif

// 	MonoBitSet *interface_bitset;
// 	GSList *reflection_info_unregister_classes;
// 	GSList *image_sets;
// 	MonoWrapperCaches wrapper_caches;
// 	MonoGenericParam *var_gparam_cache_fast;
// 	MonoGenericParam *mvar_gparam_cache_fast;
// 	MonoConcurrentHashTable *var_gparam_cache;
// 	MonoConcurrentHashTable *mvar_gparam_cache;

// #ifndef ENABLE_NETCORE
// 	/* Maps malloc-ed char* pinvoke scope -> MonoDl* */
// 	GHashTable *pinvoke_scopes;
// #endif

// 	MonoImageLoader *loader;
// 	MonoGenericContainer *anonymous_generic_class_container;
// 	MonoGenericContainer *anonymous_generic_method_container;

// 	gboolean weak_fields_inited;
// 	GHashTable *weak_field_indexes;

// #ifdef ENABLE_METADATA_UPDATE
// 	GList *delta_image;
// 	GList *delta_image_last;
// 	uint32_t generation; /* global update ID that added this delta image */
// 	GHashTable *method_table_update;

// #endif

// 	mono_mutex_t    lock;
// };
export const _MonoImageD = defineStruct({
  name: "_MonoImage",
  fields: [
    { ctype: "int", name: "ref_count", type: "int32" },
    { ctype: "MonoImageStorage*", name: "storage", type: "ptr" },
    { ctype: "char*", name: "raw_data", type: "ptr" },
    { ctype: "guint32", name: "raw_data_len", type: "uint32" },

    // Bitfield flags
    { ctype: "guint8", name: "dynamic", type: "uint8" },
    { ctype: "guint8", name: "ref_only", type: "uint8" },
    { ctype: "guint8", name: "uncompressed_metadata", type: "uint8" },
    { ctype: "guint8", name: "metadata_only", type: "uint8" },
    { ctype: "guint8", name: "load_from_context", type: "uint8" },
    { ctype: "guint8", name: "checked_module_cctor", type: "uint8" },
    { ctype: "guint8", name: "has_module_cctor", type: "uint8" },
    { ctype: "guint8", name: "idx_string_wide", type: "uint8" },
    { ctype: "guint8", name: "idx_guid_wide", type: "uint8" },
    { ctype: "guint8", name: "idx_blob_wide", type: "uint8" },
    { ctype: "guint8", name: "core_clr_platform_code", type: "uint8" },
    { ctype: "guint8", name: "minimal_delta", type: "uint8" },

    { ctype: "char*", name: "name", type: "ptr" },
    { ctype: "char*", name: "filename", type: "ptr" },
    { ctype: "char*", name: "assembly_name", type: "ptr" },
    { ctype: "char*", name: "module_name", type: "ptr" },
    { ctype: "guint32", name: "time_date_stamp", type: "uint32" },
    { ctype: "char*", name: "version", type: "ptr" },
    { ctype: "gint16", name: "md_version_major", type: "int16" },
    { ctype: "gint16", name: "md_version_minor", type: "int16" },
    { ctype: "char*", name: "guid", type: "ptr" },

    { ctype: "MonoCLIImageInfo*", name: "image_info", type: "ptr" },
    { ctype: "MonoMemPool*", name: "mempool", type: "ptr" },
    { ctype: "char*", name: "raw_metadata", type: "ptr" },

    {
      ctype: "MonoStreamHeader",
      name: "heap_strings",
      type: "struct",
      definition: MonoStreamHeaderD,
    },
    { ctype: "MonoStreamHeader", name: "heap_us", type: "struct", definition: MonoStreamHeaderD },
    { ctype: "MonoStreamHeader", name: "heap_blob", type: "struct", definition: MonoStreamHeaderD },
    { ctype: "MonoStreamHeader", name: "heap_guid", type: "struct", definition: MonoStreamHeaderD },
    {
      ctype: "MonoStreamHeader",
      name: "heap_tables",
      type: "struct",
      definition: MonoStreamHeaderD,
    },
    { ctype: "MonoStreamHeader", name: "heap_pdb", type: "struct", definition: MonoStreamHeaderD },

    { ctype: "char*", name: "tables_base", type: "ptr" },

    { ctype: "guint64", name: "referenced_tables", type: "uint64" },
    { ctype: "int*", name: "referenced_table_rows", type: "ptr" },

    // Metadata tables array - fixed size array
    // https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/blob.h#L110
    // The magic number 55 comes from this enum
    // If you count to MONO_TABLE_CUSTOMDEBUGINFORMATION, you get 55
    {
      ctype: "MonoTableInfo",
      name: "tables",
      type: "array",
      arrayType: { type: "struct", name: "table", definition: _MonoTableInfoD },
      count: 55,
    },

    { ctype: "MonoAssembly**", name: "references", type: "ptr" },
    { ctype: "int", name: "nreferences", type: "int32" },

    { ctype: "MonoImage**", name: "modules", type: "ptr" },
    { ctype: "guint32", name: "module_count", type: "uint32" },
    { ctype: "gboolean*", name: "modules_loaded", type: "ptr" },
    { ctype: "MonoImage**", name: "files", type: "ptr" },
    { ctype: "guint32", name: "file_count", type: "uint32" },

    { ctype: "MonoAotModule*", name: "aot_module", type: "ptr" },
    {
      ctype: "guint8",
      name: "aotid",
      type: "array",
      arrayType: { type: "uint8", name: "byte" },
      count: 16,
    },

    { ctype: "MonoAssembly*", name: "assembly", type: "ptr" },

    { ctype: "MonoAssemblyLoadContext*", name: "alc", type: "ptr" },

    { ctype: "GHashTable*", name: "method_cache", type: "ptr" },
    {
      ctype: "MonoInternalHashTable",
      name: "class_cache",
      type: "struct",
      definition: _MonoInternalHashTableD,
    },

    // We only need the definition upto this point.
    // Everything else is not relevant for the current project
  ],
});
export const _MonoImageL = new StructLayoutGenerator(_MonoImageD);

// struct _MonoDomain {
// 	/*
// 	 * This lock must never be taken before the loader lock,
// 	 * i.e. if both are taken by the same thread, the loader lock
// 	 * must taken first.
// 	 */
// 	MonoCoopMutex    lock;

// 	/*
// 	 * keep all the managed objects close to each other for the precise GC
// 	 * For the Boehm GC we additionally keep close also other GC-tracked pointers.
// 	 */
// #ifndef ENABLE_NETCORE
// #define MONO_DOMAIN_FIRST_OBJECT setup
// 	MonoAppDomainSetup *setup;
// #else
// #define MONO_DOMAIN_FIRST_OBJECT domain
// #endif
// 	MonoAppDomain      *domain;
// 	MonoAppContext     *default_context;
// 	MonoException      *out_of_memory_ex;
// 	MonoException      *null_reference_ex;
// 	MonoException      *stack_overflow_ex;
// 	/* typeof (void) */
// 	MonoObject         *typeof_void;
// 	/* Ephemeron Tombstone*/
// 	MonoObject         *ephemeron_tombstone;
// 	/* new MonoType [0] */
// 	MonoArray          *empty_types;
// 	MonoString         *empty_string;
// 	/*
// 	 * The fields between FIRST_GC_TRACKED and LAST_GC_TRACKED are roots, but
// 	 * not object references.
// 	 */
// #define MONO_DOMAIN_FIRST_GC_TRACKED env
// 	MonoGHashTable     *env;
// 	MonoGHashTable     *ldstr_table;
// #define MONO_DOMAIN_LAST_GC_TRACKED ldstr_table
// 	guint32            state;
// 	/* Needed by Thread:GetDomainID() */
// 	gint32             domain_id;
// 	gint32             shadow_serial;
// 	/*
// 	 * For framework Mono, this is every assembly loaded in this
// 	 * domain. For netcore, this is every assembly loaded in every ALC in
// 	 * this domain.  In netcore, the thread that adds an assembly to its
// 	 * MonoAssemblyLoadContext:loaded_assemblies should also add it to this
// 	 * list.
// 	 */
// 	GSList             *domain_assemblies;
// 	MonoAssembly       *entry_assembly;
// 	char               *friendly_name;
// 	/* maps remote class key -> MonoRemoteClass */
// 	GHashTable         *proxy_vtable_hash;
// 	/* Protected by 'jit_code_hash_lock' */
// 	MonoInternalHashTable jit_code_hash;
// 	mono_mutex_t    jit_code_hash_lock;
// 	int		    num_jit_info_table_duplicates;
// 	MonoJitInfoTable *
// 	  volatile          jit_info_table;
// 	/*
// 	 * Contains information about AOT loaded code.
// 	 * Only used in the root domain.
// 	 */
// 	MonoJitInfoTable *
// 	  volatile          aot_modules;
// 	GSList		   *jit_info_free_queue;
// 	/* Used when loading assemblies */
// 	gchar **search_path;
// 	gchar *private_bin_path;
// 	LockFreeMempool *lock_free_mp;

// 	/* Used by remoting proxies */
// 	MonoMethod         *create_proxy_for_type_method;
// 	MonoMethod         *private_invoke_method;
// 	/* Used to store offsets of thread and context static fields */
// 	GHashTable         *special_static_fields;
// 	/*
// 	 * This must be a GHashTable, since these objects can't be finalized
// 	 * if the hashtable contains a GC visible reference to them.
// 	 */
// 	GHashTable         *finalizable_objects_hash;

// 	/* Protects the three hashes above */
// 	mono_mutex_t   finalizable_objects_hash_lock;
// 	/* Used when accessing 'domain_assemblies' */
// 	MonoCoopMutex  assemblies_lock;

// 	GHashTable	   *generic_virtual_cases;

// 	/* Information maintained by the JIT engine */
// 	gpointer runtime_info;

// 	/* Information maintained by mono-debug.c */
// 	gpointer debug_info;

// 	/* Contains the compiled runtime invoke wrapper used by finalizers */
// 	gpointer            finalize_runtime_invoke;

// 	/* Contains the compiled runtime invoke wrapper used by async resylt creation to capture thread context*/
// 	gpointer            capture_context_runtime_invoke;

// 	/* Contains the compiled method used by async resylt creation to capture thread context*/
// 	gpointer            capture_context_method;

// 	/* Assembly bindings, the per-domain part */
// 	GSList *assembly_bindings;
// 	gboolean assembly_bindings_parsed;

// 	/* Used by socket-io.c */
// 	/* These are domain specific, since the assembly can be unloaded */
// 	MonoImage *socket_assembly;
// 	MonoClass *sockaddr_class;
// 	MonoClassField *sockaddr_data_field;
// 	MonoClassField *sockaddr_data_length_field;

// 	/* Cache function pointers for architectures  */
// 	/* that require wrappers */
// 	GHashTable *ftnptrs_hash;

// 	/* Maps MonoMethod* to weak links to DynamicMethod objects */
// 	GHashTable *method_to_dyn_method;

// 	/* <ThrowUnobservedTaskExceptions /> support */
// 	gboolean throw_unobserved_task_exceptions;

// 	guint32 execution_context_field_offset;

// #ifdef ENABLE_NETCORE
// 	GSList *alcs;
// 	MonoAssemblyLoadContext *default_alc;
// 	MonoCoopMutex alcs_lock; /* Used when accessing 'alcs' */
// #endif

// #ifndef ENABLE_NETCORE
// 	// Holds domain code memory
// 	MonoMemoryManager *memory_manager;
// #endif
// };

export const _MonoDomainD = defineStruct({
  name: "_MonoDomain",
  fields: [
    // // FIXME mono_mutex_t and mono_mutex_recursive_t.
    // typedef struct mono_mutex_t {
    // 	union {
    // 		CRITICAL_SECTION critical_section;
    // 		SRWLOCK srwlock;
    // 	};
    // 	gboolean recursive;
    // } mono_mutex_t;

    { ctype: "MonoCoopMutex", name: "lock", type: "padding", size: 48 }, //WTF????

    // First object - depends on NETCORE define
    // { ctype: "MonoAppDomainSetup", name: "setup", type: "ptr" }, // !ENABLE_NETCORE

    { ctype: "MonoAppDomain*", name: "domain", type: "ptr" },
    { ctype: "MonoAppContext*", name: "default_context", type: "ptr" },
    { ctype: "MonoException*", name: "out_of_memory_ex", type: "ptr" },
    { ctype: "MonoException*", name: "null_reference_ex", type: "ptr" },
    { ctype: "MonoException*", name: "stack_overflow_ex", type: "ptr" },
    { ctype: "MonoObject*", name: "typeof_void", type: "ptr" },
    { ctype: "MonoObject*", name: "ephemeron_tombstone", type: "ptr" },
    { ctype: "MonoArray*", name: "empty_types", type: "ptr" },
    { ctype: "MonoString*", name: "empty_string", type: "ptr" },

    // GC tracked fields
    { ctype: "MonoGHashTable*", name: "env", type: "ptr" },
    { ctype: "MonoGHashTable*", name: "ldstr_table", type: "ptr" },

    { ctype: "guint32", name: "state", type: "uint32" },
    { ctype: "gint32", name: "domain_id", type: "int32" },
    { ctype: "gint32", name: "shadow_serial", type: "int32" },

    { ctype: "GSList*", name: "domain_assemblies", type: "ptr" },
    { ctype: "MonoAssembly*", name: "entry_assembly", type: "ptr" },
    { ctype: "char*", name: "friendly_name", type: "ptr" },

    // We only care about domain_assemblies
    // the rest of the struct remains unmapped
  ],
});
export const _MonoDomainL = new StructLayoutGenerator(_MonoDomainD);

// struct _GSList {
// 	gpointer data;
// 	GSList *next;
// };

export const _GSListD = defineStruct({
  name: "_GSList",
  fields: [
    { ctype: "gpointer*", name: "data", type: "ptr" },
    { ctype: "GSList*", name: "next", type: "ptr" },
  ],
});
export const _GSListL = new StructLayoutGenerator(_GSListD);

// typedef struct {
// 	guint16 max_domain;
// 	/* domain_vtables is indexed by the domain id and the size is max_domain + 1 */
// 	MonoVTable *domain_vtables [MONO_ZERO_LEN_ARRAY];
// } MonoClassRuntimeInfo;
export const MonoClassRuntimeInfoD = defineStruct({
  name: "MonoClassRuntimeInfo",
  fields: [
    { ctype: "guint16", name: "max_domain", type: "uint16" },
    { ctype: "MonoVTable*", name: "domain_vtables", type: "ptr" },
  ],
});
export const MonoClassRuntimeInfoL = new StructLayoutGenerator(MonoClassRuntimeInfoD);


// struct _MonoObject {
// 	MonoVTable *vtable;
// 	MonoThreadsSync *synchronisation;
// };


// NOTE: This is not used
export const MonoObjectD = defineStruct({
  name: "_MonoObject",
  fields: [
    { ctype: "MonoVTable*", name: "vtable", type: "ptr" },
    { ctype: "MonoThreadsSync*", name: "synchronisation", type: "ptr" },
  ],
});
export const MonoObjectL = new StructLayoutGenerator(MonoObjectD);


// struct _MonoString {
// 	MonoObject object;
// 	int32_t length;
// 	mono_unichar2 chars [MONO_ZERO_LEN_ARRAY];
// };

// NOTE: This is not used
export const MonoStringD = defineStruct({
  name: "_MonoString",
  fields: [
    { ctype: "MonoObject", name: "object", type: "struct", definition:MonoObjectD },
    { ctype: "int32_t", name: "length", type: "int32" },
    { ctype: "mono_unichar2", name: "chars", type: "padding", size: 100 },
  ],
});
export const MonoStringL = new StructLayoutGenerator(MonoStringD);


// struct _MonoArray {
// 	MonoObject obj;
// 	/* bounds is NULL for szarrays */
// 	MonoArrayBounds *bounds;
// 	/* total number of elements of the array */
// 	mono_array_size_t max_length; 
// 	/* we use mono_64bitaligned_t to ensure proper alignment on platforms that need it */
// 	mono_64bitaligned_t vector [MONO_ZERO_LEN_ARRAY];
// };

// NOTE: This is not used
export const MonoArrayD = defineStruct({
  name: "_MonoArray",
  fields: [
    { ctype: "MonoObject", name: "obj", type: "struct", definition: MonoObjectD },
    { ctype: "MonoArrayBounds*", name: "bounds", type: "ptr" },
    { ctype: "mono_array_size_t", name: "max_length", type: "int32" },
    { ctype: "mono_64bitaligned_t", name: "data", type: "padding", size: 100 },
  ],
});
export const MonoArrayL = new StructLayoutGenerator(MonoArrayD);

