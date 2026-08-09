<template>
  <q-page class="q-pa-md scan-lines">
    <div class="row items-center q-gutter-sm">
      <div>hacked mud</div>
      <div>
        <!-- {{ selectedClient?.gameState }} -->
      </div>
      <q-badge
        v-if="selectedClient"
        :label="selectedClient.gameStats.name as string || selectedClient.pid"
      />
      <q-btn dense icon="settings" v-on:click="toggleSettings" />
    </div>
    <div v-if="gameClients.length == 0">
      No clients found. Please launch hackmud from Steam
    </div>
    <div v-if="selectedClient">
      <div class="overlay">
        <div
          class="overlay-text text-h2 text-red"
          v-if="[7, 8, 9].includes(selectedClient.gameState.gameState)"
        >
          {{ selectedClient.gameState.instructionsText }}
        </div>
      </div>
      <div
        ref="shell"
        id="shell"
        class="q-mt-sm col text-primary console glow-text"
        :innerHTML="selectedClient.shellHTML"
        :class="selectedClient.gameState.gameState == 10 ? 'red-border' : ''"
      />
      <q-input v-model="input" dense @keyup="handleCmdKeyEvents">
        <template v-slot:prepend>
          <q-spinner v-if="selectedClient.gameState.isProcessing"> </q-spinner>
          <q-icon v-else name="code" />
        </template>
      </q-input>
      <div
        v-if="selectedClient.gameState.gameState == 10"
        class="hardline-progress q-mt-sm"
        :style="{ width: (selectedClient.gameState.timerCurrent / 120) * 100 + '%' }"
      ></div>
    </div>

    <q-dialog v-model="toShowSettings" no-esc-dismiss>
      <q-card style="width: 100%">
        <q-card-section>
          Controls <span class="text-grey-7"> (Hotkey ESC)</span>
        </q-card-section>
        <q-card-section>
          <div class="">
            <div class="q-mb-sm">
              Clients: <span class="text-grey-7"> (Hotkey ALT + number)</span>
            </div>
            <div class="q-gutter-sm">
              <q-btn
                v-for="client in gameClients"
                :key="'btn' + client.pid"
                dense
                color="primary"
                :no-caps="true"
                :label="client.gameStats.name as string ?? client.pid"
                @click="switchClient(client)"
              />
              <!-- <q-btn dense color="secondary" label="Refresh" /> -->
            </div>
          </div>
          <div class="q-mt-lg" v-if="selectedClient">
            <div class="q-mb-sm">
              Set Scenario:
              <span class="text-grey-7">
                Current: {{ selectedClient.gameStats.scenario }}</span
              >
            </div>

            <div class="q-gutter-sm">
              <q-btn
                v-for="(v, k) in Scenarios"
                :key="'sc' + k"
                :label="v"
                color="primary"
                :no-caps="true"
                dense
                @click="setScenario(selectedClient, v)"
              />
            </div>
          </div>
          <div class="q-mt-lg">
            <div class="q-mb-sm">Settings:</div>
            <div>
              <q-checkbox
                v-model="toScrollChat"
                label="Scroll down when new lines are added"
              />
            </div>
          </div>
          <div class="q-mt-lg">
            <div class="q-mb-sm">Quick links</div>
            <div class="q-gutter-sm column">
              <template v-for="(link, index) in links" :key="index">
                <q-btn
                  :href="link.url"
                  target="_blank"
                  flat
                  no-caps
                  align="left"
                  color="primary"
                  :icon="link.icon"
                  :label="link.label"
                />
              </template>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  color: white; /* Adjust based on your background */
  text-align: center;
}

.red-border {
  border-color: red !important;
}

.hardline-progress {
  background-color: red;
  height: 4px;
}

.console {
  white-space-collapse: preserve-spaces;
  white-space: pre;
  line-height: 12px !important;
  letter-spacing: 0.25px;
  text-shadow: 0 0 12px rgba(100, 150, 255, 0.25);
  font-weight: lighter;
  width: 100%;
  overflow-y: scroll;
  overflow-x: auto;
  /* height: 620px; */
  height: 87vh;
  border: 2px;
  border-style: solid;
  padding: 10px;
}

.glow-text {
  text-shadow: 0 0 2px currentColor;
  /* 0 0 2px currentColor; */
  /* 0 0 4px currentColor; */
  /* 0 0 8px currentColor; */
}

.scan-lines {
  background: repeating-linear-gradient(
    180deg,
    #0e0e0e,
    #0e0e0e 0.2em,
    #101215 0.2em,
    #101215 0.4em
  );
}
</style>

<script setup lang="ts">
import { env } from "src/config";
import { removeSlashes } from "src/utils/url.utils";
import { onMounted, onUnmounted, ref } from "vue";
import { backend } from "src/utils/eden";
import { Scenarios, type Scenario } from "@shared/types/scenario.types";
import {shellToHTML} from "src/utils/shellToHTML.utils"

const toScrollChat = ref(true);
const toShowSettings = ref(false);
function toggleSettings() {
  toShowSettings.value = !toShowSettings.value;
}

const links = [
  {
    icon: "api",
    label: "Swagger",
    url: removeSlashes(env.API_FULL_URL) + "/docs",
  },
  {
    icon: "book",
    label: "Documentation",
    url: "https://cakeeatergames.github.io/hacked_mud/",
    // url: env.VITEPRESS_FULL_URL,
  },
  {
    icon: "code",
    label: "Github",
    url: "https://github.com/CakeEaterGames/hacked_mud",
  },
];

const input = ref("");

type gameClient = {
  pid: number;
  gameState: {
    isProcessing: boolean;
    hardlineState: number;
    hardlineStateStr: string;
    instructionsText: string;
    timerCurrent: number;
    gameState: number;
  };
  gameStats: Record<string, unknown>;
  shell: string;
  shellHTML: string;
};

const gameClients = ref<gameClient[]>([]);
const selectedClient = ref<gameClient | undefined>(undefined);

function switchClient(client: gameClient) {
  selectedClient.value = client;
  setTimeout(scrollToBottom, 100);
}

function findClient(pid: number) {
  const client = gameClients.value.find((a) => a.pid == pid);
  return client;
}


function scrollToBottom() {
  if (!toScrollChat.value) return;
  const divElement = document.getElementById("shell");
  if (divElement) divElement.scrollTop = divElement.scrollHeight + 100;
}

async function inputCmd() {
  if (!selectedClient.value) return;
  const cmd = input.value;

  commandHistory.value.push(cmd);
  historyIndex.value = commandHistory.value.length;

  input.value = "";
  const res = await backend.sendCmd.post({ pid: selectedClient.value.pid, cmd });
}

async function setScenario(client:gameClient, scenario: Scenario) {
  const res = await backend.setScenario.post({ pid: client.pid, scenario });
}

function handleHotkeys(event: KeyboardEvent) {
  // console.log("handleHotkeys", event);

  if (event.altKey) {
    if ("123456789".includes(event.key) && !event.repeat && event.type == "keydown") {
      const num = Number(event.key);
      const client = gameClients.value[num - 1];
      if (client) {
        switchClient(client);
      }
      console.log(event);
    }
  }

  if (event.key === "Escape" && !event.repeat && event.type == "keydown") {
    toggleSettings();
  }
}

async function handleCmdKeyEvents(event: KeyboardEvent) {
  // console.log("handleCmdKeyEvents", event);

  if (event.key === "Enter") {
    await inputCmd();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (historyIndex.value > 0) {
      historyIndex.value--;
      input.value = commandHistory.value[historyIndex.value] ?? "";
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++;
      input.value = commandHistory.value[historyIndex.value] ?? "";
    } else {
      historyIndex.value = commandHistory.value.length;
      input.value = "";
    }
    return;
  }
}

const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);

let ws: ReturnType<typeof backend.ws.subscribe>;

function reconnectWs() {
  ws = backend.ws.subscribe();

  ws.on("open", (e) => {
    console.log("WS Connected");
  });

  ws.subscribe((message) => {
    const data = message.data;
    // console.log("got", data);
    // console.log("got", data.pid);
    switch (data.type) {
      case "StatsUpdate": {
        const c = findClient(data.pid);
        if (!c) break;
        c.gameStats = data.gameStats;
        break;
      }
      case "GameStateUpdate": {
        const c = findClient(data.pid);
        if (!c) break;
        c.gameState = data.gameState;
        break;
      }
      case "ShellUpdate": {
        const c = findClient(data.pid);
        if (!c) break;
        c.shell = data.shellState.normalizedText.join("\n");
        // c.shellHTML = c.shell
        c.shellHTML = shellToHTML(c.shell);
        if (selectedClient.value?.pid == data.pid) {
          setTimeout(scrollToBottom, 200);
        }
        break;
      }
      case "FullClientListUpdate": {
        const toRemove = [];
        for (const c of gameClients.value) {
          if (!data.clients.find((c2) => c2.pid == c.pid)) {
            toRemove.push(c.pid);
            console.log("Hackmud client got closed " + c.pid);
          }
        }
        if (toRemove.length > 0) {
          gameClients.value = gameClients.value.filter((c) =>
            data.clients.find((c2) => c2.pid == c.pid)
          );
        }
        for (const c of data.clients) {
          const sh = c.shellState.normalizedText.join("\n");
          if (!findClient(c.pid)) {
            gameClients.value.push({
              pid: c.pid,
              gameState: c.gameState,
              gameStats: c.gameStats,
              shell: sh,
              shellHTML: shellToHTML(sh),
              // shellHTML: sh,
            });
          }
          if (!selectedClient.value) {
            selectedClient.value = gameClients.value[0];
            setTimeout(scrollToBottom, 200);
          }
        }
        break;
      }
    }
  });
  ws.on("close", (e: CloseEvent) => {
    console.warn("WS connection closed. Reconnecting");
    reconnectWs();
  });
}

onMounted(() => {
  document.addEventListener("keydown", handleHotkeys);
  document.addEventListener("keyup", handleHotkeys);

  reconnectWs();
});

onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});
</script>
