# Problem and solution

## Problem

For those who don't know, [hackmud](https://hackmud.com/) is an MMO where you write scripts in JS to automate almost every aspect of the game and also hack NPCs and other players (it is amazing, go get it!).
Some parts of the game are very easily to automated while others are next to impossible.

There are 3 ways to execute actions in the game

- 1. You run commands in the game terminal and get a response.

```hackmud
>>accts.balance
1M130KGC
```

- 2. You make scripts that execute multiple commands for you

```hackmud
>>your_name.your_script
TODO
```

- 3. You put your script on a cron bot.

Crons are very speed limited and fragile

- An average cron bot can execute a script every 10 minutes and it runs for 5s.
- if it runs more than 5s it will time out and unload itself.
- You only get one cron per user.
- You have to pay a fee every time a cron runs.
- Crons can't automate some parts of the game.

However you, as a player, can execute any number of commands and can perform task sequentially. You are only limited by server response time and script execution time.

That means you can't really automate all actions of the game. You either have to wait for your crons and work around the 5s runtime constraints or sit and grind.

## Solution

We can keep a hackmud open and simulate keyboard key presses! We need to imitate a player.

The loop is:
```mermaid
flowchart TD

read[Read the memory of the game to see what is in the terminal]
-->analyze[Decide what to do]
-->send[Send virtual key presses to enter commands]
-->wait[Wait for a command to go through]
-->read
```