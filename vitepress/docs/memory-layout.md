# Memory layout jargon

It is annoying to write about pointers pointing to pointers pointing to pointers pointing to pointers...
So let's clarify a few things.

![Alt text](/assets/pointer-meme.png)

## Jargon

Let's say we have a struct

```c
struct _MonoClass {
  MonoClass *element_class;
  MonoClass *cast_class;
  MonoClass *parent;
  SomeStruct val;
  //...
}
```

From now on instead of saying: Read a pointer, jump to pointer + offset, read a pointer... I will simply say:

> Read `MonoClass *parent`

And that implies that you need to

1. Position your reader at the start of the struct `_MonoClass`
2. Calculate the field offset `N` of `*parent` (16 in our case)
3. Position your reader at the start of `*parent` field (pos+16)
4. Read a pointer `M` (8 bytes, int64)

Also, when I say:

> Go to `MonoClass *parent`

I mean:

> Read `MonoClass *parent`

**AND ALSO** position your reader at the location `M` that this pointer points to.

When I say:

> You are at `MonoClass`

> You should be at `MonoClass`

> You are looking at `MonoClass`

I mean, your reader should be positioned at the location of the struct of type `MonoClass`

When I say:

> Go to the start of `SomeStruct val`

I mean that you need to position your reader at the location of the field `val` (24 in our case). Note that `val` is not a pointer but an inlined struct.

When I say:

> `Important value` is `123`

I am declaring a variable IN YOUR MIND LMAO. It means I will reference it some time later

## Null-terminated strings

Here's a [wikipedia article](https://en.wikipedia.org/wiki/Null-terminated_string)

When is say:

> NT string

I mean "null terminated string".

When I say:

> Read `NT string`

I mean:

1. Your reader should be already positioned at the start of the string
2. Read bytes until you reach a zero
3. When fully read, convert all bytes to UTF-8 to get readable text

## How structs are positioned in memory

I didn't know where to put this piece of info, so I'll put it here

<https://en.wikipedia.org/wiki/Data_structure_alignment>

The TL;DR is

- 2,4,8 bit values can only be positioned at indexes divisible by 2,4,8. If you want to put a pointer at index 1, you can't. It will be aligned at index 8 and have an alignment value of 8.
- Structs also have their own alignment. They take the maximum alignment value of it's children. If there's a single pointer inside a struct, it will have an alignment of 8 and. If it, for example, only have bytes and int32s, the alignment will be 4.

Read the wiki if you want to learn more, but for the purpose of the guide, this info is enough
