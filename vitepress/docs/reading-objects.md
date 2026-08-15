# Reading objects

Roadmap for this page:

1. Understand how objects are stored
2. Scan the entire memory to find Window objects
3. Use the field offsets and field types to read values
4. Learn how to read basic fields (int, bool, long...)
5. Learn how to read objects
6. Learn how to read strings
7. Learn how to read arrays

## How objects are stored in memory

Look at a [MonoObject](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/object.h#L35) source code

```c
struct _MonoObject {
	MonoVTable *vtable;
	MonoThreadsSync *synchronisation;
};
```

<pre class='ascii'>
┌──────────────────────────────────────────────────────────────────┐
│ _MonoObject                                                      │
│ Size: 16 bytes, Alignment: 8 bytes                               │
├──────────────────────────────────────────────────────────────────┤
│    0-   7 │ MonoVTable*      │ vtable          │ 8 bytes │ <--   │
│    8-  15 │ MonoThreadsSync* │ synchronisation │ 8 bytes │       │
└──────────────────────────────────────────────────────────────────┘
</pre>

The struct doesn't end after the second field. After that field there go all of the object fields at specified [offsets](/docs/parsing-mono.html#monoclassfield) that you you have found on the previous page.

Let's look at the [MonoVTable](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/class-internals.h#L363)

```c
/* the interface_offsets array is stored in memory before this struct */
struct MonoVTable {
  MonoClass  *klass;
  // ...
```

It has a MonoClass right at the start of it.

::: tip Note
I didn't notice it before writing this guide, but looks like it also has a place for static fields. Maybe I'll look into this later.

```c
/*vtable contains function pointers to methods or their trampolines, at the
end there may be a slot containing the pointer to the static fields*/
gpointer vtable [MONO_ZERO_LEN_ARRAY];
```

:::

## How to find objects

On the [previous page](/docs/parsing-mono.html#monoclassruntimeinfo) we also got a `domain_vtables` value for each class. Those values match the `vtable` value at the start of each `MonoObject`. Meaning, if we find a `domain_vtables` value somewhere in memory, there's a high chance that it is a start of the object that we're looking for. There will be false positives tho, so you need to verify that you got the right object by reading object fields

You may have a different approach but I recommend to start by finding all `Window` objects. First of all, from the `MonoClasses` that you have collected, find the one with name `Window` and namespace `hackmud`. Get a `domain_vtables` value of that class and an array of [MonoClassFields](/docs/parsing-mono.html#monoclassfield).

Next, go all the way back to the modules that you got on page [Reading the maps](/docs/finding-mono-root-domain.html#reading-the-maps). Get starts and ends of each map, and read the memory of each one. Read 64 bits at a time, since `domain_vtables` is 64 bit. Collect all indexes that have the matching `domain_vtables` value at them.

You now have an array of pointers to potential `Window` objects. Once you'll learn how to read object fields you'll know how to verify if the pointer is correct

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

`TypeCode` `STRING` is a `pointer` to a string object. It is NOT a `NT string`.

Go to `pointer`. You are looking at a [MonoString](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/object-internals.h#L180).

<pre class='ascii'>
┌────────────────────────────────────────────────────────┐
│ _MonoString                                            │
│ Size: ??? bytes, Alignment: 8 bytes                    │
├────────────────────────────────────────────────────────┤
│    0-  15 │ MonoObject    │ object │ 16 bytes  │       │
│   16-  19 │ int32_t       │ length │ 4 bytes   │ <--   │
│   20- ??? │ mono_unichar2 │ chars  │ ??? bytes │ <--   │
└────────────────────────────────────────────────────────┘
</pre>

Read `length`.

Read `data`. The length of data is `length`\*`2` because it is in utf-16

Convert `data` to a utf-16 string.

## SZARRAY field

Arrays are quite complex. Sorry if not everything makes sense. I'll try my best.

`TypeCode` `SZARRAY` is a `pointer` to an array object.

Go to `pointer`. You are looking at a [MonoArray](https://github.com/Unity-Technologies/mono/blob/54681c7b4fdf8316b86063a8e8dcf2a0d99bdd03/mono/metadata/object-internals.h#L168).

<pre class='ascii'>
┌──────────────────────────────────────────────────────────────────┐
│ _MonoArray                                                       │
│ Size: ??? bytes, Alignment: 8 bytes                              │
├──────────────────────────────────────────────────────────────────┤
│    0-  15 │ MonoObject          │ obj        │ 16 bytes  │ <--   │
│   16-  23 │ MonoArrayBounds*    │ bounds     │ 8 bytes   │       │
│   24-  27 │ mono_array_size_t   │ max_length │ 4 bytes   │ <--   │
│   28- ??? │ mono_64bitaligned_t │ data       │ ??? bytes │ <--   │
└──────────────────────────────────────────────────────────────────┘
</pre>

if a Mono program has `bool[]` `string[]` `whatever[]` all of those are 3 new mono classes. `arrayDefinition` points to the MonoClass definition of datatype of this array.

Read `max_length`. Number of elements in the array.

Go to `obj->vtable->klass` and read `element_class*`. A pointer to [MonoClass](/docs/parsing-mono.html#monoclass).

::: tip Note
`obj` is an inlined `MonoObject` struct that has a field `vtable` that is a `MonoVTable`

`klass` is a `MonoClass` and `element_class` is also a `MonoClass`

:::

That `MonoClass* element_class` is a data type of the array

Read `element_class.sizes`. Size of a single array element.

Now go back to our original `SZARRAY`

Read `data`. Each element is `sizes` bytes and there are `max_length` of them

Since you have the `element_class` with fields and offsets, you can parse each element according to the definition.

## Conclusion

By the end of this page you should know:

- How to find objects in memory
- Read their fields
- Jump to other objects

You are now fully ready to FINALLY read the state of the game.
