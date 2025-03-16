<template>
  <draggable :list="filter_list" item-key="id" class="tag-group"
   group="filters" :animation="200" ghost-class="ghost" @start="is_dragging = true" @end="is_dragging = false">
    <template #item="{ element, index }">
      <div>
        <Tag  class="cursor-move" :style="index == active_index ? 'background: #c026d3; color:white; border: 2px solid #9333ea;' : ''" :value="element['value']" @click="set_active(index)"/>
        <i v-if="index !== filter_list.length - 1" class="pi pi-arrow-right pl-0.5"></i>
      </div>
    </template>
  </draggable>
</template>

<script lang="ts" setup>
// import { Filter_Example } from '@/stores/filter';
import Tag from 'primevue/tag';
import draggable from 'vuedraggable'
import {ref } from 'vue'

import { useFilterStore } from '@/stores/filter';
import { storeToRefs } from 'pinia';
const filterStore = useFilterStore();
const { filter_list,active_index } = storeToRefs(filterStore)

const is_dragging =  ref(false) // if the filter is being dragged.

const set_active = (index: number) => {
  // if the filter is already active, then deactivate it
  if (active_index.value === index) {
    active_index.value = -1
  } else {
    active_index.value = index
  }
}

</script>

<style scoped>
.filters-move {
  transition: transform 0.5s;
}

.no-move {
  transition: transform 0s;
}

.filters-group {
  min-height: 20px;
}

.filters-group-item i {
  cursor: pointer;
}
</style>