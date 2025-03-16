<template>
  <draggable :list="filter_templates" item-key="id" 
    :group="{name:'filters', pull:'clone'}"
    :clone="cloneFilter"
    :sort="false" class="tag-group" ghost-class="ghost">
    <template #item="{element}">
      <Tag class="cursor-move" :value="element['value']" @click="filterStore.addFilter(element['value'])"/>
    </template>
  </draggable>
</template>

<script setup lang="ts">
// appliale list all filters that can be repeatedly applied to video, never delete!!
import Tag from 'primevue/tag';
import draggable from 'vuedraggable'
import { AllFilters } from '@/utils/default_config';
import { useFilterStore,create_filter } from '@/stores/filter';
const filterStore = useFilterStore();

const filter_templates = Object.entries(AllFilters).map(([key, value]) => {
  return {
    id: key,
    value: value
  }
});

const cloneFilter = (element:any) =>{
  return create_filter(element['value'])
}

</script>