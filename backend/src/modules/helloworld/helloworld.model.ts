import { t } from "elysia";

export const helloworldRequestT = t.Object({
  input: t.String({ default: "hi" }),
});
export type helloworldRequest = typeof helloworldRequestT.static;

export const helloworldResponseT = t.Object({
  output: t.String({ default: "hi!" }),
});
export type helloworldResponse = typeof helloworldResponseT.static;
