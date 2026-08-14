# Reading objects

Roadmap for this page:

1. Scan the entire memory to find Window objects
2. Use the field offsets and field types to read values
3. Learn how to read basic fields (int, bool, long...)
4. Learn how to read objects
5. Learn how to read strings
6. Learn how to read arrays

## Finding the Objects

On the [previous page](/docs/parsing-mono.html#monoclassruntimeinfo) we got a `domain_vtables` value for each class. Every single C# heap object has this value at offset `0`. Meaning, if we find a `domain_vtables` value somewhere in memory, there's a high chance that it is a start of the object that we're looking for. There will be false positives tho, so you need to verify that you got the right object by reading fields at an offset from `domain_vtables`.

You may have a different approach but I recommend to start by finding all `Window` objects. First of all, from the `MonoClasses` that you have collected, find the one with name `Window` and namespace `hackmud`. Get a `domain_vtables` value of that class and an array of [MonoClassFields](/docs/parsing-mono.html#monoclassfield).

Next, go all the way back to the modules that you got on page [Reading the maps](/docs/finding-mono-root-domain.html#reading-the-maps). Get starts and ends of each map, and read the memory of each one. Read 64 bits at a time, since `domain_vtables` is 64 bit. Collect all indexes that have the matching `domain_vtables` value at them.

You now have an array of pointers to potential `Window` objects. Once you'll learn how to read object fields you'll know how to verify if the pointer is correct

::: tip Note
This method is applicable to all object types, not just the Window object.
:::

::: warning HELP
There also should be a faster way to do this. Theoretically you could find a static field of some object of the program and branch off from it until you'll find the object that you need. That should be `O(1)` complexity, while the described method is `O(n)` complexity. The problem is that I don't know how to read static fields. If you know how to read static fields, please contribute to this project.  
:::

## Reading object fields

Each [MonoClassField](/docs/parsing-mono.html#monoclassfield) has an `offset` and a `TypeCode`

```ts
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
```

To read a field go to `object ptr`+`offset`.

Now based on the `TypeCode` read the field in an appropriate way.

## Basic Fields

`U1`, `U2`, `U4`, `U8` are unsigned ints with with sizes 1, 2, 4, 8 byte

`I1`, `I2`, `I4`, `I8` are the same but signed.

Simply read them in little endian and you have the value of the field.

`R4` and `R8` are `32bit float` and `64bit double` in a [IEEE 754](https://en.wikipedia.org/wiki/IEEE_754) format

`BOOLEAN` is a one byte value. If it is `0` it is `false` otherwise it is `true`

`CHAR` is a 2 byte `utf16le`

`VALUETYPE` is used for `enums` and `structs`. For enums just read 2 bytes. I don't know how it works with structs, because I haven't tried reading structs. Would appreciate help here.

## CLASS field

Class field is a `pointer` to an object.

Go to `pointer` and read a `domain_vtables` value. As I've said before all objects start with `domain_vtables` at offset 0. Using this value look though your `MonoClasses` and find a class that has a matching `domain_vtables`. This way you can know for object you're looking at.

And now it's gets recursive (:

Refer to [Reading objects](/docs/reading-objects.html#reading-objects) to read this object

## GENERICINST field

GENERICINST is read the same way as CLASS

## STRING field

`TypeCode` `STRING` is a `pointer` to a string object. It is NOT a `ZT String`.

Go to `pointer`. You are looking at a string object.

::: warning Help needed
I can't find the source for this in the Mono source code. Field names are my own interpretation of the data. If you know how this section can be improved, please edit this page.  
:::

<pre class='ascii'>
┌──────────────────────────────────────────────────────────────────────┐
│ MonoString                                                           │
│ Size: ??? bytes, Alignment: 8 bytes                                  │
├──────────────────────────────────────────────────────────────────────┤
│    0-   7 │ MonoVTable*     │ domain_vtables │ 8 bytes         │     │
│    8-  15 │ what is this?   │ some values    │ 8 bytes         │     │
│   16-  19 │ int32           │ strlength      │ 4 bytes         │ <-- │
│   20- ??? │ char[]          │ data           │ strlength bytes │ <-- │
└──────────────────────────────────────────────────────────────────────┘
</pre>

Read `strlength`.

Read `data`. The length of data is `strlength`\*`2`

Each char is a 2 byte `utf16le`. Convert `data` to a string.

## SZARRAY field

Arrays are quite complex. Sorry if not everything makes sense. I'll try my best.

`TypeCode` `SZARRAY` is a `pointer` to an array object.

Go to `pointer`. You are looking at an array object.

::: warning Help needed
I can't find the source for this in the Mono source code. Field names are my own interpretation of the data. If you know how this section can be improved, please edit this page.  
:::

<pre class='ascii'>
┌────────────────────────────────────────────────────────────────────────────┐
│ MonoArray                                                                  │
│ Size: ??? bytes, Alignment: 8 bytes                                        │
├────────────────────────────────────────────────────────────────────────────┤
│    0-   7 │ MonoVTable*   │ arrayDefinition │ 8 bytes              │ <--   │
│    8-  15 │ what is this? │ some values     │ 8 bytes              │       │
│   16-  23 │ what is this? │ some values     │ 8 bytes              │       │
│   24-  27 │ int32         │ elementCount    │ 4 bytes              │ <--   │
│   28- ??? │ unknown[]     │ data            │ elementCount         │       │
│                                              * sizes bytes         │ <--   │
└────────────────────────────────────────────────────────────────────────────┘
</pre>
<!--
https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/metadata.h#L325 is this relevant?

Is this relevant? I think it is!
https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/object-internals.h#L168

struct _MonoArray {
	MonoObject obj;
	/* bounds is NULL for szarrays */
	MonoArrayBounds *bounds;
	/* total number of elements of the array */
	mono_array_size_t max_length;
	/* we use mono_64bitaligned_t to ensure proper alignment on platforms that need it */
	mono_64bitaligned_t vector [MONO_ZERO_LEN_ARRAY];
};


It even has a _MonoString!
https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/object-internals.h#L180

struct _MonoString {
	MonoObject object;
	int32_t length;
	mono_unichar2 chars [MONO_ZERO_LEN_ARRAY];
};

Going deeper, there's a definition for MonoObject
https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/object.h#L35

and Deeper here's a MonoVTable
https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/class-internals.h#L363


HOLY!

	/* vtable contains function pointers to methods or their trampolines, at the
	 end there may be a slot containing the pointer to the static fields */
	gpointer    vtable [MONO_ZERO_LEN_ARRAY];

This is gold!

TODO Explain all of this

Here's what deepseek have to say. This means I am missing another length value between the data and elementCount. That would explain why I need to align the pointer in my code.


Here is the C layout with byte offsets for both 32‑bit and 64‑bit Mono ABIs.

```c
typedef struct {
    MonoVTable        *vtable;          // 0x00
    MonoThreadsSync   *synchronisation; // 0x04 (32-bit) / 0x08 (64-bit)
} MonoObject;

typedef struct {
    guint32  length;        // 0x00
    gint32   lower_bound;   // 0x04
} MonoArrayBounds;           // only used by non-SZARRAY arrays

typedef struct {
    MonoObject        obj;         // standard Mono object header
    MonoArrayBounds  *bounds;      // 0x08 / 0x10   (NULL for SZARRAY)
    guint32           max_length;  // 0x0C / 0x18
    guint32           length;      // 0x10 / 0x1C
    gpointer          vector[];    // 0x14 / 0x20   (first element data)
} MonoArray;
```

### Offset table

| Field | 32-bit offset | 64-bit offset | Size |
|---|---:|---:|---:|
| `vtable` | 0x00 | 0x00 | 4 / 8 |
| `synchronisation` | 0x04 | 0x08 | 4 / 8 |
| `bounds` | 0x08 | 0x10 | 4 / 8 |
| `max_length` | 0x0C | 0x18 | 4 |
| `length` | 0x10 | 0x1C | 4 |
| `vector` / element data | 0x14 | 0x20 | element_size × length |

- `0x14` = 20 decimal
- `0x20` = 32 decimal

For a SZARRAY, `bounds == NULL`. The element data starts immediately at `vector` (after natural alignment).
`vector` is not an array of pointers; it is raw storage for the actual element type. For example, an `int[]` stores 4‑byte integers starting at that offset, and a `long[]` stores 8‑byte integers starting at that offset on a 64‑bit Mono build.

The two length fields, `max_length` and `length`, are both used internally; for SZARRAY they are typically both set to the number of elements.


-->

if a Mono program has `bool[]` `string[]` `whatever[]` all of those are 3 new mono classes. `arrayDefinition` points to the MonoClass definition of datatype of this array.

Read `elementCount`. Number of elements in the array.

Go to `arrayDefinition`. You're looking at a [MonoClass](/docs/parsing-mono.html#monoclass).

Go to `element_class` of that `arrayDefinition` .You're looking at a [MonoClass](/docs/parsing-mono.html#monoclass) (again)

Read `sizes`. Size of a single array element.

Now go back to our original `SZARRAY`

Read `data`. Each element is `sizes` bytes and there are `elementCount` of them

Since you have the `element_class` with fields and offsets, you can parse it according to the definition.

## Conclusion

By the end of this page you should know:

- How to find objects in memory
- Read their fields
- Jump to other objects

You are now fully ready to FINALLY read the state of the game.
