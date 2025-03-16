import { useFilterStore } from "@/stores/filter";
import {
  AllFilters,
  MosaikConfig,
  HueSatLightConfig,
  GaussianConfig,
  LaplacianConfig,
} from "@/utils/default_config";
import {
  rgbToHsl,
  hslToRgb,
  clamp,
  gaussianKernel,
  laplacianKernel,
  mask_zone_rect,
} from "./compute";
import { apply_conv_filter } from "./apply_filters_webgl";

const apply_greyscale_filter = (data: any) => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Compute the luminance grayscale value using the ITU-R BT.709 formula
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = data[i + 1] = data[i + 2] = luminance;
  }
};

const getBlock = (
  data: any,
  x: number,
  y: number,
  width: number,
  height: number,
  blockSizeX: number,
  blockSizeY: number
) => {
  const block = [];
  for (let j = 0; j < blockSizeY; j++) {
    // check if y+j is out of bound, if so, pad with corner value
    const index_y = y + j < 0 ? 0 : y + j >= height ? height - 1 : y + j;
    for (let i = 0; i < blockSizeX; i++) {
      const index_x = x + i < 0 ? 0 : x + i >= width ? width - 1 : x + i;
      const index = 4 * (width * index_y + index_x);
      block.push(data.slice(index, index + 3)); // WARNING: this will only slice 3 elements
    }
  }
  return block;
};

const apply_mosaik_filter = (
  data: any,
  width: number,
  height: number,
  { blockSizeX, blockSizeY }: MosaikConfig
) => {
  const applyBlock = (
    data: any,
    block: any,
    x: number,
    y: number,
    width: number,
    blockSizeX: number,
    blockSizeY: number
  ) => {
    // Compute the average color of the block, and apply it to the whole block
    const average = block
      .reduce(
        // get sum of all pixels in the block
        (acc: any, pixel: any) => {
          acc[0] += pixel[0];
          acc[1] += pixel[1];
          acc[2] += pixel[2];
          return acc;
        },
        [0, 0, 0]
      )
      .map((c: number) => c / (blockSizeY * blockSizeX)); // very neat way to calculate average
    for (let j = 0; j < blockSizeY; j++) {
      for (let i = 0; i < blockSizeX; i++) {
        const index = 4 * (width * (y + j) + x + i); // get the index of the pixel
        data[index] = average[0];
        data[index + 1] = average[1];
        data[index + 2] = average[2];
      }
    }
  };

  for (let y = 0; y < height; y += blockSizeY) {
    for (let x = 0; x < width; x += blockSizeX) {
      let sizeX = x + blockSizeX > width ? width - x : blockSizeX;
      let sizeY = y + blockSizeY > height ? height - y : blockSizeY;
      const block = getBlock(data, x, y, width, height, sizeX, sizeY);
      applyBlock(data, block, x, y, width, sizeX, sizeY);
    }
  }
};

const apply_HueSatLight_filter = (
  data: any,
  { hue, saturation, lightness }: HueSatLightConfig
) => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const hsl = rgbToHsl(r, g, b);
    // Apply the hue, saturation, and lightness changes
    const newRgb = hslToRgb(
      clamp(hsl[0] + hue, 0, 1),
      clamp(hsl[1] + saturation, 0, 1),
      clamp(hsl[2] + lightness, 0, 1)
    );
    data[i] = newRgb[0];
    data[i + 1] = newRgb[1];
    data[i + 2] = newRgb[2];
  }
};

let zonemask_context: boolean[] = [];

export const apply_filter = (imgData: any, cur_time: number, ori_WH:[number,number]|undefined=undefined) => {
  // each filter can only be applied within current zone_context,
  // pixels outside the zone_context should not be changed!!!!
  zonemask_context = Array(imgData.width * imgData.height).fill(true);
  const filterStore = useFilterStore();
  const data = imgData.data;
  const width = imgData.width;
  const height = imgData.height;
  filterStore.filter_list.forEach((filter) => {
    // first copy one part of the data so that we can restore it later
    const data_copy = new Uint8ClampedArray(data);
    
    // special all false mask, when no filter is active
    // these are filters that can be applied to the zone
    switch (filter.value) {
      case AllFilters.RECTRANGE:
        zonemask_context = Array(imgData.width * imgData.height).fill(false);
        if (!filter.config || ! (filter.config as any).range_list) break;
          const range_list = (filter.config as any).range_list;
          range_list.forEach((range_zone: any) => {
            if (
              cur_time >= range_zone.range[0] &&
              cur_time <= range_zone.range[1]
            ) {
              // set true mask to the zone
              mask_zone_rect(
                zonemask_context,
                width,
                height,
                (range_zone.zone as fabric.Rect).getBoundingRect(),
                ori_WH
              );
            }
          });
        break;
      case AllFilters.GLOBALRANGE:
        // just set the whole image to true
        zonemask_context = Array(imgData.width * imgData.height).fill(true);
        break;
    }


    // these are filters that can be applied to the image
    let has_image_filter = true;

    switch (filter.value) {
      case AllFilters.MOSAIK:
        apply_mosaik_filter(data, width, height, filter.config as MosaikConfig);
        break;
      case AllFilters.GREYSCALE:
        apply_greyscale_filter(data);
        break;
      case AllFilters.HUESATLIGHT:
        apply_HueSatLight_filter(data, filter.config as HueSatLightConfig);
        break;
      case AllFilters.GAUSSIAN:
        const { kernel_size, sigma } = filter.config as GaussianConfig;
        // prepare the kernel ahead
        let gs_kernel = gaussianKernel(kernel_size, sigma);
        apply_conv_filter(imgData, gs_kernel, kernel_size);
        break;
      case AllFilters.LAPLACIAN:
        const lap_kernel_size = (filter.config as LaplacianConfig).kernel_size;
        let lap_kernel = laplacianKernel(lap_kernel_size);
        apply_conv_filter(imgData, lap_kernel, lap_kernel_size <= 3 ? 3 : 5);
        break;
      case AllFilters.EDGE:
        let edge_kernel = laplacianKernel(3, true);
        apply_conv_filter(imgData, edge_kernel, 3);
        // normalize imgData
        let max = [0, 0, 0];
        for (let i = 0; i < data.length; i += 4) {
          for (let u = 0; u < 3; u++) {
            data[i + u] = Math.abs(data[i + u]);
            if (data[i + u] > max[u]) max[u] = data[i + u];
          }
        }
        max = max.map((i) => (i > 0 ? 255 / i : 1));
        for (let i = 0; i < data.length; i += 4) {
          for (let u = 0; u < 3; u++) {
            data[i + u] *= max[u];
          }
        }
        break;
      default:
        has_image_filter = false;
        break;
    }

    if (has_image_filter) {
      // now restore the data that is false in zone_context
      for (let i = 0; i < data.length; i += 4) {
        if (!zonemask_context[i / 4]) {
          data[i] = data_copy[i];
          data[i + 1] = data_copy[i + 1];
          data[i + 2] = data_copy[i + 2];
        }
      }
    }
  });
};
