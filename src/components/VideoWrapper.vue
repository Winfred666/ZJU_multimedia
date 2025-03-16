<template>
  <!-- if there isn't video, using a file uploader -->
  <div class="flex justify-center items-center w-full h-full">
    <!-- use canvas to display video, and support other interactive function -->
    <div v-if="video_url !== ''" :class="'relative '
      + (editor_mode == '编辑' ? 'pointer-events-auto' : 'pointer-events-none')">
      <!-- true video container, using vue3-canvas-video-player but still in full control -->
      <VideoCanvas :videoUrl="video_url"></VideoCanvas>
    </div>
    <div v-else>
      <FileUpload mode="basic" severity="secondary" auto customUpload accept="video/*" @select="onVideoSelect">
        <template #empty>
          <span>点击或拖拽上传视频</span>
        </template>
      </FileUpload>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVideoStore } from '@/stores/video';
import { storeToRefs } from 'pinia';
import VideoCanvas from '@/components/VideoCanvas.vue';

import FileUpload from "primevue/fileupload";

const videoStore = useVideoStore()
const { video_url, editor_mode } = storeToRefs(videoStore)


const onVideoSelect = (e: any) => {
  const file = e.files[0]
  // get the url of the video, delete blob: prefix
  const url = URL.createObjectURL(file)
  videoStore.setVideo(url, file)
}

</script>