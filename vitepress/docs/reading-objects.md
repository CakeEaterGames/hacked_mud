# Reading objects

Roadmap for this page:

1. Scan the entire memory to find Window objects
2. Use the field offsets and field types to read values
3. Learn how to read basic fields (int, bool, long...)
4. Learn how to read strings
5. Learn how to read arrays
6. Verify that the window objects are correct
7. Branch of from window object to other objects TODO what exactly
8. TODO

## Finding the Objects

On the [previous page](/docs/parsing-mono.html#monoclassruntimeinfo) we got a `domain_vtables` value for each class. Every single C# heap object has this value at offset `0`. Meaning, if we find a `domain_vtables` value somewhere in memory, there's a high chance that it is a start of the object that we're looking for. There will be false positives tho, so you need to verify that you got the right object by reading fields at an offset from `domain_vtables`.

You may have a different approach but I recommend to start by finding all `Window` objects. Your hackmud client has a couple of them:

- shell <- need this one
- chat
- sys.specs
- scratch

TODO list them all

First of all, from the `MonoClasses` that you have collected, find the one with name `Window` and namespace `hackmud`. Get a `domain_vtables` value of that class and an array of [MonoClassFields](/docs/parsing-mono.html#monoclassfield).

Next, go all the way back to the modules that you got on page [Reading the maps](/docs/finding-mono-root-domain.html#reading-the-maps). Get starts and ends of each map, and read the memory of each one. Read 64 bits at a time, since `domain_vtables` is 64 bit. Collect all indexes that have the matching `domain_vtables` value at them.

You now have an array of pointers to potential `Wondow` objects.

## Reading object fields

TODO This need to be explained generally. Come back to window object later

<!-- Each window object has a field `string labelName` positioned at a relative `offset`. To verify each object: -->

<!-- Go to `pointer`+`offset` and read a `ZT String` -->
