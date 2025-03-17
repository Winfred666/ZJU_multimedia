import { ref } from 'vue'
import { defineStore } from 'pinia'
import { computed } from 'vue'

// if there isn't video, the value of video_blob is undefined.
export const EditorMode = ['编辑', '预览']

// real media data.
export const useVideoStore = defineStore('video', () => {
  const video_url = ref('')
  const video_blob = ref<Blob>()
  const editor_mode_idx = ref(0)

  const export_progress = ref(100) // 0-100, 100 means finished.
  const is_exporting = ref(false) // however need another variable to trigger the export process.
  const editor_mode = computed(() => {
    return EditorMode[editor_mode_idx.value]
  })

  const anti_editor_mode = computed(() => {
    return EditorMode[1-editor_mode_idx.value]
  })

  function setVideo(url: string, blob: Blob) {
    video_url.value = url
    video_blob.value = blob
  }

  function shiftMode() {
    editor_mode_idx.value = 1 - editor_mode_idx.value
  }

  function start_export() {
    export_progress.value = 0
    is_exporting.value = true
  }

  return {is_exporting, export_progress, editor_mode, anti_editor_mode, video_url, video_blob, setVideo ,shiftMode, start_export}
})


export const useEditorStore = defineStore('editor', () => {
  const edit_range = ref([0, 0])
  const is_loop = ref(false)
  const volume = ref(0.5)
  const is_play = ref(false)
  const play_speed = ref(1)
  const cur_time = ref(0) // WARNING: cur_time is not controlled by user input, it is controlled by video player!!!
  const new_seek_frame = ref(0)
  const cur_progress = computed(() => {
    return (cur_time.value - edit_range.value[0]) / (edit_range.value[1] - edit_range.value[0])
  })
  return { edit_range, is_loop, volume, is_play, play_speed, cur_progress , cur_time,new_seek_frame }
})