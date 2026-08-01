import * as fs from "fs";
import { LinkedObject } from "../linkedObject/linkedObject.service";
import { shellToTerminalColors } from "../../utils/shellToTerminalColors";
import { bigIntReplacer } from "../../utils/bigIntReplacer";
import { log } from "@backend/plugins/logger/logger";
import { getProcMaps } from "../procParser/procParser.service";
import { mkdirRecursiveAsync } from "@backend/utils/fs";
import type { HackmudGameState, HackmudShellState } from "@shared/types/HackmudUpdateEvent.model";
import type { cache, cacheStr, InitedHackmudReader } from "./hackmudMemoryReader.types";
import { MonoParser } from "../monoParser/monoParser.service";
import { MemoryReader } from "../memoryReader/memoryReader.service";
import { err, ok, Result, ResultAsync } from "neverthrow";
import {
  toResultAsync,
  type ExecError,
  type NullPointerError,
  type UnsupportedError,
} from "@backend/utils/neverthrow";
import type { AssemblyNotFoundError, MonoClass } from "../monoParser/monoParser.types";
import { TypeCode, type FieldNotFoundError } from "../linkedObject/linkedObject.types";
import type { MemoryReaderError } from "../memoryReader/memoryReader.models";
import type { ProcNotFoundError } from "../procParser/procParser.types";
import { ELFParser } from "../ElfParser/ElfParser.service";

export class HackmudMemoryReader {
  public shell: string = "";
  private cacheDir: string;

  public shellData = {
    head: 0,
    tail: 0,
    size: 0,
    version: -1,
    data: new Array(2048).fill(null) as (string | null)[],
    normalizedData: [] as string[],
  };
  public isClosed: boolean = false;

  private constructor(
    public pid: number,
    public initedHackmudReader: InitedHackmudReader,
    private mr: MemoryReader
  ) {
    this.cacheDir = "/app/backend/cache/" + this.pid;
  }

  public static create(
    pid: number
  ): ResultAsync<
    HackmudMemoryReader,
    | NullPointerError
    | MemoryReaderError
    | ExecError
    | UnsupportedError
    | AssemblyNotFoundError
    | FieldNotFoundError
    | ProcNotFoundError
  > {
    return toResultAsync(this._create(pid));
  }

  private static async _create(
    pid: number
  ): Promise<
    Result<
      HackmudMemoryReader,
      | NullPointerError
      | MemoryReaderError
      | ExecError
      | UnsupportedError
      | AssemblyNotFoundError
      | FieldNotFoundError
      | ProcNotFoundError
    >
  > {
    const cacheDir = "/app/backend/cache/" + pid;
    const mrRes = await MemoryReader.create(pid);
    if (mrRes.isErr()) return err(mrRes.error);

    const mr = mrRes.value;

    let queueObj = undefined as LinkedObject | undefined;
    let kernel = undefined as LinkedObject | undefined;
    let instructions = undefined as LinkedObject | undefined;
    let timer = undefined as LinkedObject | undefined;
    let shellLinkedObject = undefined as LinkedObject | undefined;
    let chatLinkedObject = undefined as LinkedObject | undefined;
    let shellParsing = undefined as LinkedObject | undefined;
    let hardline = undefined as LinkedObject | undefined;
    let gameStateFieldName = undefined as string | undefined;
    let hardlineStateFieldName = undefined as string | undefined;
    let hardlineStates = undefined as string[] | undefined;
    let gameStates = undefined as string[] | undefined;

    await mkdirRecursiveAsync(cacheDir);

    const procMapsRes = await getProcMaps(pid);
    if (procMapsRes.isErr()) return err(procMapsRes.error);
    const procMaps = procMapsRes.value;

    const monoModule = procMaps.find(m => m.path.includes("libmonobdwgc"));
    if (!monoModule)
      return err({ type: "NULL_POINTER_ERROR", var: "monoModule" } satisfies NullPointerError);

    const p = new ELFParser(mr, monoModule);
    const elf = await p.parseElf();
    if (elf.isErr()) return err(elf.error);

    const monoDomain = elf.value.symbols.find(a => a.name == "mono_get_root_domain");
    if (!monoDomain)
      return err({ type: "NULL_POINTER_ERROR", var: "monoDomain" } satisfies NullPointerError);

    const monoParser = new MonoParser(pid, monoModule.start, monoDomain.st_value, mr);

    const gameAssemblyRes = await monoParser.parseAssemblyByName("Core");
    if (gameAssemblyRes.isErr()) return err(gameAssemblyRes.error);
    const gameAssembly = gameAssemblyRes.value;

    const windowClass = gameAssembly.classes.find(
      a => a.name == "Window" && a.namespace == "hackmud"
    );
    if (!windowClass)
      return err({ type: "NULL_POINTER_ERROR", var: "windowClass" } satisfies NullPointerError);

    // log(this.windowClass)

    const cache = this.loadCache(cacheDir);
    const isValidCache = await this.validateCache(monoParser, windowClass, cache, pid, mr);

    if (isValidCache) {
      shellLinkedObject = new LinkedObject(pid, monoParser, windowClass, cache.shellWindowPtr!, mr);
      chatLinkedObject = new LinkedObject(pid, monoParser, windowClass, cache.chatWindowPtr!, mr);
    } else {
      log.debug("Looking for window objects... this may take a while...");

      const t = await LinkedObject.findAllObjects(windowClass, procMaps, mr);
      if (t.isErr()) return err(t.error);
      const potentialWindowObjectPointers = t.value;

      for (const addr of potentialWindowObjectPointers) {
        const windowLinkedObj = new LinkedObject(pid, monoParser, windowClass, addr, mr);

        const labelNameRes = await windowLinkedObj.getFieldValueByName("labelName");
        if (labelNameRes.isErr()) {
          // this isn't actually an error. there's simply no object that we're looking for
          // return err(labelNameRes.error)
          continue;
        }
        const labelName = labelNameRes.value;

        if (labelName.value == "shell") {
          shellLinkedObject = windowLinkedObj;
          cache.shellWindowPtr = addr;
        }
        if (labelName.value == "chat") {
          chatLinkedObject = windowLinkedObj;
          cache.chatWindowPtr = addr;
        }
      }
      this.saveCache(cacheDir, cache);
    }

    if (!shellLinkedObject)
      return err({
        type: "NULL_POINTER_ERROR",
        var: "shellLinkedObject",
      } satisfies NullPointerError);
    if (!chatLinkedObject)
      return err({
        type: "NULL_POINTER_ERROR",
        var: "chatLinkedObject",
      } satisfies NullPointerError);

    const outputObjRes = await shellLinkedObject.getFieldValueByNameToObj("output");
    if (outputObjRes.isErr()) return err(outputObjRes.error);
    const outputObj = outputObjRes.value;

    //looking for the name of the obfuscated field
    const queueFieldName = outputObj.klass.fields.find(
      a => a.type.typeCode == TypeCode.GENERICINST
    )?.name;
    if (!queueFieldName)
      return err({ type: "NULL_POINTER_ERROR", var: "queueFieldName" } satisfies NullPointerError);

    const res = await outputObj
      .getFieldValueByNameToObj(queueFieldName)
      .andThen(_queueObj => {
        queueObj = _queueObj;
        return shellLinkedObject.getFieldValueByNameToObj("kernel");
      })
      .andThen(_kernel => {
        kernel = _kernel;
        return kernel.getFieldValueByNameToObj("hardline");
      })
      .andThen(_hardline => {
        hardline = _hardline;
        return hardline.getFieldValueByNameToObj("instructions");
      })
      .andThen(_instructions => {
        instructions = _instructions;
        return kernel!.getFieldValueByNameToObj("hackmodeCountdown");
      })
      .andThen(hackmodeCountdown => {
        return hackmodeCountdown.getFieldValueByNameToObj("timer");
      })
      .andThen(_timer => {
        timer = _timer;
        return kernel!.getFieldValueByNameToObj("mainParser");
      })
      .andThen(_shellParsing => {
        shellParsing = _shellParsing;
        return ok();
      });

    if (res.isErr()) return err(res.error);

    const hardlineValueTypeFields = hardline!.klass.fields.filter(
      a => a.type.typeCode == TypeCode.VALUETYPE
    );
    for (const f of hardlineValueTypeFields) {
      const res = await monoParser.getClassByAddr(f.type.ptr);
      if (res.isErr()) return err(res.error);
      const e = res.value;

      const enums = e.fields.map(a => a.name);
      if (enums.includes("Mapping")) {
        hardlineStates = enums.slice(1);
        hardlineStateFieldName = f.name;
        break;
      }
    }

    const kernelValueTypeFields = kernel!.klass.fields.filter(
      a => a.type.typeCode == TypeCode.VALUETYPE
    );
    for (const f of kernelValueTypeFields) {
      const res = await monoParser.getClassByAddr(f.type.ptr);
      if (res.isErr()) return err(res.error);
      const e = res.value;

      const enums = e.fields.map(a => a.name);
      if (enums.includes("ToHardline")) {
        gameStates = enums.slice(1);
        gameStateFieldName = f.name;
        break;
      }
    }

    if (!queueObj)
      return err({ type: "NULL_POINTER_ERROR", var: "queueObj" } satisfies NullPointerError);
    if (!kernel)
      return err({ type: "NULL_POINTER_ERROR", var: "kernel" } satisfies NullPointerError);
    if (!instructions)
      return err({ type: "NULL_POINTER_ERROR", var: "instructions" } satisfies NullPointerError);
    if (!timer) return err({ type: "NULL_POINTER_ERROR", var: "timer" } satisfies NullPointerError);
    if (!shellParsing)
      return err({ type: "NULL_POINTER_ERROR", var: "shellParsing" } satisfies NullPointerError);
    if (!hardline)
      return err({ type: "NULL_POINTER_ERROR", var: "hardline" } satisfies NullPointerError);
    if (!gameStateFieldName)
      return err({
        type: "NULL_POINTER_ERROR",
        var: "gameStateFieldName",
      } satisfies NullPointerError);
    if (!hardlineStateFieldName)
      return err({
        type: "NULL_POINTER_ERROR",
        var: "hardlineStateFieldName",
      } satisfies NullPointerError);
    if (!hardlineStates)
      return err({ type: "NULL_POINTER_ERROR", var: "hardlineStates" } satisfies NullPointerError);
    if (!gameStates)
      return err({ type: "NULL_POINTER_ERROR", var: "gameStates" } satisfies NullPointerError);

    const initialized = {
      monoParser,
      windowClass,
      queueObj,
      kernel,
      instructions,
      timer,
      shellLinkedObject,
      chatLinkedObject,
      shellParsing,
      hardline,
      gameStateFieldName,
      hardlineStateFieldName,
      hardlineStates,
      gameStates,
    } satisfies InitedHackmudReader;

    return ok(new HackmudMemoryReader(pid, initialized, mr));
  }

  async update() {
    return this.readShell().andThen(shellState => {
      this.shell = shellState.text.join("\n");
      const terminal = shellToTerminalColors(this.shell);
      log.info(terminal);
      return this.readGameState().map(gameState => ({ gameState, shellState }));
    });
  }

  private getReadQueueTask(
    prev: { head: number; tail: number },
    cur: { head: number; tail: number }
  ) {
    // This function takes queue heads and tails
    // and tells what regions of the queue cache need to be updated
    // [st; ed)

    const size = 2048;

    if (cur.head < cur.tail && cur.tail - cur.head < 10) {
      // if the queue is small
      return {
        clear: [{ st: 0, ed: size }],
        read: [{ st: cur.head, ed: cur.tail }],
      };
    }

    const read = [];
    if (cur.tail != prev.tail) {
      if (cur.tail > prev.tail) {
        // No wrap has happened
        read.push({ st: prev.tail, ed: cur.tail });
      } else {
        // wrapped to start
        read.push({ st: prev.tail, ed: size });
        read.push({ st: 0, ed: cur.tail });
      }
    }

    const clear = [];
    if (cur.head != prev.head) {
      if (cur.head > prev.head) {
        // No wrap has happened
        clear.push({ st: prev.head, ed: cur.head });
      } else {
        // wrapped to start
        clear.push({ st: prev.head, ed: size });
        clear.push({ st: 0, ed: cur.head });
      }
    }

    return {
      clear: clear,
      read: read,
    };
  }

  public readShell(): ResultAsync<
    HackmudShellState,
    MemoryReaderError | UnsupportedError | FieldNotFoundError
  > {
    return toResultAsync(this._readShell());
  }

  private async _readShell(): Promise<
    Result<HackmudShellState, MemoryReaderError | UnsupportedError | FieldNotFoundError>
  > {
    // log.debug({ O: this.queueObj.klass.fields.map(a => a.name) })

    const _head = await this.initedHackmudReader.queueObj.getFieldValueByName("_head");
    if (_head.isErr()) return err(_head.error);

    const _tail = await this.initedHackmudReader.queueObj.getFieldValueByName("_tail");
    if (_tail.isErr()) return err(_tail.error);

    const _size = await this.initedHackmudReader.queueObj.getFieldValueByName("_size");
    if (_size.isErr()) return err(_size.error);

    const _version = await this.initedHackmudReader.queueObj.getFieldValueByName("_version");
    if (_version.isErr()) return err(_version.error);

    const head = _head.value.value as number;
    const tail = _tail.value.value as number;
    const size = _size.value.value as number;
    const version = _version.value.value as number;

    if (this.shellData.version != version) {
      this.shellData.version = version;
      const arrField = this.initedHackmudReader.queueObj.klass.fields.find(
        a => a.name == "_array"
      )!;

      const tasks = this.getReadQueueTask(
        { head: this.shellData.head, tail: this.shellData.tail },
        { head, tail }
      );

      for (const clr of tasks.clear) {
        this.shellData.data.fill(null, clr.st, clr.ed);
      }
      for (const read of tasks.read) {
        const partArrayRes = await this.initedHackmudReader.queueObj.readArrayField(
          this.initedHackmudReader.queueObj.objectAddr + BigInt(arrField.offset),
          read.st,
          read.ed
        );
        if (partArrayRes.isErr()) return err(partArrayRes.error);

        const partArray = partArrayRes.value?.map(a => a.value as string) || [];

        for (let i = 0; i < partArray.length; i++) {
          this.shellData.data[read.st + i] = partArray[i] ?? null;
        }
      }

      this.shellData.normalizedData = this.normalizeQueue(head, tail, this.shellData.data).filter(
        a => a !== null
      );

      this.shellData.head = head;
      this.shellData.tail = tail;
      this.shellData.size = size;
      this.shellData.version = version;
    }

    return ok({
      head,
      tail,
      size,
      version,
      text: this.shellData.data,
      normalizedText: this.shellData.normalizedData,
    } satisfies HackmudShellState);
  }

  public normalizeQueue<T>(head: number, tail: number, data: T[]) {
    // If head is before tail, data is already contiguous
    if (head <= tail) {
      return data.slice(head, tail);
    }
    // Otherwise, combine the two segments
    return data.slice(head).concat(data.slice(0, tail));
  }

  public readGameState(): ResultAsync<
    HackmudGameState,
    MemoryReaderError | FieldNotFoundError | UnsupportedError
  > {
    return toResultAsync(this._readGameState());
  }

  private async _readGameState(): Promise<
    Result<HackmudGameState, MemoryReaderError | FieldNotFoundError | UnsupportedError>
  > {
    const hardlineState = await this.initedHackmudReader.hardline.getFieldValueByName(
      this.initedHackmudReader.hardlineStateFieldName
    );
    if (hardlineState.isErr()) return err(hardlineState.error);

    const hardlineStateStr =
      this.initedHackmudReader.hardlineStates[hardlineState.value.value as number];

    const gameState = await this.initedHackmudReader.kernel.getFieldValueByName(
      this.initedHackmudReader.gameStateFieldName
    );
    if (gameState.isErr()) return err(gameState.error);

    const instructionsText =
      await this.initedHackmudReader.instructions.getFieldValueByName("m_Text");
    if (instructionsText.isErr()) return err(instructionsText.error);

    const timerCurrent = await this.initedHackmudReader.timer.getFieldValueByName("current");
    if (timerCurrent.isErr()) return err(timerCurrent.error);

    const isProcessing =
      await this.initedHackmudReader.shellParsing.getFieldValueByName("is_processing");
    if (isProcessing.isErr()) return err(isProcessing.error);

    return ok({
      hardlineState: hardlineState.value.value as number,
      hardlineStateStr: hardlineStateStr!,
      gameState: gameState.value.value as number,
      instructionsText: instructionsText.value.value as string,
      timerCurrent: timerCurrent.value.value as number,
      isProcessing: isProcessing.value.value as boolean,
    } satisfies HackmudGameState);
  }

  static async validateWindowPtr(
    monoParser: MonoParser,
    windowClass: MonoClass,
    addr: bigint,
    name: string,
    pid: number,
    mr: MemoryReader
  ) {
    const windowLinkedObj = new LinkedObject(pid, monoParser, windowClass, addr, mr);
    return windowLinkedObj.getFieldValueByName("labelName").match(
      a => {
        return a.value == name;
      },
      _ => {
        // Not actually an error
        return false;
      }
    );
  }

  dumpToFile(data: unknown, filename: string) {
    try {
      const dir = this.cacheDir + "/dumps";
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dir + "/" + filename, JSON.stringify(data, bigIntReplacer, 2));
      console.log(filename, "File data written successfully");
    } catch (error) {
      console.error(filename, "Error writing file:", error);
    }
  }

  static saveCache(cacheDir: string, c: cache) {
    try {
      fs.writeFileSync(cacheDir + "/cache.json", JSON.stringify(c, bigIntReplacer, 2));
      console.log(cacheDir + "/cache.json", "File data written successfully");
    } catch (error) {
      console.error("Error writing file:", error);
    }
  }
  static loadCache(cacheDir: string): cache {
    try {
      if (!fs.existsSync(cacheDir + "/cache.json")) {
        return { chatWindowPtr: undefined, shellWindowPtr: undefined };
      }
      const data: cacheStr = JSON.parse(
        fs.readFileSync(cacheDir + "/cache.json").toString()
      ) as cacheStr;
      // log(data)
      const res: cache = {
        chatWindowPtr: undefined,
        shellWindowPtr: undefined,
      };
      if (data.chatWindowPtr) res.chatWindowPtr = BigInt(data.chatWindowPtr.replace(/n$/, ""));
      if (data.shellWindowPtr) res.shellWindowPtr = BigInt(data.shellWindowPtr.replace(/n$/, ""));
      return res;
    } catch (error) {
      console.error("Error writing file:", error);
      return { chatWindowPtr: undefined, shellWindowPtr: undefined };
    }
  }

  static async validateCache(
    monoParser: MonoParser,
    windowClass: MonoClass,
    cache: cache,
    pid: number,
    mr: MemoryReader
  ) {
    if (!cache.chatWindowPtr) return false;
    if (!cache.shellWindowPtr) return false;
    let v = await this.validateWindowPtr(
      monoParser,
      windowClass,
      cache.chatWindowPtr,
      "chat",
      pid,
      mr
    );
    if (!v) return false;
    v = await this.validateWindowPtr(
      monoParser,
      windowClass,
      cache.shellWindowPtr,
      "shell",
      pid,
      mr
    );
    if (!v) return false;
    return true;
  }

  public close() {
    this.isClosed = true;
    return this.mr.close().orElse(e => {
      //this should not really happen but still
      log.error({ e });
      return ok();
    });
  }
}
