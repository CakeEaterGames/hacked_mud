# Sending Virtual Inputs (Linux)

## Roadmap

In this section of the guide we will learn how to send virtual key strokes to a hackmud window.
Here's a rough roadmap of what we need to do:

1. Extract the DISPLAY environment variable
2. Find the X11 window ID using xdotool
3. Use xdotool to send key presses and text

## Requirements

Install these packages

```bash
sudo apt install xdotool  # Debian/Ubuntu

```

## Collecting the process info

First we need to collect some info about the hackmud processes

[Get the PID if you haven't already](http://10.40.0.126:4436/docs/finding-mono-root-domain.html#getting-pid)

- DISPLAY env variable - Display at which hackmud was launched at
- WindowID - Window ID of a hackmud client


Using the PIDs we can find the DISPLAY variable that was used when the program started

```bash
cat /proc/${PID}/environ | tr '\0' '\n' | grep DISPLAY
```

```bash
username@hostname:~$ cat /proc/7738/environ | tr '\0' '\n' | grep DISPLAY
DISPLAY=:0
username@hostname:~$ cat /proc/137363/environ | tr '\0' '\n' | grep DISPLAY
DISPLAY=:95
```

Display 0 is a default display (aka desktop). Display 95 is virtual and invisible.

With the display variable we can find the window ID

```bash
DISPLAY=:${N} xdotool search --classname hackmud_lin.x86_64
```

```bash
username@hostname:~$ DISPLAY=:0 xdotool search --classname hackmud_lin.x86_64
65011720
username@hostname:~$ DISPLAY=:95 xdotool search --classname hackmud_lin.x86_64
39845894
```

## Sending inputs

You now can use these 2 commands to send inputs to the game.

Use this to send text:
```bash
DISPLAY=:${display} xdotool type --window ${windowId} --delay 0 "${escapedText}
```

Use this to special keys like Enter and Escape:
```bash
DISPLAY=:${display} xdotool key --window ${windowId} ${key}
```

And you can wrap them into methods to call anywhere in your code

```ts
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export const keyNames = ["Return", "Escape"] as const;
export type KeyName = (typeof keyNames)[number];


export abstract class virtualKeyboard {
  static async sendTextToWindow(windowId: number, display: number, text: string): Promise<void> {
    const escapedText = text.replace(/"/g, '\\"');
    await execAsync(
      `DISPLAY=:${display} xdotool type --window ${windowId} --delay 0 "${escapedText}"`
    );
  }
  static async sendKeyToWindow(windowId: number, display: number, key: KeyName): Promise<void> {
    await execAsync(`DISPLAY=:${display} xdotool key --window ${windowId} ${key}`);
  }
}

```