<template>
  <div class="h-full min-w-48 flex flex-col items-center space-y-4 p-4">
    <!-- Iterate over each key in active_config -->
    <div v-if="!has_active_filter" class=" justify-self-center">
      选择一个滤镜以编辑属性
    </div>
    <div v-else-if="!active_config" class=" justify-self-center">
      该滤镜没有可编辑的属性
    </div>
    <div v-else>
      <!-- 所有 number 类型的 config -->
      <div v-for="(value, key) in active_config_number" :key="key" class="flex flex-col gap-2">
        <div class=" flex justify-between items-center">
          <!-- Label -->
          <span class="w-20 text-sm font-medium capitalize">{{ key }}</span>
          <!-- Display the current value -->
          <span class="w-12 text-right">{{ value }}</span>
        </div>
        <!-- PrimeVue Slider -->
        <Slider :model-value="value" v-bind="getSliderProps(key)"
          @value-change="(new_val) => changeConfig(key, new_val)" />
      </div>
      <!-- 为范围选择滤镜模块单独开设 list + start_time + end_time + add rect  -->
      <div v-for="item, index in active_config_ranges" class=" flex flex-col gap-2 min-w-60"
        @click="seek_range_start(item['range'][0])">
        <!-- a range for "start" and "end" key in -->
        <Panel class="mb-2" :header="'范围' + index.toString() + ' 持续时间: ' + (item['range'][0]).toFixed(2) + '~' + (item['range'][1]).toFixed(2)">
          <div class="flex flex-row items-center justify-between gap-2">
            <Slider range :model-value="item['range']" :min="edit_range[0]" :max="edit_range[1]" :step="0.01"
              @value-change="(new_val) => changeRangeListConfig(index, <number[]>new_val)" class=" grow" />
            <Button icon="pi pi-trash" size="small" @click="deleteRangeListConfig(index)"></Button>
          </div>
        </Panel>
      </div>
      <div class=" mt-2 w-full">
      <Button v-if="active_config && (active_config as any).range_list" fluid icon="pi pi-plus"
        @click="pushRangeListConfig()"> </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Slider from 'primevue/slider';
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import { useFilterStore } from '@/stores/filter';
import { storeToRefs } from 'pinia';
import { FilterConfig_Dict } from '@/utils/default_config';
import { MAX_KERNEL_SIZE } from '@/utils/apply_filters_webgl';
import { computed } from 'vue'
import { useEditorStore } from '@/stores/video';

import { create_zone, delete_zone, renderZone } from "@/utils/zone_editor";

const filterStore = useFilterStore()

const { has_active_filter, active_config, active_filtername } = storeToRefs(filterStore)

function changeConfig(key: string, new_val: number | number[]) {
  filterStore.updateActiveConfig({ [key]: new_val })
}

// the activeconfig has certain structure: key "range_list",
// so here change the subkey "range" at range_list_index, and update "range_list" as a whole
const changeRangeListConfig = (range_list_index: number, new_range: number[]) => {
  // if new_range[1] < new_range[0], swap them
  if (new_range[1] < new_range[0]) new_range.reverse()
  const new_range_list = active_config_ranges.value
  new_range_list[range_list_index]['range'] = new_range
  filterStore.updateActiveConfig({ "range_list": new_range_list })
}

const pushRangeListConfig = () => {
  const new_config = create_zone(active_filtername.value, active_config.value)
  filterStore.updateActiveConfig(new_config)
}

const deleteRangeListConfig = (range_list_index: number) => {
  const new_range_list = active_config_ranges.value
  // 需要手动更新 fabric canvas 显示
  delete_zone(new_range_list[range_list_index].zone)
  new_range_list.splice(range_list_index, 1)
  filterStore.updateActiveConfig({ "range_list": new_range_list })
}

const active_config_number = computed(() => {
  if (!active_config) return {}
  const res: Record<string, number> = {}
  for (const key in active_config.value) {
    if (typeof (active_config.value as any)[key] === "number")
      res[key] = (active_config.value as any)[key] as number
  }
  return res
})

const active_config_ranges = computed(() => {
  if (!active_config.value) return []
  return (active_config.value as any)["range_list"] ?? []
})

// Function to compute slider properties based on the default value
function getSliderProps(key: string): { min: number; max: number; step: number } {
  // get the default value of the key to see what kind of slider to use
  const config_default = FilterConfig_Dict[active_filtername.value]
  const val = !(config_default && key in config_default) ? 0 : (config_default as any)[key]

  // Check if the value is a decimal between 0 and 1
  if (val >= 0 && val <= 1) return { min: 0, max: 1, step: 0.01 };
  // If the value is an integer and greater than or equal to 1
  else if (val > 1) {
    // decimals, not integer step
    if (Math.floor(val) !== val) return { min: 0.1, max: 10, step: 0.1 };
    else {
      // Even integer condition
      if (val % 2 === 0) return { min: 2, max: MAX_KERNEL_SIZE, step: 1 };
      // Odd integer condition
      else return { min: 1, max: MAX_KERNEL_SIZE, step: 2 };
    }
  }
  // For 0 or any other unexpected value (<1), to a decimal slider
  else return { min: -1, max: 1, step: 0.01 };
}


const editorStore = useEditorStore();
const { new_seek_frame, edit_range, is_play } = storeToRefs(editorStore);
//  adjust the video time to the start of the range!!
function seek_range_start(start_time: number) {
  // also pause the video when seeking
  is_play.value = false

  new_seek_frame.value = start_time
}

</script>