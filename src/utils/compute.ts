import { MAX_KERNEL_SIZE } from "./apply_filters_webgl";

export const rgbToHsl = (r:number, g:number, b:number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (d !== 0) {
      s = l < 0.5 ? d / (max + min) : d / (2 - max - min);
      if (max === r) {
          h = (g - b) / d + (g < b ? 6 : 0);
      } else if (max === g) {
          h = (b - r) / d + 2;
      } else {
          h = (r - g) / d + 4;
      }
      h /= 6;
  }
  return [h, s, l];
}


export const hslToRgb = (h:number, s:number, l:number) => {
  let r, g, b;
  if (s === 0) {
      r = g = b = l; // directly apply grayscale
  } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s; // calculate the value of q
      const p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export const meanKernel = (size:number):Array<number> => {
  // Create a 2D mean kernel array of size*size
  const kernel = new Array(size*size)
  const value = 1 / (size * size);
  for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
          kernel[j*size + i] = value;
      }
  }
  return kernel;
}

// WARNING: size must be an odd number
export const gaussianKernel = (size:number, sigma:number):Array<number> => {
  // Create a 2D Gaussian kernel array of size*size, but pad to MAX_KERNEL_SIZE
  const kernel = new Array(MAX_KERNEL_SIZE*MAX_KERNEL_SIZE).fill(0);
  const center =Math.floor(size / 2);
  let sum = 0;
  const sigma2 = 1 / (2 * sigma * sigma);
  for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
          const x = i - center;
          const y = j - center; // just 2D gaussian function
          kernel[j*MAX_KERNEL_SIZE + i] = Math.exp(-(x * x + y * y) * sigma2);
          sum += kernel[j*MAX_KERNEL_SIZE + i];
      }
  }
  const sum_inv = 1 / sum;
  // Normalize the kernel
  for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
          kernel[j*MAX_KERNEL_SIZE + i] *= sum_inv;
      }
  }
  return kernel;
}

// WARNING: size must be an odd number
export const laplacianKernel = (size:number = 3, isEdge=false):Array<number> => {
  // Create a 2D Laplacian kernel array of size*size
  const kernel = new Array(MAX_KERNEL_SIZE*MAX_KERNEL_SIZE).fill(0);
  if(size <= 3){
    kernel[1] = kernel[MAX_KERNEL_SIZE] = kernel[MAX_KERNEL_SIZE + 2] = kernel[2 * MAX_KERNEL_SIZE + 1] = isEdge? 1: -1;
    kernel[MAX_KERNEL_SIZE+1] = isEdge ? -4 : (4 + 1);
  }else{
    // use the 5x5 kernel
    kernel[2] = kernel[MAX_KERNEL_SIZE + 1] = kernel[MAX_KERNEL_SIZE + 3] = kernel[2 * MAX_KERNEL_SIZE] = 
      kernel[2* MAX_KERNEL_SIZE + 4] = kernel[3*MAX_KERNEL_SIZE+1] = kernel[3*MAX_KERNEL_SIZE+3] = kernel[4*MAX_KERNEL_SIZE + 2] = -2;
    kernel[2*MAX_KERNEL_SIZE + 2] = 16 + 1;
  }
  return kernel;
}


// t is the value of the color channel(hue), p and q are the two colors that are mixed
const hueToRgb = (p:number, q:number, t:number)=>{
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
}

// when export, the resolution is different !!!
export const mask_zone_rect = (zonemask: boolean[], cvs_w: number, cvs_h: number, bbox: any, scale_factor:number|undefined=undefined) => {
  // pixel that outside the bbox should be false.
  let {left, top, width, height} = bbox;
  if(scale_factor){
    left = Math.round(left * scale_factor);
    top = Math.round(top * scale_factor);
    width = Math.round(width * scale_factor);
    height = Math.round(height * scale_factor);
  }
  
  for (let j = 0; j < cvs_h; j++) {
      for (let i = 0; i < cvs_w; i++) {
          if (i >= left && i < left + width && j >= top && j < top + height) {
              zonemask[j * cvs_w + i] = true;
          }
      }
  }
}