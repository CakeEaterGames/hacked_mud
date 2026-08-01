import type { LinkedObject } from "../linkedObject/linkedObject.service";
import type { MonoParser } from "../monoParser/monoParser.service";
import type { MonoClass } from "../monoParser/monoParser.types";

export type cache = {
  chatWindowPtr?: bigint;
  shellWindowPtr?: bigint;
};

export type cacheStr = {
  chatWindowPtr?: string;
  shellWindowPtr?: string;
};

export type InitedHackmudReader = {
  monoParser: MonoParser;
  windowClass: MonoClass;
  queueObj: LinkedObject;
  kernel: LinkedObject;
  instructions: LinkedObject;
  timer: LinkedObject;
  shellLinkedObject: LinkedObject;
  chatLinkedObject: LinkedObject;
  shellParsing: LinkedObject;
  hardline: LinkedObject;
  gameStateFieldName: string;
  hardlineStateFieldName: string;
  hardlineStates: string[];
  gameStates: string[];
};
