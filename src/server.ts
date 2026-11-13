import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const CORRIDORS = [
  { id: "brts", name: "Nashik Phata – Wakad BRTS", origin: "18.5970,73.7850", destination: "18.5990,73.8080", freeFlowSpeed: 50 },
  { id: "kunal", name: "Kunal Icon Road", origin: "18.6040,73.7920", destination: "18.5980,73.7960", freeFlowSpeed: 38 },
  { id: "shivar", name: "Shivar Road / Govind Garden", origin: "18.5990,73.7940", destination: "18.5950,73.8010", freeFlowSpeed: 35 },
  { id: "rahatani", name: "Rahatani Link Road", origin: "18.6080,73.7900", destination: "18.6020,73.8050", freeFlowSpeed: 40 },
];

function getSimulatedTraffic(hourIST: number) {
  const isMorningPeak = hourIST >= 8.5 && hourIST <= 11.0;
  const isEveningPeak = hourIST >= 17.5 && hourIST <= 21.0;
  const isPostWorkLull = hourIST >= 21.0 && hourIST <= 22.5;

  const result: Record<string, any> = {};
  for (const c of CORRIDORS) {
    let level = "low";
    let speed = c.freeFlowSpeed;
    let delaySec = 0;

    if (isEveningPeak) {
      if (c.id === "brts" || c.id === "shivar") {
        level = "heavy";
        speed = Math.round(c.freeFlowSpeed * 0.35);
        delaySec = 420;
      } else {
        level = "moderate";
        speed = Math.round(c.freeFlowSpeed * 0.65);
        delaySec = 180;
      }
    } else if (isMorningPeak) {
      if (c.id === "brts" || c.id === "kunal") {
        level = "heavy";
        speed = Math.round(c.freeFlowSpeed * 0.4);
        delaySec = 360;
      } else {
        level = "moderate";
        speed = Math.round(c.freeFlowSpeed * 0.7);
        delaySec = 120;
      }
    } else if (isPostWorkLull) {
      level = "moderate";
      speed = Math.round(c.freeFlowSpeed * 0.8);
      delaySec = 60;
    } else {
      level = "low";
      speed = c.freeFlowSpeed;
      delaySec = 0;
    }

    const color = level === "heavy" ? "#ef4444" : level === "moderate" ? "#f59e0b" : "#10b981";
    result[c.id] = { id: c.id, name: c.name, level, speedKmH: speed, delaySec, color };
  }
  return result;
}

async function handleTrafficApi(request: Request, env: unknown): Promise<Response> {
  const url = new URL(request.url);
  const hourParam = parseFloat(url.searchParams.get("hour") ?? "14.5");
  const envObj = (env as Record<string, string>) || {};
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || envObj.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ corridors: getSimulatedTraffic(hourParam), source: "ist_model" }), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
    });
  }

  try {
    const results: Record<string, any> = {};
    for (const c of CORRIDORS) {
      const gUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${c.origin}&destination=${c.destination}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
      const res = await fetch(gUrl);
      const data = await res.json();

      if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        const normalDuration = leg.duration.value;
        const inTrafficDuration = leg.duration_in_traffic ? leg.duration_in_traffic.value : normalDuration;
        const ratio = inTrafficDuration / (normalDuration || 1);
        const distanceKm = leg.distance.value / 1000.0;
        const speedKmH = Math.round(distanceKm / (inTrafficDuration / 3600.0));
        const delaySec = Math.max(0, inTrafficDuration - normalDuration);

        let level = "low";
        if (ratio > 1.45) level = "heavy";
        else if (ratio > 1.15) level = "moderate";

        const color = level === "heavy" ? "#ef4444" : level === "moderate" ? "#f59e0b" : "#10b981";
        results[c.id] = { id: c.id, name: c.name, level, speedKmH, delaySec, color };
      }
    }

    if (Object.keys(results).length > 0) {
      return new Response(JSON.stringify({ corridors: results, source: "google_api" }), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
      });
    }
  } catch (err) {
    console.warn("Server Google Maps query error:", err);
  }

  return new Response(JSON.stringify({ corridors: getSimulatedTraffic(hourParam), source: "ist_model" }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Hosting compresses every response at the edge. Never compress a body (gzip, brotli,
// CompressionStream) or set content-encoding here or in a server route: the body gets encoded
// twice and renders garbled.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname === "/api/traffic") {
      return await handleTrafficApi(request, env);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
