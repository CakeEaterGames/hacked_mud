# Sending Virtual Inputs (Linux)

## Roadmap

::: warning
By now you should have read [this page](finding-mono-root-domain)
:::

In this section of the guide we will learn how to send virtual key strokes to a hackmud window.
Here's a rough roadmap of what we need to do:

1. Extract the DISPLAY environment variable
2. Find the X11 window ID using xdotool
3. Use xdotool to send key presses and text

## Requirements

Install these packages

```sh
sudo apt install xdotool  # Debian/Ubuntu

```

## Collecting the process info

First we need to collect some info about the hackmud processes

- DISPLAY env variable - Display at which hackmud was launched at
- WindowID - Window ID of a hackmud client


Using the PIDs we can find the DISPLAY variable that was used when the program started

```sh
cat /proc/${PID}/environ | tr '\0' '\n' | grep DISPLAY
```

```sh
username@hostname:~$ cat /proc/7738/environ | tr '\0' '\n' | grep DISPLAY
DISPLAY=:0
username@hostname:~$ cat /proc/137363/environ | tr '\0' '\n' | grep DISPLAY
DISPLAY=:95
```

Display 0 is a default display (aka desktop). Display 95 is virtual and invisible.

With the display variable we can find the window ID

```sh
DISPLAY=:${N} xdotool search --classname hackmud_lin.x86_64
```

```sh
username@hostname:~$ DISPLAY=:0 xdotool search --classname hackmud_lin.x86_64
65011720
username@hostname:~$ DISPLAY=:95 xdotool search --classname hackmud_lin.x86_64
39845894
```