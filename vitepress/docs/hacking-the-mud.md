# Hacking the mud

> Turn on Electroheist, get your hacking gloves and get ready to kernel.hardline! It's about to get real!

You are now FINALLY fully ready to read the state of the game. All the theory about mono is behind. If you have proper methods for reading objects and fields, this part will be a breeze. You do have proper methods... right?

Roadmap:

1. Decompile the game
2. Find all Window objects
3. TODO

## Decompile the game

You can use any tool but I'd advice you to use [dotPeek](https://www.jetbrains.com/ru-ru/decompiler/)

TODO Location of the correct DLL

TODO Screenshot of dotPeek

TODO Draw a schema of the game in escalidraw

## Reading the shell

As described on previous page, find all Window objects. Then read the property `labelName` of each one. You are interested in window with name `shell`. You can also grab `chat` one if you want to.

Get the field with the name `output`.

This object has a single obfuscated `GENERICINST` field. This field is our `Queue<String>` object. The text of the hackmud shell is stored in this object.

Get these values from queue object:

- `_head` - Index of the head of the queue
- `_tail` - Index of the tail of the queue
- `_size` - Size of the Queue
- `_version` - Version. Every time the queue changes this number gets incremented
- `_array` - String array where each line is a line in a hackmud shell

The newest line in the shell is stored in `array[tail]` and the oldest one in `array[head]`

Note that it is a [Queue](<https://en.wikipedia.org/wiki/Queue_(abstract_data_type)>) array. `head` and `tail` end constantly shift. It also wraps around the queue, so if the queue length is 2048 and tail is is at 1900 and head is at 100, you'll need to read from 1900 to 2048 and from 0 to 100.

Also note that reading the entire queue takes quite a bit of time so there are a couple of optimizations that you can make.

1. Only read the queue when the `version` changes.
2. Only read the area between head and tail
3. Keep track of read lines and only read new ones.

But for now you can just read the entire object and move on. Optimize later if you have to.

Now save the pointer to this queue object and read it every time you need to get the contents of the shell.

## Getting the state of the game

Another cool field that you can look at is `window.kernel`. It has a variety of useful things in it

`kernel.mainParser.is_processing` is a boolean value that tells if the hackmud client is currently processing a command. You can't enter anything during this period

`kernel.hardline.hackmodeCountdown.timer.current` is a hardline remaining time.

`kernel.hardline.instructions.m_Text` is a string containing some text related to hardline entering. TODO write what exactly

Find all enums of `hardline` object. You can do that by looking for `VALUETYPE` fields. All their names are obfuscated but the enum values are not. Look for 2 enums that contain fields `Mapping` and `ToHardline`. They contain the game state which can be used to know if you are currently in hardline or on the "dial ip" screen.

## Conclusion

And that is it! Now just put all of this in a while true loop and you have yourself a mem reader! 🎉🎉🎉

There are other things you can read as well. Get creative and dive deeper into the source code to find other useful things if you want to. But personally I think the shell contents and game state is all you need.

There's one last thing I want to say...
