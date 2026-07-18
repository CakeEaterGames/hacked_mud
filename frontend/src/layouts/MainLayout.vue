<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Sample Dashboard </q-toolbar-title>

        <q-toggle class="q-mr-md" v-model="darkMode" checked-icon="dark_mode" unchecked-icon="light_mode" color="dark"
          :label="$q.dark.isActive ? 'Тёмная' : 'Светлая'" @update:model-value="toggleDarkMode" />


        <q-btn flat dense icon="logout" @click="logout()">Выйти</q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Навигация </q-item-label>
        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import EssentialLink, { type EssentialLinkProps } from "components/EssentialLink.vue";

import { useQuasar } from "quasar";
import { logout } from "src/utils/auth";
const $q = useQuasar();
const darkMode = ref($q.dark.isActive);

const linksList: EssentialLinkProps[] = [
  {
    title: "Главная",
    caption: "",
    icon: "home",
    link: "/",
  }
];

const leftDrawerOpen = ref(false);
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const d = $q.localStorage.getItem("dark")
if (d !== undefined && d !== null) {
  $q.dark.set(d as boolean)
  darkMode.value = $q.dark.isActive;
}


function toggleDarkMode() {
  $q.dark.toggle();
  $q.localStorage.set("dark", $q.dark.isActive)
}




</script>
