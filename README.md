# hacked mud

[![Bun](https://img.shields.io/badge/Bun-1.3.8-000000?logo=bun)](https://bun.sh)
[![Docker](https://img.shields.io/badge/Docker-29.7.2-2496ED?logo=docker)](https://www.docker.com)
[![Quasar](https://img.shields.io/badge/Quasar-2.16-1976D2?logo=quasar)](https://quasar.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Not AI slop! I like emojis! fight me!

## 🕵️ Introduction

hacked mud is a legal custom client for an MMO game [hackmud](https://hackmud.com/)

It is a tool for game automation. Everything that you can do in-game by hand, you can automate with TypeScript in hacked mud!

Everything that you need to know is in the [documentation](https://cakeeatergames.github.io/hacked_mud/)

## 📸 Preview

![Demo](/vitepress/assets/demo.gif)

## 🤔 Problem

For those who don't know, [hackmud](https://hackmud.com/) is an MMO where you write scripts in JS to automate almost every aspect of the game and also hack NPCs and other players (it is amazing, go get it!).
Some parts of the game are very easily to automated while others are next to impossible.

There are 3 ways to execute actions in the game

1. You run commands in the game terminal and get a response.

   ```hackmud
   >>accts.balance
   131B947M886K515GC
   ```

2. You make scripts that execute multiple commands for you

   ```hackmud
   >>cake.inv

    ╔════════════════════════════════════╗
    ║  cake.inv - specs                  ║
    ╠════════════════════════════════════╣
    ║                                    ║
    ║  hardline_count: 12                ║
    ║  slots: 116/256                    ║     <-- c001 ASCII window!  :)
    ║  loaded: 60/64                     ║
    ║  user: cake                        ║
    ║  balance: 131B947M886K515GC        ║
    ║                                    ║
    ╚════════════════════════════════════╝
   ```

3. You put your script on a cron bot.

Crons are very speed limited and fragile

- An average cron bot can execute a script every 10 minutes and it runs for 5s.
- if it runs more than 5s it will time out and unload itself.
- You only get one cron per user.
- You have to pay a fee every time a cron runs.
- Crons can't automate some parts of the game.

However you, as a player, can execute any number of commands and can perform task sequentially. You are only limited by server response time and script execution time.

That means that you either

- Deal with slow crons and work around the 5s runtime constraints
- Or sit and grind.
- Or...

## 💡 Solution

We can keep a hackmud window open and simulate keyboard key presses! We need to imitate a player.

The loop is:

![loop](/vitepress/assets/loop2.png)

> **Note:** This is not the only way to do this. You can also use the `flush` command to dump the contents of the terminal into the shell.txt file instead of reading memory. It works and can actually be enough for most players but it does have its limitations. If you don't want to implement memory reading consider [flushing the terminal](https://cakeeatergames.github.io/hacked_mud/docs/flush)

This way we can achieve quite a lot of things in the game. We can automate:

- corp scraping
- hardline entering
- NPC breaching
- loot filtering
- and anything else your heart desires

If you know a thing or two about hacking you may say

> But why do all of this when you can just decompile the game and find the networking logic and just talk to the game server directly?

Nah-uh-uh! Not allowed by the game developer! People did get banned for doing this.

## ✨ Features

- Mono memory reading. This client sits on top of official hackmud client and reads its process memory. This gives you full information about the game state
- It is a full-stack web app, meaning that you can host it and access it remotely
- You can launch multiple hackmud instances and control them all from one place
- Codebase is designed for you to expand. Clone this project and start editing the OOG class to automate the game.
- If you don't want to write TypeScript, No problem! There's an exposed REST API with beautiful Scalar documentation. Use any language you want and send API requests.
- WebSocket notifications. You can connect to a websocket server and hacked mud will notify you about all game state updates.

## 📖 Learning opportunity

This project is not just software. It is an effort to document the process of reading memory of mono applications. Every step is carefully explained in a [Vitepress documentation](https://cakeeatergames.github.io/hacked_mud/) so that you could make your own memory reading client if you wanted to. You can learn about:

- Parsing [proc maps](https://www.kernel.org/doc/html/latest/filesystems/proc.html) and [elf files](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format)
- Getting C# classes from raw bytes
- Finding objects of those classes in memory
- Sending virtual inputs to windowed applications

## 🚀 Getting started

**Prerequisites:**

- Linux OS
- [Docker 29+](https://docs.docker.com/engine/install/)
- [Bun 1.3.8+](https://bun.com/docs/installation)

Basic setup steps:

```bash
git clone https://github.com/CakeEaterGames/hacked_mud.git
cd hacked_mud
make prepare
make install
make x11
make prod
```

Everything that you need to know is in the [documentation](https://cakeeatergames.github.io/hacked_mud/)

Happy automating, mudders 👍

Licensed under MIT.
