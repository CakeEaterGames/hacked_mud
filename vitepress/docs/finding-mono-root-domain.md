# Finding Mono Root Domain (Linux)

## Roadmap

In this section of the guide we will execute a series of linux commands to eventually get the pointer to `mono_root_domain` of a `hackmud` process, which is necessary for reading the memory of a mono application.

here's a rough roadmap of what we need to do:

1. Locate the `hackmud` process ID(s)
2. Read the process memory maps from /proc
3. Identify the `libmonobdwgc` shared library sections
4. Parse the ELF binary to locate symbols
5. Extract the `mono_get_root_domain` function address

## Getting PID

Let's start with the Process IDs

```bash
ps aux | grep -v grep | grep hackmud
```

```bash
username@hostname:~$  ps aux | grep -v grep | grep hackmud
username      7738 15.2  3.3 6489560 550288 ?      Sl   Jul26 173:58 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
username    137363 44.5 16.2 9290812 2658944 ?     Rl   Jul26 485:17 /home/steam/.local/share/Steam/steamapps/common/hackmud/hackmud_lin.x86_64 -batchmode -silent-crashes -logFile /dev/null -windowed -w 8 -h 8 -si
```

I have 2 `hackmud` instances running. One was launched from the desktop and another was launched in a docker container.
We need to parse the strings to get PIDs 7738 and 137363.

::: tip
Use this function to execute shell commands in TypeScript

```ts
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
const res = await exec("ps aux | grep -v grep | grep hackmud");
```

:::

## What is proc

::: info AI
The /proc/[PID] directory is a virtual filesystem that exposes runtime information about a specific process as files. The kernel dynamically generates these entries, allowing you to inspect a process's state using standard file tools.

Key subdirectories/files include:

- maps – The process's memory map, showing loaded libraries, heap, stack, and their address ranges.
- environ – The environment variables passed to the process at launch.
- mem – Direct access to the process's virtual memory (requires appropriate permissions to read/write).
- cmdline – The exact command used to start the process.
- fd/ – A directory listing all open file descriptors and their targets.
- exe – A symbolic link to the actual executable binary on disk.
- status – Human-readable summary including PID, memory usage, and state.
:::

TODO Remove this AI slop. This is the only AI piece in the docs

## Reading the maps

We need to read the proc maps to find the mono library.

```bash
cat /proc/${pid}/maps
```

```bash
username@hostname:~$ cat /proc/7738/maps
00200000-00201000 r--p 00000000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
00201000-00202000 r-xp 00001000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
00202000-00203000 r--p 00002000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
00203000-00204000 rw-p 00003000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
0e27b000-12140000 rw-p 00000000 00:00 0 [heap]
4057c000-4058c000 rwxp 00000000 00:00 0
413d3000-4168e000 rwxp 00000000 00:00 0
7c2404000000-7c2404021000 rw-p 00000000 00:00 0
7c2404021000-7c2408000000 ---p 00000000 00:00 0
7c240b000000-7c240c021000 rw-p 00000000 00:00 0
7c240c021000-7c2410000000 ---p 00000000 00:00 0
7c2410000000-7c2410021000 rw-p 00000000 00:00 0
...
```

::: warning
Reading `/proc/[pid]/maps` and `/proc/[pid]/mem` typically requires root privileges
or the same user as the process. For the docker container instance, ensure you have
appropriate permissions.
:::

Parse every line and extract the following values:

- start - 00200000
- end - 00201000
- path - /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64

For now we will only need the `libmonobdwgc` map, but later on we will need all of them.

As you can see there are 4 memory mappings for `libmonobdwgc-2.0.so`.
**We need the first executable section (r-xp)**. The `r-xp` segment contains the actual machine code we need to disassemble.

```bash
username@hostname:~$ cat /proc/7738/maps | grep libmonobdwgc
7c2586600000-7c25869a1000 r-xp 00000000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
7c25869a1000-7c2586ba1000 ---p 003a1000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
7c2586ba1000-7c2586bab000 r--p 003a1000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
7c2586bab000-7c2586bad000 rw-p 003ab000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
```

## Parsing the ELF file

[Executable and Linkable Format](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) (ELF) is a very well documented format. You can read about it on a linked page. To keep the guide short I will only explain the basics.

You can either write your own parser or you can install something like elfy js or any other library. However I couldn't get it to work the way I wanted so I wrote my own parser. I recommend you to do the same.

::: warning
From now On I will be using the [memory layout jargon](/docs/memory-layout.html#language)
:::
::: tip Note
I will assume you're on a 64bit system so all types are for a 64 bits OS
:::

## Reading ELF Header

Here's what we need to do:

Open this file `/proc/${pid}/mem`

`origin` is `0x7c2586600000` (value is from the cmd output above)

Go to `origin`

You are looking at the `ELF header`. Arrow are pointing at relevant fields

<pre class='ascii'>
 ┌──────────────────────────────────────────────────────────┐
 │ Elf64Ehdr                                                │
 │ Size: 16 bytes, Alignment: 4 bytes                       │
 ├──────────────────────────────────────────────────────────┤
 │   0-  3 │ uint32     │ ei_mag        │ 4 bytes  | <--    │
 │   4-  4 │ uint8      │ ei_class      │ 1 byte   | <--    │
 │   5-  5 │ uint8      │ ei_data       │ 1 byte   | <--    │
 │   6-  6 │ uint8      │ ei_version    │ 1 byte   |        │
 │   7-  7 │ uint8      │ ei_osabi      │ 1 byte   |        │
 │   8-  8 │ uint8      │ ei_abiversion │ 1 byte   |        │
 │   9- 15 │ padding    │ ei_pad        │ 7 bytes  |        │
 │  16- 17 │ uint16     │ e_type        │ 2 bytes  |        │
 │  18- 19 │ uint16     │ e_machine     │ 2 bytes  |        │
 │  20- 23 │ uint32     │ e_version     │ 4 bytes  |        │
 │  24- 31 │ uint64     │ e_entry       │ 8 bytes  |        │
 │  32- 39 │ uint64     │ e_phoff       │ 8 bytes  |        │
 │  40- 47 │ uint64     │ e_shoff       │ 8 bytes  | <--    │
 │  48- 51 │ uint32     │ e_flags       │ 4 bytes  |        │
 │  52- 53 │ uint16     │ e_ehsize      │ 2 bytes  |        │
 │  54- 55 │ uint16     │ e_phentsize   │ 2 bytes  |        │
 │  56- 57 │ uint16     │ e_phnum       │ 2 bytes  |        │
 │  58- 59 │ uint16     │ e_shentsize   │ 2 bytes  | <--    │
 │  60- 61 │ uint16     │ e_shnum       │ 2 bytes  | <--    │
 │  62- 63 │ uint16     │ e_shstrndx    │ 2 bytes  | <--    │
 └──────────────────────────────────────────────────────────┘
</pre>

Read `ei_mag`. Those are the "magic numbers" `7F 45 4c 46` that you can use to verify that you are indeed looking at an ELF file.

Read `ei_data`. This byte is set to either 1 or 2 to signify 32- or 64-bit format, respectively.

Read `ei_class`. This byte is set to either 1 or 2 to signify little or big endianness, respectively. This affects interpretation of multi-byte fields starting with offset 0x10.

Read `e_shoff`. Section header offset relative to `origin`

Read `e_shnum`. Number of section headers in the elf file

Read `e_shentsize`. Size of each section header

Read `e_shstrndx`. Index of a string section. Will make sense in a bit.

```ts
{
  ei_mag: 1179403647,
  ei_class: 2,
  ei_data: 1,
  e_shoff: 3854448n,
  e_shnum: 27,
  e_shentsize: 64,
  e_shstrndx: 26
}
```

Go to `origin`+`e_shoff`

You are looking at an `ELF section header`. Specifically, you are looking at `e_shnum` section headers in a row

<pre class='ascii'>
 ┌──────────────────────────────────────────────────────────┐
 │ Elf64Shdr                                                │
 │ Size: 64 bytes, Alignment: 8 bytes                       │
 ├──────────────────────────────────────────────────────────┤
 │   0-  3 │ uint32     │ sh_name      │ 4 bytes | <--      │
 │   4-  7 │ uint32     │ sh_type      │ 4 bytes | <--      │
 │   8- 15 │ uint64     │ sh_flags     │ 8 bytes |          │
 │  16- 23 │ uint64     │ sh_addr      │ 8 bytes |          │
 │  24- 31 │ uint64     │ sh_offset    │ 8 bytes | <--      │
 │  32- 39 │ uint64     │ sh_size      │ 8 bytes | <--      │
 │  40- 43 │ uint32     │ sh_link      │ 4 bytes |          │
 │  44- 47 │ uint32     │ sh_info      │ 4 bytes |          │
 │  48- 55 │ uint64     │ sh_addralign │ 8 bytes |          │
 │  56- 63 │ uint64     │ sh_entsize   │ 8 bytes |          │
 └──────────────────────────────────────────────────────────┘
</pre>

Read `sh_type`. Identifies the type of this header. We are only interested in `SHT_SYMTAB` - `Symbol table` and `SHT_STRTAB` - `String table`

Read `sh_name`. An offset to a string in the `.shstrtab` (String table) section that represents the name of this section.

Read `sh_offset`. Offset of the section relative to `origin`

Read `sh_size`. Size of a section

Repeat for all sections.

Now you have an array of `sections`.

`StringSection` is `sections[e_shstrndx]`

## Reading names for sections (optional)

We will now read the name for each section

For each `section`

Go to `origin` + `StringSection.sh_offset` + `section.sh_name`

Read `NT string`. It is a name of the current section.

if you did everything correctly you should get something like this:

```ts
//...
{
  sh_name: 193,
  sh_type: 1,
  sh_offset: 3846144n,
  sh_size: 7904n,
  name: '.data'
},
{
  sh_name: 199,
  sh_type: 8,
  sh_offset: 3854048n,
  sh_size: 2228552n,
  name: '.bss'
},
{
  sh_name: 204,
  sh_type: 1,
  sh_offset: 3854048n,
  sh_size: 186n,
  name: '.comment'
},
{
  sh_name: 1,
  sh_type: 3,
  sh_offset: 3854234n,
  sh_size: 213n,
  name: '.shstrtab'
}
//...
```

## Reading symbols

::: tip Note
Symbol is just a location in memory with a name attached to it. It allows code to reference chunks of memory by name rather than by an address. Symbols reference functions and sometimes global variables.
:::

In your `sections` find one with `sh_type` == `SHT_SYMTAB` or `2`

Go to `origin` + `section.sh_offset`

You are looking at a `Symbol Sections`.

Based on a table below, each symbol is `24` bytes.

There are `section.sh_size` / `24` symbols

<pre class='ascii'>
 ┌──────────────────────────────────────────────────────────┐
 │ Elf64Sym                                                 │
 │ Size: 24 bytes, Alignment: 8 bytes                       │
 ├──────────────────────────────────────────────────────────┤
 │   0-  3 │ uint32     │ st_name  │ 4 bytes | <--          │
 │   4-  4 │ uint8      │ st_info  │ 1 byte  |              │
 │   5-  5 │ uint8      │ st_other │ 1 byte  |              │
 │   6-  7 │ uint16     │ st_shndx │ 2 bytes |              │
 │   8- 15 │ uint64     │ st_value │ 8 bytes | <--          │
 │  16- 23 │ uint64     │ st_size  │ 8 bytes |              │
 └──────────────────────────────────────────────────────────┘
</pre>

Read `st_value`. It is a pointer to the symbol

Read `st_name`. An offset to a string in the string section that represents the name of this symbol

Go to `origin` + `StringSection.sh_offset` + `st_name`

Read `NT string`. It is a name of the current symbol.

Repeat for each symbol.

And FINALLY find a symbol with a name `mono_get_root_domain` and get its `st_value`

```ts
//...
{ name: 'GC_set_log_fd', st_value: 2588751n },
{ name: 'GC_debug_strndup', st_value: 2553453n },
{ name: 'mono_unity_set_vprintf_func', st_value: 1463988n },
{ name: 'monoeg_g_slist_index', st_value: 2497838n },
{ name: 'mono_get_int32_class', st_value: 1503946n },
{ name: 'mono_parse_default_optimizations', st_value: 591364n },
{ name: 'mono_get_byte_class', st_value: 1503874n },
{ name: 'GC_debug_gcj_malloc', st_value: 2526746n },
{ name: 'mono_unity_array_object_header_size', st_value: 1470684n },
{ name: 'GC_have_errors', st_value: 5983720n },
{ name: 'mono_type_get_array_type', st_value: 1886572n },
{ name: 'GC_collection_in_progress', st_value: 2543375n },
{ name: 'mono_get_void_class', st_value: 1503886n },
{ name: 'mono_md5_update', st_value: 2374770n },
{ name: 'mono_native_thread_join', st_value: 2458844n },
{ name: 'GC_process_togglerefs', st_value: 2544475n },
{ name: 'mono_counter_get_name', st_value: 2387569n },
{ name: 'GC_set_toggleref_func', st_value: 2559594n },
{ name: 'monoeg_g_get_prgname', st_value: 2505525n },
{ name: 'mono_bitset_invert', st_value: 2408256n },
{ name: 'monoeg_g_utf8_to_utf16_custom_alloc', st_value: 2482201n },
{ name: 'mono_metadata_free_mh', st_value: 1873014n },
{ name: 'GC_is_black_listed', st_value: 2523112n },
//...
{ name: 'mono_get_root_domain', st_value: 1499837n }, // <-- we need this one
//...
```

## Conclusion

Go to `st_value`

You are now looking at a [mono_get_root_domain](https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/mono/metadata/domain.c#L964) function!

```c
mono_get_root_domain (void)
{
  return mono_root_domain;
}
```

This was the warmup (:

In the next part of the guide we will dive into the madness that is parsing mono structures!
