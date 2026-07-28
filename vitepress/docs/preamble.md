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
const range = res.split(' ')[0].split('-') 
```

If the provided information is not enough for you, I invite you to look at the source code of `hacked mud`. It contains all of the concepts explained in this guide and a little more.

## AI-Generated Content

Any piece of text that is written by AI will be explicitly marked as such. Note the `AI` marker in the top left corner of the box

::: info AI
Hi my name is Deepseek and I wrote this piece of text
:::

I hate when articles are written with AI but you can't quite tell if they are. So I would like to be explicit here.

## Language

English is not my native language. There are may be typos and grammatical errors. Please open a pull request if you would like to correct something. You can do it on github with a couple of clicks

## Expertise

I am not an expert in reverse engineering, nor I am an expert in C/C++. I am figuring this out as I go. I've done quite a lot of research, consulted with LLMs, and spoken with people who know more than I do and made this guide and software. Once again, feel free to correct me.

## Legality

Everything that is written in this guide complies with hackmud's rules. TODO ADD LINK. It is explicitly stated that reading the memory of hackmud is allowed, but memory writing is not allowed.

## Software stack

hacked mud uses quite a set of tools! You are not required to know how any of them work to understand this guide. Everything made here can be made in any other programming language

- Backend: [ElysiaJS](https://elysiajs.com/) - My new favorite REST API framework that provides type safety and generates OpenAPI for your app
- Error Handling: [Neverthrow](https://github.com/supermacro/neverthrow) - A library that allows functions to return errors as values
- Frontend: [Quasar](https://quasar.dev/) - Vue based component library
- Logging: [Logtape](https://logtape.org/)
- Documentation: [Vitepress](https://vitepress.dev/) - You are looking at it right now
- Containerization: [Docker](https://www.docker.com/)

## Glossary

- memreader - Short for memory reader
- OOG - Out Of Game. Usually refers to a program designed to interact with hackmud as a bot

---

That is all, now we are ready to begin!
