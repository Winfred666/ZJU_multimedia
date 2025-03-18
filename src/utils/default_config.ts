export const FPS_DEFUALT = 30;

// define a list of filters enums that have name
export enum AllFilters {
    MOSAIK = "马赛克",
    GREYSCALE = "黑白",
    HUESATLIGHT = "色相/饱和度/亮度",
    GAUSSIAN = "高斯模糊",
    LAPLACIAN = "拉普拉斯边缘增强",
    EDGE = "边缘检测",
    RECTRANGE = "范围:矩形",
    GLOBALRANGE = "范围:恢复全局",
    GLITCH = "故障特效"
  }

// a simple way to create config for different filters
// first define a default config for each filter.
// then extract the type of the config, and export together with the default config.

const MosaikConfig_Default = {
    blockSizeX: 10,
    blockSizeY: 10
}

const HueSatLightConfig_Default = {
    hue: +0,
    saturation: -0.1,
    lightness: -0.1
}

const GaussianConfig_Default = {
    kernel_size: 3,
    sigma: 2.1
}

const LaplacianConfig_Default = {
    kernel_size: 3
}

const RangeConfig_Default = {
    range_list: []
}

const EdgeConfig_Default = {
    threshold: 0.1
}

const GlitchConfig_Default = {
    colorShiftOn: true,
    colorShiftIntensity: 0.5,
    distortionOn: true,
    distortionIntensity: 0.5,
    scanlineOn: true,
    scanlineHeight: 0.02,
    scanlineSpeed: 0.1,
}

export type MosaikConfig=(typeof MosaikConfig_Default)
export type HueSatLightConfig=(typeof HueSatLightConfig_Default)
export type GaussianConfig=(typeof GaussianConfig_Default)
export type LaplacianConfig=(typeof LaplacianConfig_Default)
export type RangeConfig=(typeof RangeConfig_Default)
export type EdgeConfig=(typeof EdgeConfig_Default)
export type GlitchConfig=(typeof GlitchConfig_Default)

export type AnyFilterConfig = MosaikConfig|HueSatLightConfig|GaussianConfig|LaplacianConfig|RangeConfig|EdgeConfig|GlitchConfig|undefined

export const FilterConfig_Dict:Record<AllFilters,AnyFilterConfig> = {
    [AllFilters.MOSAIK]: MosaikConfig_Default,
    [AllFilters.GREYSCALE]: undefined,
    [AllFilters.HUESATLIGHT]: HueSatLightConfig_Default,
    [AllFilters.GAUSSIAN]: GaussianConfig_Default,
    [AllFilters.LAPLACIAN]: LaplacianConfig_Default,
    [AllFilters.EDGE]: EdgeConfig_Default,
    [AllFilters.RECTRANGE]: RangeConfig_Default,
    [AllFilters.GLOBALRANGE]: undefined,
    [AllFilters.GLITCH]: GlitchConfig_Default
}

