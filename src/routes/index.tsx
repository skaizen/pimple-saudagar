import { createFileRoute } from "@tanstack/react-router";
import { Twin } from "@/components/twin/Twin";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pimple Saudagar, Live — 3D digital twin of Pune 411027" },
      { name: "description", content: "Explore one square kilometre of Pimple Saudagar, Pune in 3D: buildings, roads, trees, traffic, sun and seasons." },
      { property: "og:title", content: "Pimple Saudagar, Live" },
      { property: "og:description", content: "A living 3D map of Pimple Saudagar, Pimpri Chinchwad — move the sun, change the season, fly to landmarks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Twin,
});
