import type { CameraFeed } from "./types";

export const CAMERA_FEEDS: CameraFeed[] = [
  {
    id: "cam-01",
    name: "CAM 01 · Jagtap Dairy Chowk",
    junction: "Jagtap Dairy Flyover (North Ramp)",
    position: [10, 16, -120],
    type: "simulated",
    youtubeId: "21X5lGlDOfg", // NASA Earth / Live Stream example or live junction
    streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    fps: 30,
  },
  {
    id: "cam-02",
    name: "CAM 02 · Kokane Chowk",
    junction: "Nashik Phata – Wakad BRTS Corridor",
    position: [-260, 16, 210],
    type: "simulated",
    youtubeId: "5_XSYlAfJZM",
    streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    fps: 25,
  },
  {
    id: "cam-03",
    name: "CAM 03 · Kunal Icon Road",
    junction: "Kunal Icon Society Avenue",
    position: [-310, 16, -70],
    type: "simulated",
    youtubeId: "live_stream",
    fps: 30,
  },
  {
    id: "cam-04",
    name: "CAM 04 · Govind Garden Chowk",
    junction: "Govind Garden Flyover & Shivar Link",
    position: [-180, 16, -170],
    type: "simulated",
    fps: 30,
  },
  {
    id: "cam-05",
    name: "CAM 05 · Vision 9 / Shivar Chowk",
    junction: "Vision 9 Commercial Hub",
    position: [220, 16, 60],
    type: "simulated",
    fps: 30,
  },
];
