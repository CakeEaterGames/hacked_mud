import { ElfParser } from "../ElfParser/ElfParser.service";

import * as fs from "fs";

import { LinkedObject } from "../linkedObject/linkedObject.service";
import { shellToTerminalColors } from "../../utils/shellToTerminalColors";
import { bigIntReplacer } from "../../utils/bigIntReplacer";
import { log } from "@backend/plugins/logger/logger";
import { getProcMaps } from "../procParser/procParser.service";
import { mkdirRecursiveAsync } from "@backend/utils/fs";
import type { HackmudGameState, HackmudShellState } from "@shared/types/HackmudUpdateEvent.model";
import { MonoParser } from "../monoParser/monoParser.service";
import type { MonoClass } from "../monoParser/monoParser.types";
import type { cache, cacheStr } from "./hackmudMemoryReader.types";
import { TypeCode, type NumberField } from "../linkedObject/LinledObject.types";

export class HackmudMemoryReader {
  private monoParser: MonoParser | undefined;
  private windowClass: MonoClass | undefined;

  private queueObj: LinkedObject | undefined;
  private wrappedOutputObj: LinkedObject | undefined;
  private kernel: LinkedObject | undefined;
  private instructions: LinkedObject | undefined;
  private timer: LinkedObject | undefined;
  private shellLinkedObject: LinkedObject | undefined;
  private chatLinkedObject: LinkedObject | undefined;
  private shellParsing: LinkedObject | undefined;
  private hardline: LinkedObject | undefined;

  private gameStateFieldName: string | undefined;
  private hardlineStateFieldName: string | undefined;

  private hardlineStates: string[] | undefined;
  private gameStates: string[] | undefined;

  public shell: string | undefined;
  private cacheDir: string | undefined;

  constructor(public pid: number) {}

  async initialize() {
    this.cacheDir = "/app/backend/cache/" + this.pid;
    await mkdirRecursiveAsync(this.cacheDir);

    const procMaps = await getProcMaps(this.pid).match(
      a => a,
      e => {
        log.error(e);
        throw e;
      }
    );

    const monoModule = procMaps.find(m => m.path.includes("libmonobdwgc"));
    this.notNull("monoModule", monoModule);

    const p = new ElfParser(this.pid, monoModule);
    await p.init();

    const monoDomain = p.symbols.find(a => a.name == "mono_get_root_domain");
    this.notNull("monoDomain", monoDomain);

    this.monoParser = new MonoParser(this.pid, monoModule.start, monoDomain.st_value);
    await this.monoParser.init();

    const gameAssembly = await this.monoParser.parseAssemblyByName("Core");
    this.notNull("gameAssembly", gameAssembly);
    this.dumpToFile(gameAssembly, "gameAssembly.json");

    this.windowClass = gameAssembly.classes.find(
      a => a.name == "Window" && a.namespace == "hackmud"
    );
    this.notNull("windowClass", this.windowClass);

    // log(this.windowClass)

    const cache = this.loadCache();
    const isValidCache = await this.validateCache(cache);

    if (isValidCache) {
      this.shellLinkedObject = new LinkedObject(
        this.pid,
        this.monoParser,
        this.windowClass,
        cache.shellWindowPtr!
      );
      this.chatLinkedObject = new LinkedObject(
        this.pid,
        this.monoParser,
        this.windowClass,
        cache.chatWindowPtr!
      );
    } else {
      log.debug("Looking for window objects... this may take a while...");
      const windObjPtrs = await LinkedObject.findAllObjects(this.windowClass, procMaps, this.pid);
      for (const addr of windObjPtrs) {
        const windowLinkedObj = new LinkedObject(this.pid, this.monoParser, this.windowClass, addr);
        const labelName = await windowLinkedObj.getFieldValueByName("labelName");
        if (labelName?.value == "shell") {
          this.shellLinkedObject = windowLinkedObj;
          cache.shellWindowPtr = addr;
        }
        if (labelName?.value == "chat") {
          this.chatLinkedObject = windowLinkedObj;
          cache.chatWindowPtr = addr;
        }
      }
      this.saveCache(cache);
    }

    this.notNull("shellLinkedObject", this.shellLinkedObject);
    this.notNull("chatLinkedObject", this.chatLinkedObject);

    this.wrappedOutputObj = await this.shellLinkedObject.getFieldValueByNameToObj("wrapped_output");

    const outputObj = await this.shellLinkedObject.getFieldValueByNameToObj("output");

    //looking for the name of the obfuscated field
    const queueFieldName = outputObj.klass.fields.find(
      a => a.type.typeCode == TypeCode.GENERICINST
    )?.name;
    this.queueObj = await outputObj.getFieldValueByNameToObj(queueFieldName!);

    this.kernel = await this.shellLinkedObject.getFieldValueByNameToObj("kernel");
    this.hardline = await this.kernel.getFieldValueByNameToObj("hardline");

    const hardlineValueTypeFields = this.hardline.klass.fields.filter(
      a => a.type.typeCode == TypeCode.VALUETYPE
    );
    for (const f of hardlineValueTypeFields) {
      const e = await this.monoParser.getClassByAddr(f.type.ptr);
      const enums = e.fields.map(a => a.name);
      if (enums.includes("Mapping")) {
        this.hardlineStates = enums.slice(1);
        this.hardlineStateFieldName = f.name;
        break;
      }
    }

    this.instructions = await this.hardline.getFieldValueByNameToObj("instructions");

    const hackmodeCountdown = await this.kernel.getFieldValueByNameToObj("hackmodeCountdown");
    this.timer = await hackmodeCountdown.getFieldValueByNameToObj("timer");

    this.shellParsing = await this.kernel.getFieldValueByNameToObj("mainParser");

    const kernelValueTypeFields = this.kernel.klass.fields.filter(
      a => a.type.typeCode == TypeCode.VALUETYPE
    );
    for (const f of kernelValueTypeFields) {
      const e = await this.monoParser.getClassByAddr(f.type.ptr);
      const enums = e.fields.map(a => a.name);
      if (enums.includes("ToHardline")) {
        this.gameStates = enums.slice(1);
        this.gameStateFieldName = f.name;
        break;
      }
    }

    // return;
  }

  async update() {
    this.shell = (await this.readShell()).text?.join("\n");
    const terminal = shellToTerminalColors(this.shell);
    console.clear();
    log.debug(terminal);

    const states = await this.readGameState();
    log.debug(states);
  }

  // async readShellOld(): Promise<HackmudShellState> {
  //   this.notNull("queueObj", this.queueObj);
  //   this.notNull("wrappedOutputObj", this.wrappedOutputObj);
  //   // log.debug({ O: this.queueObj.klass.fields.map(a => a.name) })

  //   const head = (await this.queueObj.getFieldValueByName("_head")) as NumberField;
  //   const tail = (await this.queueObj.getFieldValueByName("_tail")) as NumberField;
  //   const size = (await this.queueObj.getFieldValueByName("_size")) as NumberField;
  //   const version = (await this.queueObj.getFieldValueByName("_version")) as NumberField;

  //   // const items2 = await this.wrappedOutputObj.getFieldValueByName("_items") as ArrayField
  //   const version2 = (await this.wrappedOutputObj.getFieldValueByName("_version")) as NumberField;

  //   // if (this.lastShellVersion != version2.value) {
  //   if (this.lastShellVersion != version.value) {
  //     this.lastShellVersion = version.value;
  //     const arrField = this.queueObj.klass.fields.find(a => a.name == "_array")!;
  //     const partArray = (
  //       await this.queueObj.readArrayField(
  //         this.queueObj.objectAddr + BigInt(arrField.offset),
  //         tail.value - 5,
  //         tail.value
  //       )
  //     )?.map(a => a.value);
  //     log.debug({ partArray });
  //     const arr = (await this.queueObj.getFieldValueByName("_array")) as ArrayField;
  //     this.lastShell = arr.value?.map(a => a.value as string | null);
  //     this.normalizedShell = this.normalizeQueue(
  //       head.value,
  //       tail.value,
  //       this.lastShell || []
  //     ).filter(a => a !== null);

  //     // this.lastShellVersion = version2.value
  //     // this.lastShell = items2.value?.map(a => a.value as string | null) || []
  //     // this.normalizedShell = this.lastShell.filter(a => a !== null)
  //     // log.debug(shellToTerminalColors(this.normalizedShell.join("\n")))
  //   }

  //   // const arrField = this.queueObj.klass.fields.find(a => a.name == "_array")!

  //   // const shortRead = await this.queueObj.readArrayField(this.queueObj.objectAddr + BigInt(arrField.offset), tail.value, head.value)
  //   // log.debug({ shortRead })

  //   // const text = lines?.map(a => a.value).join("\n");
  //   return {
  //     head: head.value,
  //     tail: tail.value,
  //     size: size.value,
  //     version: version.value,
  //     text: this.lastShell || [],
  //     normalizedText: this.normalizedShell || [],
  //     // normalizedText: this.normalizedShell || []
  //   };
  // }

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

  public shellData = {
    head: 0,
    tail: 0,
    size: 0,
    version: -1,
    data: new Array(2048).fill(null) as (string | null)[],
    normalizedData: [] as string[],
  };

  async readShell(): Promise<HackmudShellState> {
    this.notNull("queueObj", this.queueObj);
    this.notNull("wrappedOutputObj", this.wrappedOutputObj);
    // log.debug({ O: this.queueObj.klass.fields.map(a => a.name) })

    const _head = (await this.queueObj.getFieldValueByName("_head")) as NumberField;
    const _tail = (await this.queueObj.getFieldValueByName("_tail")) as NumberField;
    const _size = (await this.queueObj.getFieldValueByName("_size")) as NumberField;
    const _version = (await this.queueObj.getFieldValueByName("_version")) as NumberField;

    const head = _head.value;
    const tail = _tail.value;
    const size = _size.value;
    const version = _version.value;

    if (this.shellData.version != version) {
      this.shellData.version = version;
      const arrField = this.queueObj.klass.fields.find(a => a.name == "_array")!;

      const tasks = this.getReadQueueTask(
        { head: this.shellData.head, tail: this.shellData.tail },
        { head, tail }
      );

      for (const clr of tasks.clear) {
        this.shellData.data.fill(null, clr.st, clr.ed);
      }
      for (const read of tasks.read) {
        const partArray = (
          await this.queueObj.readArrayField(
            this.queueObj.objectAddr + BigInt(arrField.offset),
            read.st,
            read.ed
          )
        )?.map(a => a.value) as string[];

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

    return {
      head,
      tail,
      size,
      version,
      text: this.shellData.data,
      normalizedText: this.shellData.normalizedData,
    };
  }

  public normalizeQueue<T>(head: number, tail: number, data: T[]) {
    // If head is before tail, data is already contiguous
    if (head <= tail) {
      return data.slice(head, tail);
    }
    // Otherwise, combine the two segments
    return data.slice(head).concat(data.slice(0, tail));
  }

  async readGameState(): Promise<HackmudGameState> {
    this.notNull("hardlineStateFieldName", this.hardlineStateFieldName);
    this.notNull("hardline", this.hardline);
    this.notNull("hardlineStates", this.hardlineStates);
    this.notNull("kernel", this.kernel);
    this.notNull("gameStates", this.gameStates);
    this.notNull("shellParsing", this.shellParsing);
    this.notNull("instructions", this.instructions);
    this.notNull("timer", this.timer);
    this.notNull("gameStateFieldName", this.gameStateFieldName);

    const hardlineState = await this.hardline.getFieldValueByName(this.hardlineStateFieldName);
    const hardlineStateStr = this.hardlineStates[hardlineState?.value as number];
    // log.debug("HL State: " + this.hardlineStates[hardlineState?.value as number]);

    const gameState = await this.kernel.getFieldValueByName(this.gameStateFieldName);
    // log.debug("Game State: " + this.gameStates[gameState?.value as number]);

    // log(this.hardlineStates)
    // log(this.gameStates)

    const instructionsText = await this.instructions.getFieldValueByName("m_Text");
    // log.debug("" + instructionsText?.value);

    const timerCurrent = await this.timer.getFieldValueByName("current");
    // log.debug("" + timerCurrent?.value);

    const isProcessing = await this.shellParsing.getFieldValueByName("is_processing");
    // log.debug("" + isProcessing?.value);

    return {
      hardlineState: hardlineState?.value as number,
      hardlineStateStr: hardlineStateStr as string,
      gameState: gameState?.value as number,
      instructionsText: instructionsText?.value as string,
      timerCurrent: timerCurrent?.value as number,
      isProcessing: isProcessing?.value as boolean,
    };
  }

  async validateWindowPtr(addr: bigint, name: string) {
    this.notNull("monoParser", this.monoParser);
    this.notNull("windowClass", this.windowClass);

    const windowLinkedObj = new LinkedObject(this.pid, this.monoParser, this.windowClass, addr);
    const labelName = await windowLinkedObj.getFieldValueByName("labelName");
    return labelName?.value == name;
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

  saveCache(c: cache) {
    try {
      fs.writeFileSync(this.cacheDir + "/cache.json", JSON.stringify(c, bigIntReplacer, 2));
      console.log(this.cacheDir + "/cache.json", "File data written successfully");
    } catch (error) {
      console.error("Error writing file:", error);
    }
  }
  loadCache(): cache {
    try {
      if (!fs.existsSync(this.cacheDir + "/cache.json")) {
        return { chatWindowPtr: undefined, shellWindowPtr: undefined };
      }
      const data: cacheStr = JSON.parse(
        fs.readFileSync(this.cacheDir + "/cache.json").toString()
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

  async validateCache(cache: cache) {
    if (!cache.chatWindowPtr) return false;
    if (!cache.shellWindowPtr) return false;
    let v = await this.validateWindowPtr(cache.chatWindowPtr, "chat");
    if (!v) return false;
    v = await this.validateWindowPtr(cache.shellWindowPtr, "shell");
    if (!v) return false;
    return true;
  }

  notNull<T>(name: string, obj: T): asserts obj is NonNullable<T> {
    if (!obj) {
      throw new Error(`Value of ${name} is ${JSON.stringify(obj)}`);
    }
  }
}
