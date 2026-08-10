---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: hacked mud
  text: Custom hackmud client for full game automation
  tagline: And a guide for reading memory of mono applications
  image:
    src: /logo.png
    alt: hacked mud
  actions:
    - theme: brand
      text: Get Started
      link: /docs/installation
    - theme: brand
      text: Guide
      link: /docs/preamble

features:
  - icon: ⚙️
    title: Custom client
    details: Automate every aspect of the game by extending the TypeScript codebase or by sending HTTP requests
  - icon: 📖
    title: Guide
    details: Learn about reading process memory of mono applications (if you want to)
  - icon: 📦
    title: Hackmud in a box (coming soon)
    details: Launch hackmud in as many containers as you want

---


## Introduction

hacked mud is a legal custom client for an MMO game [hackmud](https://hackmud.com/)

It is a client for game automation. Everything that you can do in-game by hand, you can automate with typescript in hacked mud!

## 📸 Preview

![Demo](/assets/demo.gif)

## ✨ Features

- Mono memory reading. This client sits on top of official hackmud client and reads its process memory. This gives you full information about the game state
- It is a full-stack web app, meaning that you can host it and access it remotely
- You can launch multiple hackmud instances and control them all from one place
- Codebase is designed for you to expand. Clone this project and start editing the OOG class to automate the game.
- If you don't want to write TypeScript, No problem! There's an exposed REST API with beautiful Scalar documentation. Use any language you want and send API requests.
- WebSocket notifications. You can connect to a websocket server and hacked mud will notify you about all game state updates.

## 📖 Learning opportunity

This project is not just software. It is an effort to document the process of reading memory of mono applications. Every step is carefully explained in a [Vitepress documentation](/docs/preamble) so that you could make your own memory reading client if you wanted to. You can learn about:

- Parsing [proc maps](https://www.kernel.org/doc/html/latest/filesystems/proc.html) and [elf files](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format)
- Getting C# classes from raw bytes
- Finding objects of those classes in memory
- Sending virtual inputs to windowed applications

## 🚀 Getting started

**Prerequisites:**

- Linux OS
- Docker 29+

Basic setup steps:

```bash
git clone https://github.com/CakeEaterGames/hacked_mud.git
cd hacked_mud
make dev-d
make logs
```

Everything that you need to know is in the [documentation](/docs/installation)

Happy automating, mudders 👍 
