<template>
  <q-page class="q-pa-md" @keyup.escape="toggleSettings">
    <div class="row items-center q-gutter-sm">
      <div>hacked mud</div>
      <div>
        {{ selectedClient?.gameState }}
      </div>
      <q-badge v-if="selectedClient"> {{ selectedClient.pid }} </q-badge>
      <q-btn dense icon="settings" v-on:click="toggleSettings" />
    </div>
    <div v-if="selectedClient">
      <div class="overlay">
        <div class="overlay-text text-h2 text-red" v-if="[7, 8, 9].includes(selectedClient.gameState.gameState)">
          {{ selectedClient.gameState.instructionsText }}
        </div>
      </div>
      <div
        ref="shell"
        id="shell"
        class="q-mt-sm col text-primary console sps"
        :innerHTML="selectedClient.shellHTML"
        :class="selectedClient.gameState.gameState == 10 ? 'red-border' : ''"
      />
      <q-input v-model="input" dense @keyup="handleKeydown">
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
            <div class="q-mb-sm">Clients:</div>
            <div class="q-gutter-sm">
              <q-btn
                v-for="client in gameClients"
                :key="'btn' + client.pid"
                dense
                color="primary"
                :label="client.pid"
                @click="selectedClient = client"
              />
              <q-btn dense color="secondary" label="Refresh" />
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

.sps {
  white-space-collapse: preserve-spaces;
  white-space: pre;
  line-height: 15px !important;
}
.console {
  width: 100%;
  overflow-y: scroll;
  overflow-x: auto;
  /* height: 620px; */
  height: 87vh;
  border: 2px;
  border-style: solid;
  padding: 10px;
  white-space: nowrap;
}
</style>

<script setup lang="ts">
import { env } from "src/config";
import { removeSlashes } from "src/utils/url.utils";
import { onMounted, ref } from "vue";
import { backend } from "src/utils/eden";

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
    url: env.VITEPRESS_FULL_URL,
  },
  {
    icon: "code",
    label: "Github",
    url: removeSlashes(env.API_FULL_URL) + "/docs",
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
  shell: string;
  shellHTML: string;
};

const gameClients = ref<gameClient[]>([]);
const selectedClient = ref<gameClient | undefined>(undefined);

function findClient(pid: number) {
  const client = gameClients.value.find((a) => a.pid == pid);
  return client;
}

function chatToHTML(str: string) {
  return str
    .replace(/\n/gm, "</br>")
    .replace(/\s/gm, "&nbsp;")
    .replace(
      /<color=#([A-Fa-f0-9]{8})>(.*?)<\/color>/g,
      '<span class="sps" style="color:#$1;">$2</span>'
    );
}

function scrollToBottom() {
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

async function handleKeydown(event: KeyboardEvent) {
  console.log(event);

  if (event.key === "Escape") {
    toggleSettings();
    return;
  }

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

onMounted(() => {
  document.addEventListener("keyup", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      toggleSettings();
    }
  });

  const ws = backend.ws.subscribe();
  ws.subscribe((message) => {
    const data = message.data;
    // console.log("got", data);
    // console.log("got", data.pid);
    switch (data.type) {
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
        c.shellHTML = chatToHTML(c.shell);
        console.log(selectedClient.value?.pid == data.pid)
        if (selectedClient.value?.pid == data.pid) {
          setTimeout(scrollToBottom, 200);
        }
        break;
      }
      case "FullClientListUpdate": {
        for (const c of data.clients) {
          const sh = c.shellState.normalizedText.join("\n");
          if (!findClient(c.pid)) {
            gameClients.value.push({
              pid: c.pid,
              gameState: c.gameState,
              shell: sh,
              shellHTML: chatToHTML(sh),
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
});
</script>
