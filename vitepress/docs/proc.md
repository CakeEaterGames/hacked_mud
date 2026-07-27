# Getting started

## Collecting the process info

Fist we need to collect some info about the hackmud processes

- PID - Process ID of a hackmud client
- DISPLAY env variable - Display at which hackmud was launched at
- WindowID - Window ID of a hackmud client

Let's start with the Process IDs

```sh
ps aux | grep -v grep | grep hackmud
```

```sh
username@hostname:~$  ps aux | grep -v grep | grep hackmud
username      7738 15.2  3.3 6489560 550288 ?      Sl   Jul26 173:58 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
username    137363 44.5 16.2 9290812 2658944 ?     Rl   Jul26 485:17 /home/steam/.local/share/Steam/steamapps/common/hackmud/hackmud_lin.x86_64 -batchmode -silent-crashes -logFile /dev/null -windowed -w 8 -h 8 -si
```

I have 2 hackmud instances running. One was launched from the desktop and another was launched in a docker container.
We need to parse the strings to get PIDs 7738 and 137363.

Now that we have the PIDs we can use them to find the DISPLAY variable

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

## Reading the maps

The next step would be to read the proc maps. The memory of the process actually lives in this directory and can be accessed the same way as you access a txt file. You can just open it.

```sh
cat /proc/${pid}/maps
```

```sh
username@hostname:~$ cat /proc/7738/maps
00200000-00201000 r--p 00000000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
00201000-00202000 r-xp 00001000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
00202000-00203000 r--p 00002000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
00203000-00204000 rw-p 00003000 08:02 36342038 /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64
0e27b000-12140000 rw-p 00000000 00:00 0 [heap]
4057c000-4058c000 rwxp 00000000 00:00 0
413d3000-4168e000 rwxp 00000000 00:00 0
7c2404000000-7c2404021000 rw-p 00000000 00:00 0
7c2404021000-7c2408000000 ---p 00000000 00:00 0
7c240b000000-7c240c021000 rw-p 00000000 00:00 0
7c240c021000-7c2410000000 ---p 00000000 00:00 0
7c2410000000-7c2410021000 rw-p 00000000 00:00 0
...
```

Parse every line and extract the following values:

- start - 00200000
- end - 00201000
- path - /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin.x86_64

for now we will only need the ibmonobdwg map, but later on we will need all of them.

TODO Why are there 4 of them and which one do we need to read?

```sh
username@hostname:~$ cat /proc/7738/maps | grep libmonobdwgc
7c2586600000-7c25869a1000 r-xp 00000000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
7c25869a1000-7c2586ba1000 ---p 003a1000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
7c2586ba1000-7c2586bab000 r--p 003a1000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
7c2586bab000-7c2586bad000 rw-p 003ab000 08:02 36570016                   /home/username/.steam/debian-installation/steamapps/common/hackmud/hackmud_lin_Data/MonoBleedingEdge/x86_64/libmonobdwgc-2.0.so
```
