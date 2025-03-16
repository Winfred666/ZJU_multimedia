// bind a 2D canvas , use fabric to draw editable rectangle zone,
// and the zone could show/hide according to start_time/end_time of the select zone
import * as fabric from "fabric";
import { AllFilters } from "./default_config";
import { useEditorStore } from "@/stores/video";
import { useFilterStore } from "@/stores/filter";

let fabricCanvas: fabric.Canvas;

// delete icon of the zone
const FABRIC_DELETE_ICON = document.createElement("img");
FABRIC_DELETE_ICON.src =
  "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";

export const initZoneEditor = (canvas: HTMLCanvasElement) => {
  fabricCanvas = new fabric.Canvas(canvas);
};

export const delete_zone = (zone: fabric.Object) => {
  if (!fabricCanvas || !zone.isOnScreen()) return;
  fabricCanvas.remove(zone);
  fabricCanvas.requestRenderAll();
}

const get_active_rangelist = () => {
  const filterStore = useFilterStore();
  let range_list: any = filterStore.active_config;
  if (!range_list) return undefined;
  range_list = range_list["range_list"];
  if (!range_list) return undefined;
  return range_list;
};

// render zone according to the start_time and end_time,
// whether editable depends on whether this range is selected (active filter)
export const renderZone = (cur_time: number,force_rerender:boolean = false) => {
  const range_list = get_active_rangelist();
  if (!range_list || force_rerender) {
    // just remove all the zones
    fabricCanvas.remove(...fabricCanvas.getObjects());
    if(!range_list) return;
  }
  range_list.forEach((range_zone: any) => {
    if (
      cur_time >= range_zone["range"][0] &&
      cur_time <= range_zone["range"][1]
    ) {
      if (!range_zone["zone"].isOnScreen()) {
        fabricCanvas.add(range_zone["zone"]);
        fabricCanvas.setActiveObject(range_zone["zone"]);
      }
    } else if (range_zone["zone"].isOnScreen()) {
      fabricCanvas.remove(range_zone["zone"]);
      fabricCanvas.requestRenderAll();
    }
  });
};

export const create_zone = (
  filter: AllFilters,
  config: any,
  copy: boolean = false
): any => {
  if (!config || !config["range_list"]) return config;
  if (copy) config = JSON.parse(JSON.stringify(config));
  // according to the current time, create a zone
  const editorStore = useEditorStore(); // do not turn them as ref!
  let new_zone;
  switch (filter) {
    case AllFilters.RECTRANGE:
      // do not fill as it is select zone and need to be transparent
      new_zone = new fabric.Rect({
        left: fabricCanvas.width / 4,
        top: fabricCanvas.height / 4,
        fill: "rgba(0,0,0,0.3)",
        stroke: "magenta", // magenta
        strokeWidth: 2,
        strokeDashArray: [10,10],
        width: fabricCanvas.width / 2,
        height: fabricCanvas.height / 2,
        objectCaching: false,
        cornerStyle: 'circle',
        cornerColor: 'magenta',
        transparentCorners: false,
      });
      break;
  }
  (new_zone as fabric.Rect).controls.deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: 16,
    cursorStyle: "pointer",
    mouseUpHandler: delete_fabric_obj,
    render: render_delete_icon,
  });

  config["range_list"].push({
    range: [
      editorStore.cur_time,
      editorStore.edit_range[1] > editorStore.cur_time + 1
        ? editorStore.cur_time + 1
        : editorStore.edit_range[1],
    ],
    zone: new_zone,
  });
  return config;
};

const delete_fabric_obj = (_eventData: any, transform: any) => {
  // find the zone in the filterStore and delete it
  const range_list = get_active_rangelist();
  if (!range_list)
    throw new Error("no active range_list, how the user delete the zone ?");
  range_list.forEach((range_zone: any, idx: number) => {
    if (range_zone["zone"] === transform.target) {
      range_list.splice(idx, 1);
    }
  });
  const canvas = transform.target.canvas;
  canvas.remove(transform.target);
  canvas.requestRenderAll();
};

const render_delete_icon = (ctx: any, left: number, top: number) => {
  const size = 25;
  ctx.save();
  ctx.translate(left, top);
  // ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle)); // do not rotate
  ctx.drawImage(FABRIC_DELETE_ICON, -size / 2, -size / 2, size, size);
  ctx.restore();
};
