<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title> Панель администрирования социальных проездных </q-toolbar-title>
        <q-toggle v-model="darkMode" checked-icon="dark_mode" unchecked-icon="light_mode" color="dark"
          :label="$q.dark.isActive ? 'Тёмная' : 'Светлая'" @update:model-value="toggleDarkMode" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import EssentialLink from "components/EssentialLink.vue";

import { useQuasar } from "quasar";
const $q = useQuasar();
const darkMode = ref($q.dark.isActive);

function toggleDarkMode() {
  $q.dark.toggle();
}

</script>
