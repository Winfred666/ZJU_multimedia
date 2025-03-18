<template>
  <div class=" pt-2 flex flex-row items-center justify-around align-items-center gap-3">
    <!-- Play/Pause Button -->
    <Button :icon="is_play ? 'pi pi-pause' : 'pi pi-play'" @click="togglePlay" class="p-button-rounded" />

    <!-- Rollback Button -->
    <Button icon="pi pi-step-backward" @click="rollback" class="p-button-rounded" />

    <!-- Progress Bar with Time Labels -->
    <div class="flex flex-row items-center justify-center gap-4 grow">
      <span class=" w-16">{{ formatTime(cur_time) }}</span>
      <Slider :model-value="cur_time" :min="edit_range[0]" :max="edit_range[1]" @change="onProgressChange" class="w-full"
        :step="0.05" />
      <span class="w-16 ">{{ formatTime(edit_range[1]) }}</span>
    </div>

    <div class="flex items-center align-items-center gap-1">
      <label for="loopSwitch">Loop:</label>
      <ToggleSwitch id="loopSwitch" v-model="is_loop" />
    </div>
    <div class="flex items-center gap-1">
      <label for="speedDropdown">Speed:</label>
      <Select id="speedDropdown" v-model="play_speed" :options="speedOptions" optionLabel="label" optionValue="value"
        placeholder="Select Speed" />
    </div>
    <!-- Volume Slider -->
    <div @mouseenter="() => enter_volume_setting = true" class=" relative flex flex-col items-center">
      <i class="pi pi-volume-up py-2"></i>
      <div :class="`absolute h-28 px-6 py-2 bg-black/40 rounded-sm -top-28 transition-opacity ${enter_volume_setting?' opacity-100': ' opacity-0 pointer-events-none'}`">
        <Slider class="relative left-1/2" :model-value="volume" @change="onVolumeChange" orientation="vertical" :min="0"
          :max="1" :step="0.01" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Slider from 'primevue/slider';
import ToggleSwitch from 'primevue/toggleSwitch';
import Select from 'primevue/select';

import { useEditorStore } from '@/stores/video';
import { storeToRefs } from 'pinia';
import { ref, onMounted, onUnmounted } from 'vue';

const editorStore = useEditorStore();

const { is_play, edit_range, is_loop, play_speed, new_seek_frame, cur_time, volume } = storeToRefs(editorStore);
// Reactive state for video playback
// Example: set videoDuration to 300 seconds (5 minutes) or set it dynamically from your video element

const enter_volume_setting = ref(false);

// Toggle play/pause state
const togglePlay = () => {
  // if cur_progress is at the end, reset to start
  if (cur_time.value == edit_range.value[1]) {
    rollback();
  }
  is_play.value = !is_play.value;
};

const handleKeyPress = (event: KeyboardEvent) => {
  switch (event.code) {
    case "Space":
      event.preventDefault(); // prevent scrolling
      togglePlay();
      break;
    case "ArrowLeft":
    case "KeyA":
      onProgressChange(cur_time.value - 2);
      break;
    case "ArrowRight":
    case "KeyD":
      onProgressChange(cur_time.value + 2);
      break;
    case "ArrowUp":
    case "KeyW":
      onVolumeChange(volume.value + 0.05);
      break;
    case "ArrowDown":
    case "KeyS":
      onVolumeChange(volume.value - 0.05);
      break;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
});

// Rollback to start (reset new_seek_frame)
const rollback = () => {
  if (new_seek_frame.value == 0) {
    new_seek_frame.value = 0.01; // make sure it update.
  } else {
    new_seek_frame.value = 0;
  }
};

// Handle slider change (if additional logic is needed)
const onProgressChange = (value: number) => {
  // protect from  out of range
  value = Math.max(edit_range.value[0], Math.min(edit_range.value[1], value));
  new_seek_frame.value = value;
};

const onVolumeChange = (value: number) => {
  // protect from  out of range
  value = Math.max(0, Math.min(1, value));
  volume.value = value;
  enter_volume_setting.value = true;
  // close volume setting after 3 seconds
  setTimeout(() => enter_volume_setting.value = false, 3000);
};

// Format seconds into mm:ss:s's' string format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (num: number) => (num < 10 ? '0' + num : num);
  return `${pad(minutes)}:${pad(secs)}`;
};


// Options for play speed
const speedOptions = [
  { label: '0.1x', value: 0.1 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 }
];



</script>