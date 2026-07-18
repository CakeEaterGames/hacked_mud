export type Field = BasicField | StructField | UnknownField | ArrayField;

export type BasicField = {
  type: BasicFieldType;
  ctype?: string;
  name: string;
};

export type UnknownField = {
  type: "padding";
  name: string;
  size: number;
};

export type StructField = {
  type: "struct";
  ctype?: string;
  name: string;
  definition: StructDefinition | StructDefinitionRef;
};

export type ArrayField = {
  type: "array";
  ctype?: string;
  name: string;
  arrayType: BasicField | StructField;
  count: number;
};

export type BasicFieldType = keyof typeof FieldSizes;
export type NonBasicFieldType = "struct" | "array" | "padding";

export const FieldSizes = {
  ptr: 8,
  uint8: 1,
  uint16: 2,
  uint32: 4,
  uint64: 8,
  int8: 1,
  int16: 2,
  int32: 4,
  int64: 8,
  float: 4,
  double: 8,
  char: 1,
  bool: 1,
} as const;

export type StructDefinition = {
  name: string;
  // fields: Field[],
  fields: readonly Field[];
};
export type StructDefinitionRef = string;
export type StructLayout = {
  name: string;
  fields: StructLayoutField[];
  alignment: number;
  size: number;
};

export type StructLayoutField = {
  name: string;
  offset: number;
  size: number;
  fieldObj: Field;
};

// Type to extract the parsed type from a struct definition
export type StructParsedType<T extends StructDefinition> = {
  [K in T["fields"][number]["name"]]: ParseFieldType<ExtractFieldByName<T["fields"], K>>;
};

// Helper to extract a field by name from the fields array
type ExtractFieldByName<Fields extends readonly Field[], Name extends string> = Extract<
  Fields[number],
  { name: Name }
>;

// Parse a single field to its TypeScript type
type ParseFieldType<F extends Field> = F extends BasicField
  ? BasicFieldToTS<F["type"]>
  : F extends ArrayField
    ? ParseArrayField<F>
    : F extends StructField
      ? StructParsedType<F["definition"] extends StructDefinition ? F["definition"] : never>
      : never; // padding fields are skipped in parsing

// Map basic field types to TypeScript types
type BasicFieldToTS<T extends BasicFieldType> = T extends
  | "uint8"
  | "uint16"
  | "uint32"
  | "int8"
  | "int16"
  | "int32"
  ? number
  : T extends "uint64" | "int64" | "ptr"
    ? bigint
    : T extends "float" | "double"
      ? number
      : T extends "char"
        ? string
        : T extends "bool"
          ? boolean
          : never;

// Parse array fields
type ParseArrayField<F extends ArrayField> = F["arrayType"] extends BasicField
  ? BasicFieldToTS<F["arrayType"]["type"]>[]
  : F["arrayType"] extends StructField
    ? StructParsedType<
        F["arrayType"]["definition"] extends StructDefinition ? F["arrayType"]["definition"] : never
      >[]
    : never;
