<template>
  <BlockUI :blocked="is_exporting">
    <div class="flex flex-col items-center justify-start gap-10">
      <div class=" text-5xl m-5 select-none">简单的视频滤镜添加 WebAPP</div>

      <div class="flex flex-row gap-2 w-full min-h-96 justify-between">
        <!-- video filter tags, draggable -->
        <div :class="' w-1/5 h-auto ' + protect_mask_parent()">
          <div :class="'h-full flex flex-col gap-2' + protect_mask()">
            <Fieldset legend="已运用滤镜(拖拽排序)" class="w-full h-1/2">
              <DragCurrent></DragCurrent>
            </Fieldset>
            <Fieldset legend="可添加(点击/拖拽)" class="w-full h-1/2">
              <DragAppliable></DragAppliable>
            </Fieldset>
          </div>
        </div>
        <Fieldset :legend="'视频(' + editor_mode + '模式)'" class="w-4/5 m-2">
          <div class="h-full flex flex-row">
            <FilterConfiger></FilterConfiger>
            <Divider layout="vertical" />
            <div class="flex flex-col items-center grow">
              <VideoWrapper></VideoWrapper>
              <div :class="' w-full ' + protect_mask_parent()">
                <TimeController :class="protect_mask()"></TimeController>
              </div>
            </div>
          </div>
        </Fieldset>
      </div>

      <div :class="' ' + protect_mask_parent()">
        <div :class="' flex flex-row flex-wrap gap-4 justify-center ' + protect_mask()">
          <Button label="导出" @click="start_export" />
          <Button :label="'进入' + anti_editor_mode + '模式(TODO)'" @click="shiftMode" />
        </div>
      </div>
    </div>
  </BlockUI>
  <div v-show="is_exporting" class=" top-0 left-0 absolute flex flex-col gap-2  justify-center items-center w-screen h-screen" style="z-index: 1102;">
    <ProgressBar class=" w-4/5 h-auto" :value="export_progress"></ProgressBar>
    <div> 全力导出.mp4 文件中... 切出标签页可能提前中断，safari/firefox 不支持声音导出 </div>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Fieldset from 'primevue/fieldset';
import Divider from 'primevue/divider';
import ProgressBar from 'primevue/progressbar';
import BlockUI from 'primevue/blockui';

import { useVideoStore } from '@/stores/video'

import VideoWrapper from "./components/VideoWrapper.vue";
import DragCurrent from "./components/DragCurrent.vue";
import DragAppliable from "./components/DragAppliable.vue";
import TimeController from "./components/TimeController.vue";
import FilterConfiger from "./components/FilterConfiger.vue";
import { storeToRefs } from "pinia";


const videoStore = useVideoStore()

const { start_export, shiftMode } = videoStore
const { video_url, editor_mode, anti_editor_mode, is_exporting, export_progress } = storeToRefs(videoStore)


const protect_mask = () => (video_url.value === '' ? ' pointer-events-none' : '')
const protect_mask_parent = () => (video_url.value === '' ? ' cursor-not-allowed' : '')

</script>
