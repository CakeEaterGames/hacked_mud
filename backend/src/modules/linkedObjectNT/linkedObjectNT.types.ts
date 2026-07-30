import type { MonoClass } from "../monoParserNT/monoParserNT.types";

export type GetFieldValueByNameResponse = ReadAnyObjectResponse & { name: string };

export type ReadFieldResponse = ReadAnyObjectResponse & {
  name: string;
};
export type ReadAnyObjectResponse =
  | NumberField
  | BigIntField
  | StringField
  | BooleanField
  | ValueTypeField
  | ClassField
  | GenericInstField
  | ArrayField
  | UnknownField;

export type NumberField = {
  type: "number";
  value: number;
};
export type BigIntField = {
  type: "bigint";
  value: bigint;
};
export type StringField = {
  type: "string";
  value: string | null;
};
export type ArrayField = {
  type: "array";
  value: ReadAnyObjectResponse[] | null;
};
export type BooleanField = {
  type: "boolean";
  value: boolean;
};
export type ValueTypeField = {
  type: "VALUETYPE";
  value: number;
};
export type ClassField = {
  type: "CLASS";
  value: ClassFieldValue;
};
export type GenericInstField = {
  type: "GENERICINST";
  value: ClassFieldValue;
};
export type UnknownField = {
  type: "unknown";
  value: unknown;
};

export type ClassFieldValue = {
  objectPtr: bigint;
  class_type: MonoClass | null;
};

//https://github.com/Unity-Technologies/mono/blob/7907d982772c47a9a1c7b676bead1eab1a276825/data/lldb/mono.py#L40
export enum TypeCode {
  END = 0x00,
  VOID = 0x01,
  BOOLEAN = 0x02,
  CHAR = 0x03,
  I1 = 0x04,
  U1 = 0x05,
  I2 = 0x06,
  U2 = 0x07,
  I4 = 0x08,
  U4 = 0x09,
  I8 = 0x0a,
  U8 = 0x0b,
  R4 = 0x0c,
  R8 = 0x0d,
  STRING = 0x0e,
  PTR = 0x0f,
  BYREF = 0x10,
  VALUETYPE = 0x11,
  CLASS = 0x12,
  VAR = 0x13,
  ARRAY = 0x14,
  GENERICINST = 0x15,
  TYPEDBYREF = 0x16,
  I = 0x18,
  U = 0x19,
  FNPTR = 0x1b,
  OBJECT = 0x1c,
  SZARRAY = 0x1d,
  MVAR = 0x1e,
  CMOD_REQD = 0x1f,
  CMOD_OPT = 0x20,
  INTERNAL = 0x21,
  MODIFIER = 0x40,
  SENTINEL = 0x41,
  PINNED = 0x45,
  ENUM = 0x55,
}

export type FieldNotFoundError = {
  type: "FIELD_NOT_FOUND_ERROR";
  name: string;
};
