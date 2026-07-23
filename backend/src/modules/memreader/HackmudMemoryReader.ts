import { ElfParser } from "./parsers/ElfParser";
import { MonoParser } from "./parsers/MonoParser";

import * as fs from "fs";

import type { MonoClass } from "./parsers/types";
import { LinkedObject, TypeCode, type ArrayField, type NumberField } from "./parsers/LinkedObject";
import { shellToTerminalColors } from "./utils/shellToTerminalColors";
import { bigIntReplacer } from "./utils/bigIntReplacer";
import { log } from "@backend/plugins/logger/logger";
import { getProcMaps } from "./parsers/ProcParser";

export type HackmudGameState = {
  hardlineState: number;
  hardlineStateStr: string;
  gameState: number;
  instructionsText: string;
  timerCurrent: number;
  isProcessing: boolean;
};

export type HackmudShellState = {
  head: number;
  tail: number;
  size: number;
  version: number;
  text: string[];
};

export class HackmudMemoryReader {
  private monoParser: MonoParser | undefined;
  private windowClass: MonoClass | undefined;

  private queueObj: LinkedObject | undefined;
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
  private lastShellVersion: number | undefined;
  private lastShell: string[] | undefined;

  public shell: string | undefined;

  constructor(private pid: number) {}

  async initialize() {
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

  async readShell(): Promise<HackmudShellState> {
    this.notNull("queueObj", this.queueObj);
    // log.debug({ O: this.queueObj.klass.fields.map(a => a.name) })

    const head = (await this.queueObj.getFieldValueByName("_head")) as NumberField;
    const tail = (await this.queueObj.getFieldValueByName("_tail")) as NumberField;
    const size = (await this.queueObj.getFieldValueByName("_size")) as NumberField;
    const version = (await this.queueObj.getFieldValueByName("_version")) as NumberField;

    if (this.lastShellVersion != version.value) {
      const arr = (await this.queueObj.getFieldValueByName("_array")) as ArrayField;
      this.lastShellVersion = version.value;
      this.lastShell = arr.value?.filter(a => a.value != null).map(a => a.value as string);
    }

    // const arrField = this.queueObj.klass.fields.find(a => a.name == "_array")!

    // const shortRead = await this.queueObj.readArrayField(this.queueObj.objectAddr + BigInt(arrField.offset), tail.value, head.value)
    // log.debug({ shortRead })

    // const text = lines?.map(a => a.value).join("\n");
    return {
      head: head.value,
      tail: tail.value,
      size: size.value,
      version: version.value,
      text: this.lastShell || [],
    };
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
      fs.mkdirSync("dumps", { recursive: true });
      fs.writeFileSync("dumps/" + filename, JSON.stringify(data, bigIntReplacer, 2));
      console.log(filename, "File data written successfully");
    } catch (error) {
      console.error(filename, "Error writing file:", error);
    }
  }

  saveCache(c: cache) {
    try {
      fs.writeFileSync("cache.json", JSON.stringify(c, bigIntReplacer, 2));
      console.log("cache.json", "File data written successfully");
    } catch (error) {
      console.error("Error writing file:", error);
    }
  }
  loadCache(): cache {
    try {
      const data: cacheStr = JSON.parse(fs.readFileSync("cache.json").toString()) as cacheStr;
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

type cache = {
  chatWindowPtr?: bigint;
  shellWindowPtr?: bigint;
};

type cacheStr = {
  chatWindowPtr?: string;
  shellWindowPtr?: string;
};
