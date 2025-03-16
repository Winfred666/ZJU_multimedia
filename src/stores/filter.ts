import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { AllFilters } from "@/utils/default_config";
import { AnyFilterConfig, FilterConfig_Dict } from "@/utils/default_config";
import { create_zone } from "@/utils/zone_editor";

export type Filter_Example = {
  id: string;
  value: AllFilters;
  config: AnyFilterConfig;
};

export const create_filter = (filter: AllFilters): Filter_Example => {
  console.log(filter, FilterConfig_Dict[filter]);
  // for possibly range filter, need to add a select zone at current time of video
  const config_default = create_zone(filter, FilterConfig_Dict[filter],true);
  return {
    id: filter + "_filter_" + useFilterStore().filter_list.length,
    value: filter,
    config: config_default,
  };
};

// what filters are applied to the video (as well as the order), and other config of filter in the future.
export const useFilterStore = defineStore("filter", () => {
  const filter_list = ref<Filter_Example[]>([]);
  const active_index = ref(-1);

  const has_active_filter = computed(
    () =>
      active_index.value >= 0 && active_index.value < filter_list.value.length
  );

  const active_config = computed(() => {
    if (!has_active_filter.value) return {};
    return filter_list.value[active_index.value].config;
  });

  const active_filtername = computed(() => {
    return filter_list.value[active_index.value].value;
  });

  function addFilter(filter: AllFilters) {
    filter_list.value.push(create_filter(filter));
  }

  function updateActiveConfig(update_obj: any) {
    if (!has_active_filter.value) return;
    filter_list.value[active_index.value].config = {
      ...filter_list.value[active_index.value].config,
      ...update_obj,
    };
  }

  return {
    active_index,
    filter_list,
    addFilter,
    active_config,
    has_active_filter,
    updateActiveConfig,
    active_filtername,
  };
});
