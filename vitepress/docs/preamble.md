# Preamble

Before we start let's clarify some things.

## Purpose of the guide

The goal of this guide is to document the process of reading memory of hackmud and other mono applications. It contains detailed instructions with terminal commands, struct definitions and bits of code. It tells you what you need to do, but it doesn't tell you how you should do it. For example, I can say:

To get process maps execute this command:

```bash
username@hostname:~$ cat /proc/7738/maps
00200000-00201000 r--p 00000000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
```

But I will not provide code for parsing the result.

```js
const range = res.split(" ")[0].split("-");
```

If the provided information is not enough for you, I invite you to look at the source code of `hacked mud`. It contains all of the concepts explained in this guide and a little more.

## AI-Generated Content

Any piece of text that is written by AI will be explicitly marked as such. Note the `AI` marker in the top left corner of the box

::: info AI
Hi my name is Deepseek and I wrote this piece of text
:::

I hate when articles are written with AI but you can't quite tell if they are. So I would like to be explicit here.

I also hate AI. But I also use AI... Most of the code was written by hand and I understand what each line does. I only used it for tedious work. Like converting C structs to TS types.

## Language

English is not my native language. There are may be typos and grammatical errors. Please open a pull request if you would like to correct something. If you scroll to the bottom of each page, there's an `Edit this page on GitHub` button that you can use.

## Expertise

I am not an expert in reverse engineering, nor I am an expert in C/C++. I am figuring this out as I go. I've done quite a lot of research and spoken with people who know more than I do and made this guide and software. Once again, feel free to correct me.

## Legality

Everything that is written in this guide complies with [hackmud's rules](https://www.hackmud.com/forums/general_discussion/rules). It is explicitly stated that reading the memory of hackmud is allowed, but memory writing is not allowed.

> Automation on top of the existing game client is currently permitted.

and

> Modifying the game client in any way is not permitted, this includes memory modification, code injection, client file modification, etc, and is considered a 'custom client.'

I will not post hackmud source code here but I will post variable names and class names that you should read. I don't know how strict the rules are so I'll assume they are very strict.

> Our client code is not open source. Please be mindful of copyright law.

## Software stack

hacked mud uses quite a set of tools! You are not required to know how any of them work to understand this guide. Everything made here can be made in any other programming language

- Backend: [ElysiaJS](https://elysiajs.com/) - My new favorite REST API framework that provides type safety and generates OpenAPI for your app
- Error Handling: [Neverthrow](https://github.com/supermacro/neverthrow) - A library that allows functions to return errors as values
- Frontend: [Quasar](https://quasar.dev/) - Vue based component library
- Logging: [Logtape](https://logtape.org/)
- Documentation: [Vitepress](https://vitepress.dev/) - You are looking at it right now
- Containerization: [Docker](https://www.docker.com/)

## Neverthrow

I am sorry for using [neverthrow](https://github.com/supermacro/neverthrow)...

Why? Because it makes the code harder to read.

Why did I use it? It turns your exceptions into types that you can handle. Which makes function calls very deterministic and safe. That way a lot of errors are discovered during compilation.

here's an example of regular TS code

```ts
function chain(v: number) {
  let a = prepare(v);
  let b = refine(a);
  let c = process(b);
  return c;
}

let res;
try {
  res = chain(v);
} catch (e) {
  console.error("Something somewhere went wrong. e is of type unknown");
  console.error(e);
  res = "BAD";
}
```

And here's the same code in neverthrow

```ts
function chain(v: number) {
  return prepare(v)
    .andThen(prepared => refine(prepared))
    .andThen(refined => process(refined));
}

const res = chain().map(
  good => good,
  e => {
    switch (e.type) {
      // We have access to all errors in a type safe way
      case "ERROR_A":
        return "BAD_A";
      case "ERROR_B":
        return "BAD_B";
      case "ERROR_C":
        return "BAD_C";
      case "ERROR_D":
        return "BAD_D";
    }
  }
);
```

Looks weird, right? But `e` is now statically typed, and that is a sacrifice that I am willing to make.

## TypeScript

Why would use TypeScript for something so low level as reading memory? Because I am not only reading memory, I am also providing a backend, frontend and API in this project. Basically there's an ecosystem around a memory reader. And it's so much more satisfying to write all of that in a scripting language than in a low level language.

## Glossary

- memreader - Short for memory reader
- OOG - Out Of Game. Usually refers to a program designed to interact with hackmud as a bot

---

That is all, now we are ready to begin!
