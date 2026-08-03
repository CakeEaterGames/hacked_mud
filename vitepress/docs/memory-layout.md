# Memory layout

It is annoying to write about pointers pointing to pointers pointing to pointers pointing to pointers...
So let's clarify a few things.

![Alt text](/docs/pointer-meme.png)

## Language

Let's say we have a struct

```c
struct _MonoClass {
  MonoClass *element_class;
  MonoClass *cast_class;
  MonoClass *parent;
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

Also, when i say:

> Go to `MonoClass *parent`

> Jump to `MonoClass *parent`

I mean 

> Read `MonoClass *parent`

**and also** position your reader at the location `M` that this pointer points to.

When I say

> You are at `MonoClass`

> You should be at `MonoClass`

> You are looking at `MonoClass`

I mean, your reader should be positioned at the location of the struct of type `MonoClass`

When I say

> `Important value` is `123`

I am declaring a variable IN YOUR BRAIN LMAO. It means I will reference it some time later

## How structs are positioned in memory

If you already know about field alignment, field sizes and pointer math you can skip the remaining part this page.

TODO This part may be redundant. I could just link a YouTube video on the subject