<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold">Главная</div>
    </div>

    <div class="q-mt-lg">
      <div class="text-subtitle2 text-grey-7 q-mb-sm">Быстрые ссылки</div>
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
          >
            {{ link.label }}
          </q-btn>
        </template>
      </div>
    </div>

    <div>
      {{ gameState }}
    </div>
    <div
      ref="shell"
      class="col text-primary console sps"
      :innerHTML="shellHTML"
    />
  </q-page>
</template>

<style scoped>
.sps {
  white-space-collapse: preserve-spaces;
  white-space: pre;
  line-height: 15px !important;
}
.console {
  width: 100%;
  overflow-y: scroll;
  overflow-x: hidden;
  /* height: 620px; */
  /* height: 100%; */
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
import { treaty } from "@elysia/eden";
import type { apiAppTypes } from "@backend/apiApp";
import { backend } from "src/utils/eden";

const links = [
  {
    icon: "api",
    isAdmin: true,
    label: "Swagger текущего контура",
    url: removeSlashes(env.API_FULL_URL) + "/docs",
  },
];

const gameState = ref({});
const shell = ref("");
const shellHTML = ref("");

function chatToHTML(str: string) {
  return str
    .replace(/\n/gm, "</br>")
    .replace(/\s/gm, "&nbsp;")
    .replace(
      /<color=#([A-Fa-f0-9]{8})>(.*?)<\/color>/g,
      '<span class="sps" style="color:#$1;">$2</span>'
    );
}

onMounted(async () => {
  const res = (await backend.getShellContents.post()).data;
  console.log(res);
  shell.value = res?.data.text.join("\n") ?? "";

  const ws = backend.ws.subscribe();
  ws.subscribe((message) => {
    console.log("got", message);
    switch (message.data.type) {
      case "GameStateUpdate":
        gameState.value = message.data.gameState;

        break;
      case "ShellUpdate":
        shell.value = message.data.shellState.text.join("\n");
        shellHTML.value = chatToHTML(shell.value);

        break;
    }
  });

  ws.on("open", () => {
    ws.send("hello from client");
  });
});
</script>
