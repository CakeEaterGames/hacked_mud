import { MemoryReader } from "./MemoryReader";
import type { ModuleInfo } from "./ProcParser";

type SectionHeader = {
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
type ProgramHeader = {
  p_type: number;
  p_flags: string;
  p_offset: bigint;
  p_vaddr: bigint;
  p_paddr: bigint;
  p_filesz: bigint;
  p_memsz: bigint;
  p_align: bigint;
};

type SymbolHeader = {
  name: string;
  st_name: number;
  st_info: string;
  st_other: string;
  st_shndx: number;
  st_value: bigint;
  st_size: bigint;
};
const SectionTypeMap: Record<number, string> = {
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
const SYMBOL_SH_TYPE = 0x0b;
const STRINGS_SH_TYPE = 3;

export class ElfParser {
  is64Bit?: boolean;
  isLE?: boolean;
  EI_VERSION?: number;
  EI_OSABI?: number;
  EI_ABIVERSION?: number;
  e_type?: string;
  e_machine?: string;
  e_version?: number;
  e_entry?: bigint;
  e_phoff?: bigint;
  e_shoff?: bigint;
  e_flags?: string;
  e_ehsize?: string;
  e_phnum?: number;
  e_shentsize?: number;
  e_shnum?: number;
  e_shstrndx?: number;
  e_phentsize?: number;

  sectionHeaders: SectionHeader[] = [];
  programHeaders: ProgramHeader[] = [];

  reader: MemoryReader;
  origin: bigint;
  constructor(
    private pid: number,
    private module: ModuleInfo
  ) {
    this.reader = new MemoryReader(this.pid, this.module.start);
    this.origin = this.module.start;
  }
  async init() {
    await this.readELFHeader();
    await this.readAllProgramHeaders();
    await this.readAllSectionHeaders();
    await this.readSectionNames();
    await this.readStrings();
    await this.readSymbols();
  }

  async readELFHeader() {
    const elf = (await this.reader.readBytes(4)).toHex();
    /**
     * 0x7F followed by ELF(45 4c 46) in ASCII; these four bytes constitute the magic number.
     */
    if (elf != "7f454c46") {
      throw new Error("This is not an ELF file");
    }

    //0x04	1	e_ident[EI_CLASS]	This byte is set to either 1 or 2 to signify 32- or 64-bit format, respectively.
    this.is64Bit = (await this.reader.readBytes(1)).toHex() == "02";

    // 0x05	1	e_ident[EI_DATA]	This byte is set to either 1 or 2 to signify little or big endianness, respectively. This affects interpretation of multi-byte fields starting with offset 0x10.
    this.isLE = (await this.reader.readBytes(1)).toHex() == "01";

    // 0x06	1	e_ident[EI_VERSION]	Set to 1 for the original and current version of ELF.
    this.EI_VERSION = Number((await this.reader.readBytes(1)).toHex());

    // 0x07	1	e_ident[EI_OSABI]	Identifies the target operating system ABI.
    this.EI_OSABI = Number((await this.reader.readBytes(1)).toHex());

    // 0x08	1	e_ident[EI_ABIVERSION]	Further specifies the ABI version. Its interpretation depends on the target ABI. Linux kernel (after at least 2.6) has no definition of it,[6] so it is ignored for statically linked executables. In that case, offset and size of EI_PAD are 8.
    this.EI_ABIVERSION = Number((await this.reader.readBytes(1)).toHex());

    // 0x09	7	e_ident[EI_PAD]	Reserved padding bytes. Currently unused. Should be filled with zeros and ignored when read.
    await this.reader.readBytes(7);

    // 0x10	2	e_type	Identifies object file type.
    // 0x00	ET_NONE	Unknown.
    // 0x01	ET_REL	Relocatable file.
    // 0x02	ET_EXEC	Executable file.
    // 0x03	ET_DYN	Shared object.
    // 0x04	ET_CORE	Core file.
    // 0xFE00 ET_LOOS Reserved inclusive range. Operating system specific.
    // 0xFEFF ET_HIOS
    // 0xFF00 ET_LOPROC	Reserved inclusive range. Processor specific.
    // 0xFFFF ET_HIPROC
    this.e_type = (await this.reader.readBytes(2)).toHex();

    // 0x12	2	e_machine	Specifies target instruction set architecture. Some examples are:
    // 0x3E	AMD x86-64
    this.e_machine = (await this.reader.readBytes(2)).toHex();

    // 0x14	4	e_version	Set to 1 for the original version of ELF.
    this.e_version = await this.reader.readUInt32();

    // 0x18	4	8	e_entry	This is the memory address of the entry point from where the process starts executing.
    // This field is either 32 or 64 bits long, depending on the format defined earlier (byte 0x04).
    // If the file doesn't have an associated entry point, then this holds zero.
    if (this.is64Bit) {
      this.e_entry = await this.reader.readUInt64();
    } else {
      this.e_entry = BigInt(await this.reader.readUInt32());
    }

    // 0x1C	0x20	4	8	e_phoff	Points to the start of the program header table.
    // It usually follows the file header immediately following this one,
    // making the offset 0x34 or 0x40 for 32- and 64-bit ELF executables, respectively.
    if (this.is64Bit) {
      this.e_phoff = await this.reader.readUInt64();
    } else {
      this.e_phoff = BigInt(await this.reader.readUInt32());
    }

    // 0x20	0x28	4	8	e_shoff	Points to the start of the section header table.
    if (this.is64Bit) {
      this.e_shoff = await this.reader.readUInt64();
    } else {
      this.e_shoff = BigInt(await this.reader.readUInt32());
    }

    // 0x24	0x30	4	e_flags	Interpretation of this field depends on the target architecture.
    this.e_flags = (await this.reader.readBytes(4)).toHex();

    // 0x28	0x34	2	e_ehsize	Contains the size of this header, normally 64 Bytes for 64-bit and 52 Bytes for 32-bit format.
    this.e_ehsize = (await this.reader.readBytes(2)).toHex();

    // 0x2A	0x36	2	e_phentsize	Contains the size of a program header table entry. As explained below, this will typically be 0x20 (32-bit) or 0x38 (64-bit).
    this.e_phentsize = await this.reader.readUInt16();

    // 0x2C	0x38	2	e_phnum	Contains the number of entries in the program header table.
    this.e_phnum = await this.reader.readUInt16();

    // 0x2E	0x3A	2	e_shentsize	Contains the size of a section header table entry. As explained below, this will typically be 0x28 (32-bit) or 0x40 (64-bit).
    this.e_shentsize = await this.reader.readUInt16();

    // 0x30	0x3C	2	e_shnum	Contains the number of entries in the section header table.
    this.e_shnum = await this.reader.readUInt16();

    // 0x32	0x3E	2	e_shstrndx	Contains index of the section header table entry that contains the section names.
    this.e_shstrndx = await this.reader.readUInt16();

    // 0x34	0x40		End of ELF Header (size).
  }

  async readAllProgramHeaders() {
    this.reader.seek(this.origin + this.e_phoff!);
    for (let i = 0; i < this.e_phnum!; i++) {
      await this.readProgramHeader();
    }
  }

  async readAllSectionHeaders() {
    for (let i = 0; i < this.e_shnum!; i++) {
      this.reader.seek(this.origin + this.e_shoff! + BigInt(this.e_shentsize! * i));
      await this.readSectionHeader();
    }
  }

  async readSectionHeader() {
    const header: SectionHeader = {
      name: "",
      type: "",
      sh_name: 0,
      sh_type: 0,
      sh_flags: "",
      sh_addr: 0n,
      sh_offset: 0n,
      sh_size: 0n,
      sh_link: 0,
      sh_info: 0,
      sh_addralign: 0n,
      sh_entsize: 0n,
    };
    // 0x00	4	sh_name	An offset to a string in the .shstrtab section that represents the name of this section.
    header.sh_name = await this.reader.readUInt32();

    // 0x04	4	sh_type	Identifies the type of this header.
    // 0x0	SHT_NULL	Section header table entry unused
    // 0x1	SHT_PROGBITS	Program data
    // 0x2	SHT_SYMTAB	Symbol table
    // 0x3	SHT_STRTAB	String table
    // 0x4	SHT_RELA	Relocation entries with addends
    // 0x5	SHT_HASH	Symbol hash table
    // 0x6	SHT_DYNAMIC	Dynamic linking information
    // 0x7	SHT_NOTE	Notes
    // 0x8	SHT_NOBITS	Program space with no data (bss)
    // 0x9	SHT_REL	Relocation entries, no addends
    // 0x0A	SHT_SHLIB	Reserved
    // 0x0B	SHT_DYNSYM	Dynamic linker symbol table
    // 0x0E	SHT_INIT_ARRAY	Array of constructors
    // 0x0F	SHT_FINI_ARRAY	Array of destructors
    // 0x10	SHT_PREINIT_ARRAY	Array of pre-constructors
    // 0x11	SHT_GROUP	Section group
    // 0x12	SHT_SYMTAB_SHNDX	Extended section indices
    // 0x13	SHT_NUM	Number of defined types.
    // 0x60000000	SHT_LOOS	Start OS-specific.
    header.sh_type = await this.reader.readUInt32();
    header.type = SectionTypeMap[header.sh_type] || "UNKNOWN";

    if (this.is64Bit) {
      // 0x08	4	8	sh_flags	Identifies the attributes of the section.
      // 0x1	SHF_WRITE	Writable
      // 0x2	SHF_ALLOC	Occupies memory during execution
      // 0x4	SHF_EXECINSTR	Executable
      // 0x10	SHF_MERGE	Might be merged
      // 0x20	SHF_STRINGS	Contains null-terminated strings
      // 0x40	SHF_INFO_LINK	'sh_info' contains SHT index
      // 0x80	SHF_LINK_ORDER	Preserve order after combining
      // 0x100	SHF_OS_NONCONFORMING	Non-standard OS specific handling required
      // 0x200	SHF_GROUP	Section is member of a group
      // 0x400	SHF_TLS	Section hold thread-local data
      // 0x0FF00000	SHF_MASKOS	OS-specific
      // 0xF0000000	SHF_MASKPROC	Processor-specific
      // 0x4000000	SHF_ORDERED	Special ordering requirement (Solaris)
      // 0x8000000	SHF_EXCLUDE	Section is excluded unless referenced or allocated (Solaris)
      header.sh_flags = (await this.reader.readBytes(8)).toHex();

      // 0x0C	0x10	4	8	sh_addr	Virtual address of the section in memory, for sections that are loaded.
      header.sh_addr = await this.reader.readUInt64();

      // 0x10	0x18	4	8	sh_offset	Offset of the section in the file image.
      header.sh_offset = await this.reader.readUInt64();

      // 0x14	0x20	4	8	sh_size	Size in bytes of the section. May be 0.
      header.sh_size = await this.reader.readUInt64();
    } else {
      header.sh_flags = (await this.reader.readBytes(4)).toHex();
      header.sh_addr = BigInt(await this.reader.readUInt32());
      header.sh_offset = BigInt(await this.reader.readUInt32());
      header.sh_size = BigInt(await this.reader.readUInt32());
    }

    // 0x18	0x28	4	sh_link	Contains the section index of an associated section. This field is used for several purposes, depending on the type of section.
    header.sh_link = await this.reader.readUInt32();

    // 0x1C	0x2C	4	sh_info	Contains extra information about the section. This field is used for several purposes, depending on the type of section.
    header.sh_info = await this.reader.readUInt32();

    if (this.is64Bit) {
      // 0x20	0x30	4	8	sh_addralign	Contains the required alignment of the section. This field must be a power of two.
      header.sh_addralign = await this.reader.readUInt64();

      // 0x24	0x38	4	8	sh_entsize	Contains the size, in bytes, of each entry, for sections that contain fixed-size entries. Otherwise, this field contains zero.
      header.sh_entsize = await this.reader.readUInt64();
    } else {
      header.sh_addralign = BigInt(await this.reader.readUInt32());
      header.sh_entsize = BigInt(await this.reader.readUInt32());
    }

    // 0x28	0x40		End of Section Header (size).
    // console.log(header);

    this.sectionHeaders.push(header);
  }

  async readProgramHeader() {
    const header: ProgramHeader = {
      p_type: 0,
      p_flags: "",
      p_offset: 0n,
      p_vaddr: 0n,
      p_paddr: 0n,
      p_filesz: 0n,
      p_memsz: 0n,
      p_align: 0n,
    };
    // 0x00	4	p_type	Identifies the type of the segment.
    header.p_type = await this.reader.readUInt32();

    if (this.is64Bit) {
      // 0x04		4	p_flags	Segment-dependent flags (position for 64-bit structure).
      // 0x1	PF_X	Executable segment.
      // 0x2	PF_W	Writeable segment.
      // 0x4	PF_R	Readable segment.
      header.p_flags = (await this.reader.readBytes(4)).toHex();
    }

    if (this.is64Bit) {
      // 0x04	0x08	4	8	p_offset	Offset of the segment in the file image.
      header.p_offset = await this.reader.readUInt64();
      // 0x08	0x10	4	8	p_vaddr	Virtual address of the segment in memory.
      header.p_vaddr = await this.reader.readUInt64();
      // 0x0C	0x18	4	8	p_paddr	On systems where physical address is relevant, reserved for segment's physical address.
      header.p_paddr = await this.reader.readUInt64();
      // 0x10	0x20	4	8	p_filesz	Size in bytes of the segment in the file image. May be 0.
      header.p_filesz = await this.reader.readUInt64();
      // 0x14	0x28	4	8	p_memsz	Size in bytes of the segment in memory. May be 0.
      header.p_memsz = await this.reader.readUInt64();
      // 0x1C	0x30	4	8	p_align	0 and 1 specify no alignment. Otherwise should be a positive, integral power of 2, with p_vaddr equating p_offset modulus p_align.
      header.p_align = await this.reader.readUInt64();
    } else {
      header.p_offset = BigInt(await this.reader.readUInt32());
      header.p_vaddr = BigInt(await this.reader.readUInt32());
      header.p_paddr = BigInt(await this.reader.readUInt32());
      header.p_filesz = BigInt(await this.reader.readUInt32());
      header.p_memsz = BigInt(await this.reader.readUInt32());
      // 0x18		4		p_flags	Segment-dependent flags (position for 32-bit structure). See above p_flags field for flag definitions.
      header.p_flags = (await this.reader.readBytes(4)).toHex();
      header.p_align = BigInt(await this.reader.readUInt32());
    }

    //TODO parse bit flags
    // 0x20	0x38		End of Program Header (size).
    // console.log(header);
    this.programHeaders.push(header);
  }

  async readSectionNames() {
    const i = this.e_shstrndx!;
    const namesSectionHeader = this.sectionHeaders[i]!;
    for (const sh of this.sectionHeaders) {
      this.reader.seek(this.origin + namesSectionHeader.sh_offset + BigInt(sh.sh_name));
      const str = await this.reader.readString(300);
      // console.log(str);
      sh.name = str;
    }
  }

  strings: {
    pos: bigint;
    offset: bigint;
    value: string;
  }[] = [];
  async readStrings() {
    const section = this.sectionHeaders.find(a => a.sh_type == STRINGS_SH_TYPE);
    if (!section) {
      console.log("No strings section");
      return;
    }
    // console.log(section);
    this.reader.seek(this.origin + section.sh_offset);
    const maxPos = this.origin + section.sh_offset + section.sh_size;
    const secOrigin = this.reader.pos;
    while (this.reader.pos < maxPos) {
      const pos = this.reader.pos;
      const offset = pos - secOrigin;
      const str = await this.reader.readString();
      this.strings.push({
        pos: pos,
        value: str,
        offset: offset,
      });
    }
    // console.log(this.strings);
  }

  symbols: SymbolHeader[] = [];
  async readSymbols() {
    const section = this.sectionHeaders.find(a => a.sh_type == SYMBOL_SH_TYPE);
    if (!section) {
      console.log("No symbol section");
      return;
    }
    // console.log(section);
    this.reader.seek(this.origin + section.sh_offset);
    const maxPos = this.origin + section.sh_offset + section.sh_size;
    while (this.reader.pos < maxPos) {
      const sym = await this.readSymbol();
      this.symbols.push(sym);
    }
    // console.log(this.symbols);

    // await this.readSymbol()
    // await this.readSymbol()
    // await this.readSymbol()
  }

  async readSymbol() {
    // typedef struct {
    //    uint32_t      st_name;
    //    unsigned char st_info;
    //    unsigned char st_other;
    //    uint16_t      st_shndx;
    //    Elf64_Addr    st_value;
    //    uint64_t      st_size;
    // } Elf64_Sym;
    // so it's, 4 bytes, 1 byte, 1 byte, 2 bytes, 8 bytes, 8 bytes, and they're all unsigned
    const header: SymbolHeader = {
      name: "",
      st_name: 0,
      st_info: "",
      st_other: "",
      st_shndx: 0,
      st_value: 0n,
      st_size: 0n,
    };
    header.st_name = await this.reader.readUInt32();
    header.st_info = (await this.reader.readBytes(1)).toHex();
    header.st_other = (await this.reader.readBytes(1)).toHex();
    header.st_shndx = await this.reader.readUInt16();
    header.st_value = await this.reader.readUInt64();
    header.st_size = await this.reader.readUInt64();

    const str = this.strings.find(a => a.offset == BigInt(header.st_name));
    if (str) {
      header.name = str.value;
    }
    return header;
  }
}
