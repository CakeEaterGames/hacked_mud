export type ClientCmdResponse = {
  response: string;
  fullShell?: string;
};

export type CmdConfig = {
  toUncolorResponse?: boolean;
  toUncolorShell?: boolean;
  toIncludeShell?: boolean;
};
