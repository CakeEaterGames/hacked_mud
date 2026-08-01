import {
  defineStruct,
  StructLayoutGenerator,
} from "../structLayoutGenerator/structLayoutGenerator.service";

// ELF Header Constants
const ElfIdentD = defineStruct({
  name: "ElfIdent",
  fields: [
    // { name: "ei_mag0", type: "uint8" },     // 0x7F
    // { name: "ei_mag1", type: "uint8" },     // 'E'
    // { name: "ei_mag2", type: "uint8" },     // 'L'
    // { name: "ei_mag3", type: "uint8" },     // 'F'

    { name: "ei_mag", type: "uint32" }, //  Magic numbers '0x7F E L F'

    { name: "ei_class", type: "uint8" }, // 1=32-bit, 2=64-bit
    { name: "ei_data", type: "uint8" }, // 1=little-endian, 2=big-endian
    { name: "ei_version", type: "uint8" }, // EV_CURRENT (1)
    { name: "ei_osabi", type: "uint8" }, // OS/ABI identification
    { name: "ei_abiversion", type: "uint8" }, // ABI version
    { name: "ei_pad", type: "padding", size: 7 }, // Padding
  ],
});
export const ElfIdentL = new StructLayoutGenerator(ElfIdentD);

// 64-bit ELF Header
const Elf64HeaderD = defineStruct({
  name: "Elf64Ehdr",
  fields: [
    { name: "ElfIdent", type: "struct", definition: ElfIdentD },
    { name: "e_type", type: "uint16" }, // Object file type
    { name: "e_machine", type: "uint16" }, // Architecture
    { name: "e_version", type: "uint32" }, // Object file version
    { name: "e_entry", type: "uint64" }, // Entry point virtual address
    { name: "e_phoff", type: "uint64" }, // Program header table file offset
    { name: "e_shoff", type: "uint64" }, // Section header table file offset
    { name: "e_flags", type: "uint32" }, // Processor-specific flags
    { name: "e_ehsize", type: "uint16" }, // ELF header size in bytes
    { name: "e_phentsize", type: "uint16" }, // Program header table entry size
    { name: "e_phnum", type: "uint16" }, // Program header table entry count
    { name: "e_shentsize", type: "uint16" }, // Section header table entry size
    { name: "e_shnum", type: "uint16" }, // Section header table entry count
    { name: "e_shstrndx", type: "uint16" }, // Section header string table index
  ],
});
export const Elf64HeaderL = new StructLayoutGenerator(Elf64HeaderD);

// 32-bit ELF Header
const Elf32HeaderD = defineStruct({
  name: "Elf32Ehdr",
  fields: [
    { name: "ElfIdent", type: "struct", definition: ElfIdentD },
    { name: "e_type", type: "uint16" },
    { name: "e_machine", type: "uint16" },
    { name: "e_version", type: "uint32" },
    { name: "e_entry", type: "uint32" }, // 32-bit entry point
    { name: "e_phoff", type: "uint32" }, // 32-bit offset
    { name: "e_shoff", type: "uint32" }, // 32-bit offset
    { name: "e_flags", type: "uint32" },
    { name: "e_ehsize", type: "uint16" },
    { name: "e_phentsize", type: "uint16" },
    { name: "e_phnum", type: "uint16" },
    { name: "e_shentsize", type: "uint16" },
    { name: "e_shnum", type: "uint16" },
    { name: "e_shstrndx", type: "uint16" },
  ],
});
export const Elf32HeaderL = new StructLayoutGenerator(Elf32HeaderD);

// 64-bit Section Header
const Elf64SectionHeaderD = defineStruct({
  name: "Elf64Shdr",
  fields: [
    { name: "sh_name", type: "uint32" }, // Section name (string tbl index)
    { name: "sh_type", type: "uint32" }, // Section type
    { name: "sh_flags", type: "uint64" }, // Section flags
    { name: "sh_addr", type: "uint64" }, // Section virtual addr at execution
    { name: "sh_offset", type: "uint64" }, // Section file offset
    { name: "sh_size", type: "uint64" }, // Section size in bytes
    { name: "sh_link", type: "uint32" }, // Link to another section
    { name: "sh_info", type: "uint32" }, // Additional section information
    { name: "sh_addralign", type: "uint64" }, // Section alignment
    { name: "sh_entsize", type: "uint64" }, // Entry size if section holds table
  ],
});
export const Elf64SectionHeaderL = new StructLayoutGenerator(Elf64SectionHeaderD);

// 32-bit Section Header
const Elf32SectionHeaderD = defineStruct({
  name: "Elf32Shdr",
  fields: [
    { name: "sh_name", type: "uint32" },
    { name: "sh_type", type: "uint32" },
    { name: "sh_flags", type: "uint32" },
    { name: "sh_addr", type: "uint32" },
    { name: "sh_offset", type: "uint32" },
    { name: "sh_size", type: "uint32" },
    { name: "sh_link", type: "uint32" },
    { name: "sh_info", type: "uint32" },
    { name: "sh_addralign", type: "uint32" },
    { name: "sh_entsize", type: "uint32" },
  ],
});
export const Elf32SectionHeaderL = new StructLayoutGenerator(Elf32SectionHeaderD);

// 64-bit Program Header
const Elf64ProgramHeaderD = defineStruct({
  name: "Elf64Phdr",
  fields: [
    { name: "p_type", type: "uint32" }, // Segment type
    { name: "p_flags", type: "uint32" }, // Segment flags
    { name: "p_offset", type: "uint64" }, // Segment file offset
    { name: "p_vaddr", type: "uint64" }, // Segment virtual address
    { name: "p_paddr", type: "uint64" }, // Segment physical address
    { name: "p_filesz", type: "uint64" }, // Segment size in file
    { name: "p_memsz", type: "uint64" }, // Segment size in memory
    { name: "p_align", type: "uint64" }, // Segment alignment
  ],
});
export const Elf64ProgramHeaderL = new StructLayoutGenerator(Elf64ProgramHeaderD);

// 32-bit Program Header
const Elf32ProgramHeaderD = defineStruct({
  name: "Elf32Phdr",
  fields: [
    { name: "p_type", type: "uint32" },
    { name: "p_offset", type: "uint32" },
    { name: "p_vaddr", type: "uint32" },
    { name: "p_paddr", type: "uint32" },
    { name: "p_filesz", type: "uint32" },
    { name: "p_memsz", type: "uint32" },
    { name: "p_flags", type: "uint32" },
    { name: "p_align", type: "uint32" },
  ],
});
export const Elf32ProgramHeaderL = new StructLayoutGenerator(Elf32ProgramHeaderD);

// 64-bit Symbol Table Entry
const Elf64SymbolD = defineStruct({
  name: "Elf64Sym",
  fields: [
    { name: "st_name", type: "uint32" }, // Symbol name (string tbl index)
    { name: "st_info", type: "uint8" }, // Symbol type and binding
    { name: "st_other", type: "uint8" }, // Symbol visibility
    { name: "st_shndx", type: "uint16" }, // Section index
    { name: "st_value", type: "uint64" }, // Symbol value
    { name: "st_size", type: "uint64" }, // Symbol size
  ],
});
export const Elf64SymbolL = new StructLayoutGenerator(Elf64SymbolD);

// 32-bit Symbol Table Entry
const Elf32SymbolD = defineStruct({
  name: "Elf32Sym",
  fields: [
    { name: "st_name", type: "uint32" },
    { name: "st_value", type: "uint32" },
    { name: "st_size", type: "uint32" },
    { name: "st_info", type: "uint8" },
    { name: "st_other", type: "uint8" },
    { name: "st_shndx", type: "uint16" },
  ],
});
export const Elf32SymbolL = new StructLayoutGenerator(Elf32SymbolD);
