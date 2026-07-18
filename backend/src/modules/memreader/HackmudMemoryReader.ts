import { log } from "console";
import { ProcParser } from "./parsers/ProcParser";
import { ElfParser } from "./parsers/ElfParser";
import { MonoParser } from "./parsers/MonoParser";

import * as fs from "fs";

import type { MonoClass } from "./parsers/types";
import { LinkedObject, TypeCode, type ArrayField } from "./parsers/LinkedObject";
import { shellToTerminalColors } from "./utils/shellToTerminalColors";
import { bigIntReplacer } from "./utils/bigIntReplacer";

export class HackmudMemoryReader {
  monoParser: MonoParser | undefined;
  windowClass: MonoClass | undefined;

  queueObj: LinkedObject | undefined;
  kernel: LinkedObject | undefined;
  instructions: LinkedObject | undefined;
  timer: LinkedObject | undefined;
  shellLinkedObject: LinkedObject | undefined;
  chatLinkedObject: LinkedObject | undefined;
  shellParsing: LinkedObject | undefined;
  hardline: LinkedObject | undefined;

  gameStateFieldName: string | undefined;
  hardlaneStateFieldName: string | undefined;

  hardlineStates: string[] | undefined;
  gameStates: string[] | undefined;

  constructor(private pid: number) {}

  async initialize() {
    const procs = new ProcParser(this.pid);
    await procs.init();

    const monoModule = procs.modules.find(m => m.path.includes("libmonobdwgc"));
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
      log("Looking for window objects... this may take a while...");
      const windObjPtrs = await LinkedObject.findAllObjects(
        this.windowClass,
        procs.modules,
        this.pid
      );
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
        this.hardlaneStateFieldName = f.name;
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

    while (true) {
      await this.update();
    }
  }

  async update() {
    this.notNull("queueObj", this.queueObj);
    this.notNull("hardlaneStateFieldName", this.hardlaneStateFieldName);
    this.notNull("hardline", this.hardline);
    this.notNull("hardlineStates", this.hardlineStates);
    this.notNull("kernel", this.kernel);
    this.notNull("gameStates", this.gameStates);
    this.notNull("shellParsing", this.shellParsing);
    this.notNull("instructions", this.instructions);
    this.notNull("timer", this.timer);
    this.notNull("gameStateFieldName", this.gameStateFieldName);

    const arr = (await this.queueObj.getFieldValueByName("_array")) as ArrayField;
    const lines = arr.value?.filter(a => a.value != null);
    const text = lines?.map(a => a.value).join("\n");
    const terminal = shellToTerminalColors(text!);
    console.clear();
    log(terminal);

    const hardlineState = await this.hardline.getFieldValueByName(this.hardlaneStateFieldName);

    log("HL State: " + this.hardlineStates[hardlineState?.value as number]);

    const gameState = await this.kernel.getFieldValueByName(this.gameStateFieldName);
    log("Game State: " + this.gameStates[gameState?.value as number]);

    // log(this.hardlineStates)
    // log(this.gameStates)

    const instructionsText = await this.instructions.getFieldValueByName("m_Text");
    log(instructionsText?.value);

    const timerCurrent = await this.timer.getFieldValueByName("current");
    log(timerCurrent?.value);

    const is_p = await this.shellParsing.getFieldValueByName("is_processing");
    log(is_p?.value);
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
