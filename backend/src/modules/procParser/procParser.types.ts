export type ModuleInfo = {
  start: bigint;
  end: bigint;
  size: bigint;
  path: string;
};

export type ProcNotFoundError = {
  type: "PROC_NOT_FOUND_ERROR";
  pid: number;
};
