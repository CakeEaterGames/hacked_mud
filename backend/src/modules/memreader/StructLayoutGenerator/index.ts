import {
  FieldSizes,
  type ArrayField,
  type BasicField,
  type BasicFieldType,
  type Field,
  type StructDefinition,
  type StructField,
  type StructLayout,
  type StructLayoutField,
  type StructParsedType,
} from "./types";

export class StructLayoutGenerator<T extends StructDefinition> {
  public layout: StructLayout;
  private static cache = new Map<string, StructLayout>();

  constructor(public structDefinition: T) {
    this.layout = this.generate(structDefinition);
  }

  public generate<D extends StructDefinition>(structDefinition: D): StructLayout {
    const cache = StructLayoutGenerator.cache;
    if (cache.has(structDefinition.name)) {
      return cache.get(structDefinition.name)!;
    }

    const layout = this._generate(structDefinition);
    cache.set(structDefinition.name, layout);

    return layout;
  }

  private getLayout(f: StructField) {
    if (typeof f.definition == "string") {
      if (!StructLayoutGenerator.cache.has(f.definition)) {
        throw new Error("StructLayoutGenerator doesn't have a layout for " + f.definition);
      }
      return StructLayoutGenerator.cache.get(f.definition)!;
    } else {
      return this.generate(f.definition);
    }
  }

  private _generate<D extends StructDefinition>(structDefinition: D): StructLayout {
    let cur = 0;
    const fields: StructLayoutField[] = [];

    let maxOffset = 1;

    function pad(size: number) {
      if (cur % size > 0) {
        const pad = size - (cur % size);
        fields.push({
          name: "__padding",
          offset: cur,
          size: pad,
          fieldObj: { type: "padding", name: "__padding", size: pad },
        });
        cur += pad;
      }
    }

    function push(name: string, type: Field, size: number) {
      fields.push({
        name: name,
        offset: cur,
        size: size,
        fieldObj: type,
      });
      cur += size;
    }

    for (const f of structDefinition.fields) {
      if (f.type in FieldSizes) {
        const size = FieldSizes[f.type as BasicFieldType];
        pad(size);
        push(f.name, f, size);
        maxOffset = Math.max(maxOffset, size);
        continue;
      }

      if (f.type == "padding") {
        push(f.name, f, f.size);
        continue;
      }

      if (f.type == "struct") {
        const layout = this.getLayout(f);
        pad(layout.alignment);
        push(f.name, f, layout.size);
        maxOffset = Math.max(maxOffset, layout.alignment);
        continue;
      }

      if (f.type == "array") {
        const arrayField = f;
        let elementSize = 0;
        let elementAlignment = 1;

        if (arrayField.arrayType.type in FieldSizes) {
          const basicType = arrayField.arrayType;
          elementSize = FieldSizes[basicType.type as BasicFieldType];
          elementAlignment = elementSize;
        } else if (arrayField.arrayType.type == "struct") {
          const structType = arrayField.arrayType;
          const elementLayout = this.getLayout(structType);
          elementSize = elementLayout.size;
          elementAlignment = elementLayout.alignment;
        }

        pad(elementAlignment);

        const totalSize = elementSize * f.count;
        push(f.name, f, totalSize);
        maxOffset = Math.max(maxOffset, elementAlignment);

        continue;
      }
    }

    pad(maxOffset);

    const res: StructLayout = {
      name: structDefinition.name,
      fields: fields,
      alignment: maxOffset,
      size: cur,
    };

    return res;
  }

  public getField<K extends T["fields"][number]["name"]>(name: K) {
    const field = this.layout.fields.find(f => f.name === name)!; //safe to use ! because the argument is type safe itself
    return field;
  }

  /**
   * Parses a Buffer according to the struct layout
   * All numeric values are read as Little Endian
   */
  public parse(buffer: Buffer): StructParsedType<T> {
    if (buffer.length < this.layout.size) {
      throw new Error(
        `Buffer too small. Expected at least ${this.layout.size} bytes, got ${buffer.length} bytes`
      );
    }

    const result: Record<string, unknown> = {};

    for (const field of this.layout.fields) {
      // Skip padding fields
      if (field.name === "__padding") {
        continue;
      }

      const fieldObj = field.fieldObj;

      // Handle basic types
      if (fieldObj.type in FieldSizes) {
        result[field.name] = this.parseBasicField(buffer, field.offset, fieldObj as BasicField);
      }
      // Handle struct fields
      else if (fieldObj.type === "struct") {
        const structField = fieldObj;
        const structLayout = this.getLayout(structField);
        const structBuffer = buffer.subarray(field.offset, field.offset + field.size);
        const structParser = new StructLayoutGenerator(structField.definition as StructDefinition);
        result[field.name] = structParser.parse(structBuffer);
      }
      // Handle array fields
      else if (fieldObj.type === "array") {
        const arrayField = fieldObj;
        result[field.name] = this.parseArrayField(buffer, field.offset, arrayField);
      }
    }

    return result as StructParsedType<T>;
  }

  private parseBasicField(
    buffer: Buffer,
    offset: number,
    field: BasicField
  ): number | bigint | boolean | string {
    switch (field.type) {
      case "uint8":
      case "int8":
      case "char":
        return buffer.readInt8(offset);
      case "uint16":
        return buffer.readUInt16LE(offset);
      case "int16":
        return buffer.readInt16LE(offset);
      case "uint32":
        return buffer.readUInt32LE(offset);
      case "int32":
        return buffer.readInt32LE(offset);
      case "ptr":
      case "uint64":
        return buffer.readBigUInt64LE(offset);
      case "int64":
        return buffer.readBigInt64LE(offset);
      case "float":
        return buffer.readFloatLE(offset);
      case "double":
        return buffer.readDoubleLE(offset);
      case "bool":
        return buffer.readInt8(offset) != 0;
      default:
        throw new Error(`Unsupported basic field type: ${JSON.stringify(field)}`);
    }
  }

  private parseArrayField(buffer: Buffer, offset: number, field: ArrayField): unknown[] {
    const array: unknown[] = [];
    let elementSize = 0;
    let elementParser: ((buffer: Buffer, offset: number) => unknown) | null = null;

    // Determine element size and parser
    if (field.arrayType.type in FieldSizes) {
      const basicType = field.arrayType as BasicField;
      elementSize = FieldSizes[basicType.type];
      elementParser = (buf, off) => this.parseBasicField(buf, off, basicType);
    } else if (field.arrayType.type === "struct") {
      const structType = field.arrayType;
      const structLayout = this.getLayout(structType);
      elementSize = structLayout.size;
      elementParser = (buf, off) => {
        const structBuffer = buf.subarray(off, off + elementSize);
        const structParser = new StructLayoutGenerator(structType.definition as StructDefinition);
        return structParser.parse(structBuffer);
      };
    }

    if (!elementParser) {
      throw new Error(`Unsupported array element type: ${field.arrayType.type}`);
    }

    // Parse each element
    for (let i = 0; i < field.count; i++) {
      const elementOffset = offset + i * elementSize;
      array.push(elementParser(buffer, elementOffset));
    }

    return array;
  }

  public visualize(): string {
    const { name, fields, size, alignment } = this.layout;

    // Calculate the maximum width needed for the visualization
    const maxNameLength = Math.max(...fields.map(f => f.name.length), name.length);
    const width = Math.max(60, maxNameLength + 30); // Minimum width of 60 chars

    const topBorder = `┌${"─".repeat(width - 2)}┐`;
    const bottomBorder = `└${"─".repeat(width - 2)}┘`;
    const separator = `├${"─".repeat(width - 2)}┤`;

    const result = [];

    // Header
    result.push(topBorder);
    result.push(`│ ${name.padEnd(width - 4)} │`);
    result.push(`│ ${`Size: ${size} bytes, Alignment: ${alignment} bytes`.padEnd(width - 4)} │`);
    result.push(separator);

    // Fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]!;
      const isPadding = field.name === "__padding";

      // Calculate field range
      const startOffset = field.offset;
      const endOffset = field.offset + field.size - 1;
      const range = `${startOffset.toString().padStart(3)}-${endOffset.toString().padStart(3)}`;

      // Format field line
      const namePart = isPadding ? "[padding]" : field.name;
      const sizePart = `${field.size} byte${field.size !== 1 ? "s" : ""}`;
      const content = `${range} │ ${namePart.padEnd(maxNameLength)} │ ${sizePart}`;

      // Draw field with appropriate styling
      if (isPadding) {
        result.push(`│ ${content.padEnd(width - 4, "░")} │`);
      } else {
        result.push(`│ ${content.padEnd(width - 4)} │`);
      }

      // Add separator between fields (except after the last one)
      if (i < fields.length - 1) {
        // result.push(separator);
      }
    }

    // Footer
    result.push(bottomBorder);

    return result.join("\n");
  }
}
