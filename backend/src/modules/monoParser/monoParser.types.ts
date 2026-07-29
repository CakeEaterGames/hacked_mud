import type { TypeCode } from "../linkedObject/linkedObject.service";

export type MonoAssembly = {
  name: string;
  // addr: addr,
  classes: MonoClass[];
};

export type MonoClass = {
  addr: bigint;
  name: string | null;
  namespace: string | null;
  fields: MonoClassField[];
  // runtime_info_ptr: bigint,
  // vtable_ptr: bigint,
  domain_vtables: bigint;
  next_class_cache: bigint;

  parent_ptr: bigint;
  type: MonoFieldType;
  size: number;
  isValueType: boolean;
  isEnum: boolean;
};

export type MonoClassField = {
  name: string;
  // type_ptr: bigint,
  type: MonoFieldType;
  parent_ptr: bigint;
  offset: number;
};

export type MonoFieldType = {
  ptr: bigint;
  attributes: number;
  isStatic: boolean;
  isConstant: boolean;
  typeCode: TypeCode;
};
