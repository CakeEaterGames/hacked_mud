import { log } from "@backend/plugins/logger/logger";
import { Elf64HeaderL, Elf64SectionHeaderL, Elf64SymbolL, ElfIdentL } from "./ElfParser.models";
import type { MemoryReader } from "../memoryReader/memoryReader.service";
import type { ModuleInfo } from "../procParser/procParser.types";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { toResultAsync, type UnsupportedError } from "@backend/utils/neverthrow";
import type { MemoryReaderError } from "../memoryReader/memoryReader.models";
import {
  STRINGS_SH_TYPE,
  SYMBOL_SH_TYPE,
  type ElfParseResult,
  type SectionHeader,
  type SymbolHeader,
} from "./ElfParser.types";

export class ELFParser {
  sectionHeaders?: SectionHeader[];
  symbols?: SymbolHeader[];

  constructor(
    private mr: MemoryReader,
    private module: ModuleInfo
  ) {}

  parseElf(): ResultAsync<ElfParseResult, MemoryReaderError | UnsupportedError> {
    return this.mr.readBytes(this.module.start, ElfIdentL.layout.size).andThen(buffer => {
      const ident = ElfIdentL.parse(buffer);

      if (ident.ei_mag != 1179403647) {
        return errAsync({
          type: "UNSUPPORTED",
          message: "This is not an ELF file",
        } satisfies UnsupportedError);
      }

      if (ident.ei_data != 1) {
        return errAsync({
          type: "UNSUPPORTED",
          message: "ELF file is not in little endian",
        } satisfies UnsupportedError);
      }

      if (ident.ei_class != 2) {
        return errAsync({
          type: "UNSUPPORTED",
          message: " Not a 64bit OS",
        } satisfies UnsupportedError);
      }

      return this.parseELF64();
    });
  }

  parseELF64(): ResultAsync<ElfParseResult, MemoryReaderError> {
    let e_shstrndx: number;

    return this.mr
      .readBytes(this.module.start, Elf64HeaderL.layout.size)
      .andThen(buffer => {
        const header = Elf64HeaderL.parse(buffer);
        e_shstrndx = header.e_shstrndx;
        return toResultAsync(
          this._readSectionHeaders(header.e_shoff, header.e_shentsize, header.e_shnum)
        );
      })
      .andThen(sectionHeaders => {
        this.sectionHeaders = sectionHeaders;
        // Don't need this actually
        // return toResultAsync(this._readSectionNames(e_shstrndx));
        return okAsync()
      })
      .andThen(_ => toResultAsync(this._readSymbols()))
      .andThen(symbols => {
        this.symbols = symbols;

        return ok({
          symbols,
        });
      });
  }

  async _readSectionHeaders(
    e_shoff: bigint,
    e_shentsize: number,
    e_shnum: number
  ): Promise<Result<SectionHeader[], MemoryReaderError>> {
    const res: SectionHeader[] = [];
    for (let i = 0; i < e_shnum; i++) {
      const header = await this.readSectionHeader(e_shoff + BigInt(i * e_shentsize));
      if (header.isErr()) return err(header.error);
      res.push(header.value);
    }
    this.sectionHeaders = res;
    return ok(res);
  }

  readSectionHeader(addr: bigint): ResultAsync<SectionHeader, MemoryReaderError> {
    return this.mr
      .readBytes(this.module.start + addr, Elf64SectionHeaderL.layout.size)
      .andThen(buffer => {
        const h = Elf64SectionHeaderL.parse(buffer) satisfies SectionHeader;
        return ok(h as SectionHeader);
      });
  }

  async _readSectionNames(e_shstrndx: number): Promise<Result<SectionHeader[], MemoryReaderError>> {
    const i = e_shstrndx;
    const namesSectionHeader = this.sectionHeaders![i]!;
    for (const section of this.sectionHeaders!) {
      const str = await this.mr.readString(
        this.module.start + namesSectionHeader.sh_offset + BigInt(section.sh_name),
        300
      );
      if (str.isErr()) return err(str.error);
      section.name = str.value;
    }
    return ok(this.sectionHeaders!);
  }

  async _readSymbols(): Promise<Result<SymbolHeader[], MemoryReaderError>> {
    const section = this.sectionHeaders!.find(a => a.sh_type == SYMBOL_SH_TYPE);
    if (!section) {
      log.error("No symbol section");
      return ok([]);
    }

    const maxPos = this.module.start + section.sh_offset + section.sh_size;
    let pos = this.module.start + section.sh_offset;
    const res: SymbolHeader[] = [];
    while (pos < maxPos) {
      const sym = await this.readSymbol(pos);
      if (sym.isErr()) return err(sym.error);
      const s = sym.value;

      res.push(s);
      pos += BigInt(Elf64SymbolL.layout.size);
    }
    return ok(res);
  }

  async readSymbol(addr: bigint) {
    return this.mr
      .readBytes(addr, Elf64SymbolL.layout.size)
      .andThen(buffer => {
        const h = Elf64SymbolL.parse(buffer) satisfies SymbolHeader;
        return ok(h as SymbolHeader);
      })
      .andThen(symbol => {
        const stringsSec = this.sectionHeaders!.find(a => a.sh_type == STRINGS_SH_TYPE)!;

        return this.mr
          .readString(this.module.start + stringsSec.sh_offset + BigInt(symbol.st_name))
          .andThen(str => {
            symbol.name = str;
            return ok(symbol);
          });
      });
  }
}
