export type SectionHeader = {
  name: string;
  type: string;
  sh_name: number;
  sh_type: number;
  sh_flags: string;
  sh_addr: bigint;
  sh_offset: bigint;
  sh_size: bigint;
  sh_link: number;
  sh_info: number;
  sh_addralign: bigint;
  sh_entsize: bigint;
};
export type ProgramHeader = {
  p_type: number;
  p_flags: string;
  p_offset: bigint;
  p_vaddr: bigint;
  p_paddr: bigint;
  p_filesz: bigint;
  p_memsz: bigint;
  p_align: bigint;
};

export type SymbolHeader = {
  name: string;
  st_name: number;
  st_info: string;
  st_other: string;
  st_shndx: number;
  st_value: bigint;
  st_size: bigint;
};

export const SectionTypeMap: Record<number, string> = {
  0x0: "SHT_NULL - Section header table entry unused",
  0x1: "SHT_PROGBITS - Program data",
  0x2: "SHT_SYMTAB - Symbol table",
  0x3: "SHT_STRTAB - String table",
  0x4: "SHT_RELA - Relocation entries with addends",
  0x5: "SHT_HASH - Symbol hash table",
  0x6: "SHT_DYNAMIC - Dynamic linking information",
  0x7: "SHT_NOTE - Notes",
  0x8: "SHT_NOBITS - Program space with no data (bss)",
  0x9: "SHT_REL - Relocation entries, no addends",
  0x0a: "SHT_SHLIB - Reserved",
  0x0b: "SHT_DYNSYM - Dynamic linker symbol table",
  0x0e: "SHT_INIT_ARRAY - Array of constructors",
  0x0f: "SHT_FINI_ARRAY - Array of destructors",
  0x10: "SHT_PREINIT_ARRAY - Array of pre-constructors",
  0x11: "SHT_GROUP - Section group",
  0x12: "SHT_SYMTAB_SHNDX - Extended section indices",
  0x13: "SHT_NUM - Number of defined types.",
  0x60000000: "SHT_LOOS - Start OS-specific.",
};
export const SYMBOL_SH_TYPE = 0x0b;
export const STRINGS_SH_TYPE = 3;
