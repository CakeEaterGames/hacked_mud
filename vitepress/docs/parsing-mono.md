# Parsing Mono

## Roadmap

This is the hardest part of this whole guide. Get ready for a long and tedious process. Here is a roadmap:

1. Get the pointer to mono root domain
2. Parse MonoDomain struct and get domain_assemblies filed
3. Parse MonoAssembly struct and get image filed
4. Parse MonoImage struct and get MonoInternalHashTable field
5. Parse MonoInternalHashTable struct and get table field
6. Parse MonoClassDef
7. Parse MonoClassField

By the end of this page you should have definition for all classes of the game. Mono works in such way that the runtime always have the full information about all objects. That's why mono is so "easy" to parse

## Parsing the instruction

In the pervious part we got the [mono_get_root_domain](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/domain.c#L964) function that returns a pointer

```c
mono_get_root_domain (void)
{
  return mono_root_domain;
}
```

When reading the next 8 bytes and disassembling them we get this:

```hex
# 0: 48 8b 05 fc 11 44 00   mov rax, qword ptr [rip + 0x4411fc]
# 7: c3                     ret
```

Then we extract the offset from the instruction `fc 11 44 00`

`relativeOffset` is `0x4411fc` (note that it is backwards because of the little endian)

This is a relative offset and the instruction is 7 bytes long, so

`mono_root_domain` is `mono_get_root_domain` + `7` + `relativeOffset`

This is the only instruction we will ever disassemble. The rest of this project is just reading C structs.

Go to `mono_root_domain`

## MonoDomain

You are looking at [\_MonoDomain](https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/domain-internals.h#L342) struct.

::: tip By the way
Get used to reading the mono source code! I will leave all the links here so that you will know where to look at.

To keep the text compact I will not copy paste C source code but I will paste my ASCII tables for the structs.
:::

<pre class='ascii'>
┌────────────────────────────────────────────────────────────────────┐
│ _MonoDomain                                                        │
│ Size: ??? bytes, Alignment: 8 bytes                                │
├────────────────────────────────────────────────────────────────────┤
│   0- 47 │ MonoCoopMutex   │ lock                │ 48 bytes  │      │
│  48- 55 │ MonoAppDomain*  │ domain              │ 8 bytes   │      │
│  56- 63 │ MonoAppContext* │ default_context     │ 8 bytes   │      │
│  64- 71 │ MonoException*  │ out_of_memory_ex    │ 8 bytes   │      │
│  72- 79 │ MonoException*  │ null_reference_ex   │ 8 bytes   │      │
│  80- 87 │ MonoException*  │ stack_overflow_ex   │ 8 bytes   │      │
│  88- 95 │ MonoObject*     │ typeof_void         │ 8 bytes   │      │
│  96-103 │ MonoObject*     │ ephemeron_tombstone │ 8 bytes   │      │
│ 104-111 │ MonoArray*      │ empty_types         │ 8 bytes   │      │
│ 112-119 │ MonoString*     │ empty_string        │ 8 bytes   │      │
│ 120-127 │ MonoGHashTable* │ env                 │ 8 bytes   │      │
│ 128-135 │ MonoGHashTable* │ ldstr_table         │ 8 bytes   │      │
│ 136-139 │ guint32         │ state               │ 4 bytes   │      │
│ 140-143 │ gint32          │ domain_id           │ 4 bytes   │      │
│ 144-147 │ gint32          │ shadow_serial       │ 4 bytes   │      │
│ 148-151 │                 │ [padding]           │ 4 bytes   │      │
│ 152-159 │ GSList*         │ domain_assemblies   │ 8 bytes   │ <--  │
│ 160-167 │ MonoAssembly*   │ entry_assembly      │ 8 bytes   │      │
│ 168-175 │ char*           │ friendly_name       │ 8 bytes   │ <--  │
│ ... and other fields                                               │
└────────────────────────────────────────────────────────────────────┘
</pre>

Each Mono application has its own MonoDomain. It contains Mono assemblies, static variables and heap.

Go to `char* friendly_name`. Read `ZT string`. Strings are your best friends in this project. If you are reading a string and it comes out as readable text, it means that your offsets are correct and you're doing everything right

Go to `GSList* domain_assemblies`

## GSList

You are looking at a `GSList`

`GSList` is a [linked list](https://en.wikipedia.org/wiki/Linked_list).

<pre class='ascii'>
 ┌────────────────────────────────────────────────────────────────────┐
 │ _GSList                                                            │
 │ Size: 16 bytes, Alignment: 8 bytes                                 │
 ├────────────────────────────────────────────────────────────────────┤
 │   0-  7 │ gpointer*       │ data    │ 8 bytes   │ <--              │
 │   8- 15 │ GSList*         │ next    │ 8 bytes   │ <--              │
 └────────────────────────────────────────────────────────────────────┘
</pre>

Read `gpointer* data`. Save it. It is a general pointer with no way to know what it is pointing to (: cool, right? It points to [\_MonoAssembly](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214)

Goto `GSList* next`. If it is zero, you have reached the end of the list.

Repeat until you reach the end.

Goto each `gpointer* data`

## MonoAssembly

You are looking at [MonoAssembly](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L214)

MonoAssembly is a in-memory representation of a .NET dll. If you open hackmud with dotPeek or any other deobfuscator you will see the following assemblies

TODO Provide image

Assemblies can be quite large. So instead of parsing all of them, let's first get the name of each one and only parse the one we need.

<pre class='ascii'>
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoAssembly                                                                          │
 │ Size: 128 bytes, Alignment: 8 bytes                                                    │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │   0-  3 │ gint32               │ ref_count                        │ 4 bytes   │        │
 │   4-  7 │                      │ [padding]                        │ 4 bytes   │        │
 │   8- 15 │ char*                │ basedir                          │ 8 bytes   │        │
 │  16- 95 │ MonoAssemblyName     │ aname                            │ 80 bytes  │ <--    │
 │  96-103 │ MonoImage*           │ image                            │ 8 bytes   │ <--    │
 │ 104-111 │ GSList*              │ friend_assembly_names            │ 8 bytes   │        │
 │ 112-112 │ guint8               │ friend_assembly_names_inited     │ 1 byte    │        │
 │ 113-113 │ guint8               │ in_gac                           │ 1 byte    │        │
 │ 114-114 │ guint8               │ dynamic                          │ 1 byte    │        │
 │ 115-115 │ guint8               │ corlib_internal                  │ 1 byte    │        │
 │ 116-119 │ MonoAssemblyContext  │ context                          │ 4 bytes   │        │
 │ 120-120 │ guint8               │ wrap_non_exception_throws        │ 1 byte    │        │
 │ 121-121 │ guint8               │ wrap_non_exception_throws_inited │ 1 byte    │        │
 │ 122-122 │ guint8               │ jit_optimizer_disabled           │ 1 byte    │        │
 │ 123-123 │ guint8               │ jit_optimizer_disabled_inited    │ 1 byte    │        │
 │ 124-127 │ guint32              │ flags                            │ 4 bytes   │        │
 └────────────────────────────────────────────────────────────────────────────────────────┘
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ MonoAssemblyName                                                                       │
 │ Size: 80 bytes, Alignment: 8 bytes                                                     │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │   0-  7 │ char*                │ name                     │ 8 bytes   │ <--            │
 │   8- 15 │ char*                │ culture                  │ 8 bytes   │                │
 │  16- 23 │ char*                │ hash_value               │ 8 bytes   │                │
 │  24- 31 │ mono_byte*           │ public_key               │ 8 bytes   │                │
 │  32- 48 │ mono_byte            │ public_key_token         │ 17 bytes  │                │
 │  49- 51 │                      │ [padding]                │ 3 bytes   │                │
 │  52- 55 │ uint32_t             │ hash_alg                 │ 4 bytes   │                │
 │  56- 59 │ uint32_t             │ hash_len                 │ 4 bytes   │                │
 │  60- 63 │ uint32_t             │ flags                    │ 4 bytes   │                │
 │  64- 65 │ uint16_t             │ major                    │ 2 bytes   │                │
 │  66- 67 │ uint16_t             │ minor                    │ 2 bytes   │                │
 │  68- 69 │ uint16_t             │ build                    │ 2 bytes   │                │
 │  70- 71 │ uint16_t             │ revision                 │ 2 bytes   │                │
 │  72- 73 │ uint16_t             │ arch                     │ 2 bytes   │                │
 │  74- 74 │ MonoBoolean          │ without_version          │ 1 byte    │                │
 │  75- 75 │ MonoBoolean          │ without_culture          │ 1 byte    │                │
 │  76- 76 │ MonoBoolean          │ without_public_key_token │ 1 byte    │                │
 │  77- 79 │                      │ [padding]                │ 3 bytes   │                │
 └────────────────────────────────────────────────────────────────────────────────────────┘
</pre>

::: tip
[MonoAssemblyName aname](https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/metadata-internals.h#L161) is a struct, not a pointer. It is inlined.
:::

Goto `MonoAssemblyName aname`. Read a `ZT string`.

We are only interested an assembly with a name `Core`.

Goto `MonoImage* image`

## MonoImage

You are looking at [MonoImage](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L355)

Mono assembly is just a container for Mono image. It describes the structures of all classes and methods

<pre class='ascii'>
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoImage                                                                        │
 │ Size: 1272 bytes, Alignment: 8 bytes                                              │
 ├───────────────────────────────────────────────────────────────────────────────────┤
 │    0-   3 │ int                       │ ref_count              │ 4 bytes   │      │
 │    4-   7 │                           │ [padding]              │ 4 bytes   │      │
 │    8-  15 │ MonoImageStorage*         │ storage                │ 8 bytes   │      │
 │   16-  23 │ char*                     │ raw_data               │ 8 bytes   │      │
 │   24-  27 │ guint32                   │ raw_data_len           │ 4 bytes   │      │
 │   28-  28 │ guint8                    │ dynamic                │ 1 byte    │      │
 │   29-  29 │ guint8                    │ ref_only               │ 1 byte    │      │
 │   30-  30 │ guint8                    │ uncompressed_metadata  │ 1 byte    │      │
 │   31-  31 │ guint8                    │ metadata_only          │ 1 byte    │      │
 │   32-  32 │ guint8                    │ load_from_context      │ 1 byte    │      │
 │   33-  33 │ guint8                    │ checked_module_cctor   │ 1 byte    │      │
 │   34-  34 │ guint8                    │ has_module_cctor       │ 1 byte    │      │
 │   35-  35 │ guint8                    │ idx_string_wide        │ 1 byte    │      │
 │   36-  36 │ guint8                    │ idx_guid_wide          │ 1 byte    │      │
 │   37-  37 │ guint8                    │ idx_blob_wide          │ 1 byte    │      │
 │   38-  38 │ guint8                    │ core_clr_platform_code │ 1 byte    │      │
 │   39-  39 │ guint8                    │ minimal_delta          │ 1 byte    │      │
 │   40-  47 │ char*                     │ name                   │ 8 bytes   │      │
 │   48-  55 │ char*                     │ filename               │ 8 bytes   │      │
 │   56-  63 │ char*                     │ assembly_name          │ 8 bytes   │      │
 │   64-  71 │ char*                     │ module_name            │ 8 bytes   │      │
 │   72-  75 │ guint32                   │ time_date_stamp        │ 4 bytes   │      │
 │   76-  79 │                           │ [padding]              │ 4 bytes   │      │
 │   80-  87 │ char*                     │ version                │ 8 bytes   │      │
 │   88-  89 │ gint16                    │ md_version_major       │ 2 bytes   │      │
 │   90-  91 │ gint16                    │ md_version_minor       │ 2 bytes   │      │
 │   92-  95 │                           │ [padding]              │ 4 bytes   │      │
 │   96- 103 │ char*                     │ guid                   │ 8 bytes   │      │
 │  104- 111 │ MonoCLIImageInfo*         │ image_info             │ 8 bytes   │      │
 │  112- 119 │ MonoMemPool*              │ mempool                │ 8 bytes   │      │
 │  120- 127 │ char*                     │ raw_metadata           │ 8 bytes   │      │
 │  128- 143 │ MonoStreamHeader          │ heap_strings           │ 16 bytes  │      │
 │  144- 159 │ MonoStreamHeader          │ heap_us                │ 16 bytes  │      │
 │  160- 175 │ MonoStreamHeader          │ heap_blob              │ 16 bytes  │      │
 │  176- 191 │ MonoStreamHeader          │ heap_guid              │ 16 bytes  │      │
 │  192- 207 │ MonoStreamHeader          │ heap_tables            │ 16 bytes  │      │
 │  208- 223 │ MonoStreamHeader          │ heap_pdb               │ 16 bytes  │      │
 │  224- 231 │ char*                     │ tables_base            │ 8 bytes   │      │
 │  232- 239 │ guint64                   │ referenced_tables      │ 8 bytes   │      │
 │  240- 247 │ int*                      │ referenced_table_rows  │ 8 bytes   │      │
 │  248-1127 │ MonoTableInfo             │ tables                 │ 880 bytes │      │
 │ 1128-1135 │ MonoAssembly**            │ references             │ 8 bytes   │      │
 │ 1136-1139 │ int                       │ nreferences            │ 4 bytes   │      │
 │ 1140-1143 │                           │ [padding]              │ 4 bytes   │      │
 │ 1144-1151 │ MonoImage**               │ modules                │ 8 bytes   │      │
 │ 1152-1155 │ guint32                   │ module_count           │ 4 bytes   │      │
 │ 1156-1159 │                           │ [padding]              │ 4 bytes   │      │
 │ 1160-1167 │ gboolean*                 │ modules_loaded         │ 8 bytes   │      │
 │ 1168-1175 │ MonoImage**               │ files                  │ 8 bytes   │      │
 │ 1176-1179 │ guint32                   │ file_count             │ 4 bytes   │      │
 │ 1180-1183 │                           │ [padding]              │ 4 bytes   │      │
 │ 1184-1191 │ MonoAotModule*            │ aot_module             │ 8 bytes   │      │
 │ 1192-1207 │ guint8                    │ aotid                  │ 16 bytes  │      │
 │ 1208-1215 │ MonoAssembly*             │ assembly               │ 8 bytes   │      │
 │ 1216-1223 │ MonoAssemblyLoadContext*  │ alc                    │ 8 bytes   │      │
 │ 1224-1231 │ GHashTable*               │ method_cache           │ 8 bytes   │      │
 │ 1232-1271 │ MonoInternalHashTable     │ class_cache            │ 40 bytes  │ <--  │
 │ ... and other fields                                                              │                
 └───────────────────────────────────────────────────────────────────────────────────┘
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoInternalHashTable                                                            │
 │ Size: 40 bytes, Alignment: 8 bytes                                                │
 ├───────────────────────────────────────────────────────────────────────────────────┤
 │    0-   7 │ GHashFunc*                      │ hash_func   │ 8 bytes   │           │
 │    8-  15 │ MonoInternalHashKeyExtractFunc* │ key_extract │ 8 bytes   │           │
 │   16-  23 │ MonoInternalHashNextValueFunc*  │ next_value  │ 8 bytes   │           │
 │   24-  27 │ gint                            │ size        │ 4 bytes   │ <--       │
 │   28-  31 │ gint                            │ num_entries │ 4 bytes   │ <--       │
 │   32-  39 │ gpointer*                       │ table       │ 8 bytes   │ <--       │
 └───────────────────────────────────────────────────────────────────────────────────┘
</pre>

We are interested in [MonoInternalHashTable](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/utils/mono-internal-hash.h#L36)

Unsurprisingly, it is a [hash table](https://en.wikipedia.org/wiki/Hash_table).

Read `gint size`. Number of bytes that takes the array at `gpointer* table`.

`num_lines` is `gint size` / `8`. How many elements are in `gpointer* table`

Read `gint num_entries`. (optional) Number of elements in the entire hash table

Read `gpointer* table`. Pointer to an array of pointers to `MonoClassDef`

Go to `gpointer* table` and read `num_lines` pointers

You now have an array of pointers to `MonoClassDef`

Go to each pointer

## MonoClassDef

You are looking at [MonoClassDef](https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/class-private-definition.h#L135)

And also you are looking at [MonoClass](https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/class-private-definition.h#L14), because it is right at the start of the struct

<pre class='ascii'>
 ┌──────────────────────────────────────────────────────────────┐
 │ _MonoClassDef                                                │
 │ Size: 264 bytes, Alignment: 8 bytes                          │
 ├──────────────────────────────────────────────────────────────┤
 │    0- 231 │ MonoClass  │ klass            │ 232 bytes │ <--  │
 │  232- 235 │ guint32    │ flags            │ 4 bytes   │      │
 │  236- 239 │ guint32    │ first_method_idx │ 4 bytes   │      │
 │  240- 243 │ guint32    │ first_field_idx  │ 4 bytes   │      │
 │  244- 247 │ guint32    │ method_count     │ 4 bytes   │      │
 │  248- 251 │ guint32    │ field_count      │ 4 bytes   │ <--  │
 │  252- 255 │            │ [padding]        │ 4 bytes   │      │
 │  256- 263 │ MonoClass* │ next_class_cache │ 8 bytes   │ <--  │
 └──────────────────────────────────────────────────────────────┘
</pre>

Read `MonoClass* next_class_cache`. It points to the next `MonoClassDef`. If it is `0` you have reached the end

Read `guint32 field_count`. It is the number of fields in this MonoClass

Process `MonoClass klass` as described in the next section

Go to `MonoClass* next_class_cache`

Repeat until the end

## MonoClass

You are looking at [MonoClass](https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/class-private-definition.h#L14)

Mono class is exactly what it sounds like. We have reached the actual class definition.

<pre class='ascii'>
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ _MonoClass                                                                        │
 │ Size: 232 bytes, Alignment: 8 bytes                                               │
 ├───────────────────────────────────────────────────────────────────────────────────┤
 │    0-   7 │ MonoClass*            │ element_class            │ 8 bytes   │        │
 │    8-  15 │ MonoClass*            │ cast_class               │ 8 bytes   │        │
 │   16-  23 │ MonoClass*            │ supertypes               │ 8 bytes   │        │
 │   24-  25 │ guint16               │ idepth                   │ 2 bytes   │        │
 │   26-  26 │ guint8                │ rank                     │ 1 byte    │        │
 │   27-  27 │ guint8                │ class_kind               │ 1 byte    │        │
 │   28-  31 │ guint                 │ bitfields1               │ 4 bytes   │ <--    │
 │   32-  32 │ guint8                │ min_align                │ 1 byte    │        │
 │   33-  33 │                       │ bitfields2               │ 1 byte    │        │
 │   34-  34 │                       │ bitfields3               │ 1 byte    │        │
 │   35-  35 │                       │ bitfields4               │ 1 byte    │        │
 │   36-  39 │                       │ [padding]                │ 4 bytes   │        │
 │   40-  47 │ MonoClass*            │ parent                   │ 8 bytes   │ <--    │
 │   48-  55 │ MonoClass*            │ nested_in                │ 8 bytes   │        │
 │   56-  63 │ MonoImage*            │ image                    │ 8 bytes   │        │
 │   64-  71 │ const char*           │ name                     │ 8 bytes   │ <--    │
 │   72-  79 │ const char*           │ name_space               │ 8 bytes   │ <--    │
 │   80-  83 │ guint32               │ type_token               │ 4 bytes   │        │
 │   84-  87 │ int                   │ vtable_size              │ 4 bytes   │        │
 │   88-  89 │ guint16               │ interface_count          │ 2 bytes   │        │
 │   90-  91 │                       │ [padding]                │ 2 bytes   │        │
 │   92-  95 │ guint32               │ interface_id             │ 4 bytes   │        │
 │   96-  99 │ guint32               │ max_interface_id         │ 4 bytes   │        │
 │  100- 101 │ guint16               │ interface_offsets_count  │ 2 bytes   │        │
 │  102- 103 │                       │ [padding]                │ 2 bytes   │        │
 │  104- 111 │ MonoClass*            │ interfaces_packed        │ 8 bytes   │        │
 │  112- 119 │ guint16*              │ interface_offsets_packed │ 8 bytes   │        │
 │  120- 127 │ guint8*               │ interface_bitmap         │ 8 bytes   │        │
 │  128- 135 │ MonoClass*            │ interfaces               │ 8 bytes   │        │
 │  136- 139 │ union _MonoClassSizes │ sizes                    │ 4 bytes   │ <--    │
 │  140- 143 │                       │ [padding]                │ 4 bytes   │        │
 │  144- 151 │ MonoClassField*       │ fields                   │ 8 bytes   │ <--    │
 │  152- 159 │ MonoMethod*           │ methods                  │ 8 bytes   │        │
 │  160- 175 │ MonoType              │ this_arg                 │ 16 bytes  │ <--    │
 │  176- 191 │ MonoType              │ _byval_arg               │ 16 bytes  │        │
 │  192- 199 │ MonoGCDescriptor*     │ gc_descr                 │ 8 bytes   │        │
 │  200- 207 │ MonoClassRuntimeInfo* │ runtime_info             │ 8 bytes   │ <--    │
 │  208- 215 │ MonoMethod*           │ vtable                   │ 8 bytes   │        │
 │  216- 223 │ MonoPropertyBag*      │ infrequent_data          │ 8 bytes   │        │
 │  224- 231 │ void*                 │ unity_user_data          │ 8 bytes   │        │
 └───────────────────────────────────────────────────────────────────────────────────┘
</pre>

Read `guint bitfields1`.

`bitfields1` is an arbitrary name that I assigned myself. This is how it looks in the [mono source code](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/class-private-definition.h#L44)

```c
// TODO Is my struct definition incorrect? Where did `int instance_size` go???

guint inited          : 1;

guint size_inited     : 1;
guint valuetype       : 1; /* derives from System.ValueType */
guint enumtype        : 1; /* derives from System.Enum */
guint blittable       : 1; /* class is blittable */
guint unicode         : 1; /* class uses unicode char when marshalled */
guint wastypebuilder  : 1; /* class was created at runtime from a TypeBuilder */
guint is_array_special_interface : 1; /* gtd or ginst of once of the magic interfaces that arrays implement */
guint is_byreflike    : 1; /* class is a valuetype and has System.Runtime.CompilerServices.IsByRefLikeAttribute */
```

Each value is one bit so you need to do some bit shifting. `valuetype` is at bit `2` and `isEnum` is at bit `3`

```
const isValueType = (bitfields1 & (1 << 2)) != 0;
const isEnum = (bitfields1 & (1 << 3)) != 0;
```

With this variables you can tell if a class is a [Enum](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/enum) or a [ValueType](https://learn.microsoft.com/en-us/dotnet/api/system.valuetype?view=net-10.0)

::: tip Note
After re reading my code I noticed that I'm not using these values. So it is optional for this guide.
:::

Read `MonoClass* parent`. It is a pointer to a parent class definition

Go to `char* name`. Read `ZT String`. it is a name of the class

Go to `char* name_space`. Read `ZT String`. it is a namespace in which the class is located

Read `union _MonoClassSizes sizes`. It is an [int32 value](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/class-internals.h#L280) can be used for getting the length of arrays.

Go to the start of `MonoType this_arg`. Continue reading [MonoType](#monotype)

Go to `MonoClassRuntimeInfo* runtime_info`. Continue reading [MonoClassRuntimeInfo](#monoclassruntimeinfo)

Go to `MonoClassField* fields`. Continue reading [MonoClassField](#monoclassfield)

## MonoType

You are looking at a [MonoType](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/metadata-internals.h#L24)

<pre class='ascii'>
┌───────────────────────────────────────────────────────────────┐
│ MonoType                                                      │
│ Size: 16 bytes, Alignment: 8 bytes                            │
├───────────────────────────────────────────────────────────────┤
│    0-   7 │ Union MonoClass* │ klass     │ 8 bytes   │ <--    │
│    8-  11 │ unsigned int     │ bitfields │ 4 bytes   │ <--    │
│   12-  15 │                  │ [padding] │ 4 bytes   │        │
└───────────────────────────────────────────────────────────────┘
</pre>

```c
struct _MonoType {
	union {
		MonoClass *klass; /* for VALUETYPE and CLASS */
		MonoType *type;   /* for PTR */
		MonoArrayType *array; /* for ARRAY */
		MonoMethodSignature *method;
		MonoGenericParam *generic_param; /* for VAR and MVAR */
		MonoGenericClass *generic_class; /* for GENERICINST */
	} data;
	unsigned int attrs     : 16; /* param attributes or field flags */
	MonoTypeEnum type      : 8;
	unsigned int has_cmods : 1;
	unsigned int byref     : 1;
	unsigned int pinned    : 1;  /* valid when included in a local var signature */
};
```

Read `MonoClass* klass`. It is a pointer to a type of a field

Read `bitfields`. Use these bit shifts to get `isStatic`, `isConstant`, `typeCode`

```
isStatic = (bitfields & 0x10) == 0x10
isConstant = (bitfields & 0x40) == 0x40
typeCode = 0xff & (bitfields >> 16)
```

TODO What is TypeCode

## MonoClassRuntimeInfo

You are looking at [MonoClassRuntimeInfo](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/class-internals.h#L243)

<pre class='ascii'>
┌───────────────────────────────────────────────────────────────┐
│ MonoClassRuntimeInfo                                          │
│ Size: 16 bytes, Alignment: 8 bytes                            │
├───────────────────────────────────────────────────────────────┤
│    0-   1 │ guint16      │ max_domain    │ 2 bytes   │        │
│    2-   7 │              │ [padding]     │ 6 bytes   │        │
│    8-  15 │ MonoVTable*  │ domain_vtables│ 8 bytes   │ <--    │
└───────────────────────────────────────────────────────────────┘
</pre>

Read `MonoVTable *domain_vtables`. We can later use this value to find objects of this class in heap memory.

## MonoClassField

You are looking at an array of [MonoClassField](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/class-internals.h#L150)

Earlier in [MonoClassDef](#monoclassdef) you've read field_count. It is a length of this array.

<pre class='ascii'>
┌───────────────────────────────────────────────────────────────┐
│ _MonoClassField                                               │
│ Size: 32 bytes, Alignment: 8 bytes                            │
├───────────────────────────────────────────────────────────────┤
│    0-   7 │ MonoType*   │ type      │ 8 bytes   │ <--         │
│    8-  15 │ char*       │ name      │ 8 bytes   │ <--         │
│   16-  23 │ MonoClass*  │ parent    │ 8 bytes   │ <--         │
│   24-  27 │ int         │ offset    │ 4 bytes   │ <--         │
│   28-  31 │             │ [padding] │ 4 bytes   │             │
└───────────────────────────────────────────────────────────────┘
</pre>

Go to `MonoType* type`. Continue reading [MonoType](#monotype). You already read it before for the class but now you need to do it for each field of the class

Go to `char* name`. Read `ZT String`. It is a name of the class field.

Read `MonoClass* parent`. (Optional) Pointer to the parent class. Can read to double check yourself.

Read `int offset`. It is an offset from the start of the object. The field will be located in memory at `objectPtr`+`offset`. Will be relevant in next page of the guide.

## Conclusion

After traversing all of these structs you should now have the following data

- `Core` Assembly. (Or even all assemblies).
- Each assembly has Classes
- Each class has fields
- Each field has a type and an offset

Using this information you can now parse actual structs in memory. But we need to find them first.
