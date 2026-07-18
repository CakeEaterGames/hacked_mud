<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold">Главная</div>
    </div>


    <div class="q-mt-lg">
      <div class="text-subtitle2 text-grey-7 q-mb-sm">Быстрые ссылки</div>
      <div class="q-gutter-sm column">
        <template v-for="(link, index) in links" :key="index">
          <q-btn :href="link.url" target="_blank" flat no-caps align="left" color="primary" :icon="link.icon">
            {{ link.label }}
          </q-btn>
        </template>
      </div>
    </div>

  </q-page>
</template>

<script setup lang="ts">

import { env } from 'src/config';
import { removeSlashes } from 'src/utils/url.utils';
import { onMounted } from 'vue'
import { treaty } from '@elysia/eden'
import type { apiAppTypes } from "@backend/apiApp"

const links = [
  { icon: "task", isAdmin: true, label: "Задача проекта", url: "http://portal.iturup.local/issues/sample" },
  { icon: "api", isAdmin: true, label: "Swagger текущего контура", url: removeSlashes(env.API_FULL_URL) + "/docs" },
]

onMounted(async () => {
  // import { apiAppTypes } from "@backend/apiApp"

  const eden = treaty<apiAppTypes>(removeSlashes(env.API_FULL_URL))
  const res = (await eden.helloworld.post({ input: "IT WORKED" })).data
  console.log(res)

})
</script>