# Parsing Mono

## Roadmap

This is the hardest part of this whole guide. Get ready for a long and tedious process. Here is a roadmap:

1. Write a memory walker
2. Write a struct layout generator
3. Get the pointer to mono root domain
4. Parse _MonoDomain struct and get domain_assemblies filed
5. Parse _MonoAssembly struct and get image filed
6. Parse _MonoImage struct and get MonoInternalHashTable field
7. Parse _MonoInternalHashTable struct and get table field
8. Parse _MonoClassDef
9. Parse _MonoClassField
10. Use the collected class information to read actual objects

## Understanding the problem

In the pervious part we got the mono_get_root_domain function that returns a [pointer](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/domain.c#L964)

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

Then we extract the offset from the instruction `fc 11 44`, add jump to it in memory 

::: tip 
This is a relative offset, the instruction is 7 bytes long, so we need to jump to
`mono_get_root_domain_ptr + 7 + relativeOffset`
:::

We land at [_MonoDomain](https://github.com/Unity-Technologies/mono/blob/fc8503b2fdeab87730c3f97f61854462298f66ab/mono/metadata/domain-internals.h#L342) struct.

By the way, get used to reading the mono code! I will leave all the links here so that you will know where to look at.

Here's a part of that struct

```c
struct _MonoDomain {
	MonoCoopMutex    lock;
	MonoAppDomain      *domain;
	MonoAppContext     *default_context;
	MonoException      *out_of_memory_ex;
	MonoException      *null_reference_ex;
	MonoException      *stack_overflow_ex;
	MonoObject         *typeof_void;
	MonoObject         *ephemeron_tombstone;
	MonoArray          *empty_types;
	MonoString         *empty_string;
	MonoGHashTable     *env;
	MonoGHashTable     *ldstr_table;
	guint32            state;
	gint32             domain_id;
	gint32             shadow_serial;
	GSList             *domain_assemblies;
	MonoAssembly       *entry_assembly;
	char               *friendly_name;

  // ...

};
```

All fields are positioned in memory one after the other. In this struct we only need to read `*domain_assemblies` and `*friendly_name`. This means that we need to somehow calculate the offset at which those 2 fields are positioned and read from there. You can
- a. Calculate the offsets by hand and hard code them into the mem reader
- b. Write a struct layout generator that calculates offsets for you

If you want to keep your sanity I would suggest option b

## Struct Layout

Here's a layout of a _MonoClass struct.

TODO replace with _MonoDomain

TODO change the line height

```raw
┌──────────────────────────────────────────────────────────┐
│ _MonoClass                                               │
│ Size: 232 bytes, Alignment: 8 bytes                      │
├──────────────────────────────────────────────────────────┤
│   0-  7 │ element_class            │ 8 bytes             │
│   8- 15 │ cast_class               │ 8 bytes             │
│  16- 23 │ supertypes               │ 8 bytes             │
│  24- 25 │ idepth                   │ 2 bytes             │
│  26- 26 │ rank                     │ 1 byte              │
│  27- 27 │ class_kind               │ 1 byte              │
│  28- 31 │ bitfields1               │ 4 bytes             │
│  32- 32 │ min_align                │ 1 byte              │
│  33- 33 │ bitfields2               │ 1 byte              │
│  34- 34 │ bitfields3               │ 1 byte              │
│  35- 35 │ bitfields4               │ 1 byte              │
│  36- 39 │ [padding]                │ 4 bytes░░░░░░░░░░░░ │
│  40- 47 │ parent                   │ 8 bytes             │
│  48- 55 │ nested_in                │ 8 bytes             │
│  56- 63 │ image                    │ 8 bytes             │
│  64- 71 │ name                     │ 8 bytes             │
│  72- 79 │ name_space               │ 8 bytes             │
│  80- 83 │ type_token               │ 4 bytes             │
│  84- 87 │ vtable_size              │ 4 bytes             │
│  88- 89 │ interface_count          │ 2 bytes             │
│  90- 91 │ [padding]                │ 2 bytes░░░░░░░░░░░░ │
│  92- 95 │ interface_id             │ 4 bytes             │
│  96- 99 │ max_interface_id         │ 4 bytes             │
│ 100-101 │ interface_offsets_count  │ 2 bytes             │
│ 102-103 │ [padding]                │ 2 bytes░░░░░░░░░░░░ │
│ 104-111 │ interfaces_packed        │ 8 bytes             │
│ 112-119 │ interface_offsets_packed │ 8 bytes             │
│ 120-127 │ interface_bitmap         │ 8 bytes             │
│ 128-135 │ interfaces               │ 8 bytes             │
│ 136-139 │ sizes                    │ 4 bytes             │
│ 140-143 │ [padding]                │ 4 bytes░░░░░░░░░░░░ │
│ 144-151 │ fields                   │ 8 bytes             │
│ 152-159 │ methods                  │ 8 bytes             │
│ 160-175 │ this_arg                 │ 16 bytes            │
│ 176-191 │ _byval_arg               │ 16 bytes            │
│ 192-199 │ gc_descr                 │ 8 bytes             │
│ 200-207 │ runtime_info             │ 8 bytes             │
│ 208-215 │ vtable                   │ 8 bytes             │
│ 216-223 │ infrequent_data          │ 8 bytes             │
│ 224-231 │ unity_user_data          │ 8 bytes             │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ _MonoClassDef                                            │
│ Size: 264 bytes, Alignment: 8 bytes                      │
├──────────────────────────────────────────────────────────┤
│   0-231 │ klass            │ 232 bytes                   │
│ 232-235 │ flags            │ 4 bytes                     │
│ 236-239 │ first_method_idx │ 4 bytes                     │
│ 240-243 │ first_field_idx  │ 4 bytes                     │
│ 244-247 │ method_count     │ 4 bytes                     │
│ 248-251 │ field_count      │ 4 bytes                     │
│ 252-255 │ [padding]        │ 4 bytes░░░░░░░░░░░░░░░░░░░░ │
│ 256-263 │ next_class_cache │ 8 bytes                     │
└──────────────────────────────────────────────────────────┘
```

Here's a quick reference of how much space each data type takes

TODO 

### Padding

TODO

