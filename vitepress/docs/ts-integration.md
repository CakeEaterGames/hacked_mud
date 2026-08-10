# TS Integration

This section of the guide is for people who want to extend the code base of hacked mud.

::: tip Note
You should read all previous pages before reading this
:::

## OOG Class

When a new hackmud client opens hacked mud will try to find it and do a whole lot of memory reading. When all initialization logic is complete the hacked mud will create a new `OOG` object

You can find the `OOG` class in `/backend/src/modules/OOG/oog.service.ts` [GitHub link](https://github.com/CakeEaterGames/hacked_mud/blob/master/backend/src/modules/OOG/oog.service.ts)

You are interested in an `update` function. This is your infinite loop.

```ts
export class OOG {
  // ...
  private isUpdating = false;
  async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      switch (this.scenario) {
        case "idle":
          break;
        case "HelloWorld":
          await this.HelloWorld();
          break;
        case "hardline":
          await this.hardline();
          break;
      }
    } catch (e) {
      log.error({ e });
      this.stop();
    } finally {
      this.isUpdating = false;
    }
  }
  // ...
}
```

Here you can add your own scenarios that can also contain their own loops. Let's look at a `HelloWorld` scenario. It sends 3 `#Hello_World_` messages.

```ts
export class OOG {
  // ...
  async HelloWorld() {
    let num = 1;
    while (true) {
      if (!this.client.isRunning()) return;
      if (num > 3) break;
      await this.cmd("#Hello_World_" + num);
      num++;
      await sleep(1000);
    }
    this.setScenario("idle");
  }
  // ...
}
```

`cmd` is an async function that sends keystrokes to hackmud and returns a cmd response once the command has finished executing.

%% TODO Add another example with actual cmd output processing. %%

You can add your own scenarios in this switch case. 

::: tip Note
If I were you, I'd declare each scenario in a separate module folder. But it is up to you now
:::

## HackmudClient

In the `OOG` class you can talk to a `client` object that represents a hackmud client.

`client.gameState` - Information about game state. It can tell if the client is currently processing a command and can report a hardline state and timer.

`client.shellState.normalizedText` - Contains the contents of the hackmud shell. Can be used in combination with `uncolorShell` to remove the `<color>` tags

`client.gameStats` - An object with unknown fields. Add the data that you want. In this sample is added a name property that is set to the name of the first user of the client. It is useful because it is being sent with a websocket and can be displayed on the frontend.

`client.cmd()` is a function that returns a neverthrow `Result<T,E>`. If you don't want to deal with Result, you can unwrap it like this:

```ts
async function cmd(text: string): Promise<string> {
  return await this.client.cmd(text).match(
    a => a.response, // What to return if the result is OK
    e => {
      // What to return if the result is an Error
      throw new CustomError(e);
    }
  );
}
```

## Conclusion

That's pretty much it! That is all you need to know to start building your logic on top of hacked mud. Let me know if there's anything you found confusing. You can find me in a hackmud discord as `@cake_eater`