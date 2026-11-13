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
  { id: "brts", name: "Nashik Phata – Wakad BRTS", origin: [18.5970, 73.7850], destination: [18.5990, 73.8080], freeFlowSpeed: 50 },
  { id: "kunal", name: "Kunal Icon Road", origin: [18.6040, 73.7920], destination: [18.5980, 73.7960], freeFlowSpeed: 38 },
  { id: "shivar", name: "Shivar Road / Govind Garden", origin: [18.5990, 73.7940], destination: [18.5950, 73.8010], freeFlowSpeed: 35 },
  { id: "rahatani", name: "Rahatani Link Road", origin: [18.6080, 73.7900], destination: [18.6020, 73.8050], freeFlowSpeed: 40 },
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
    const rUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

    for (const c of CORRIDORS) {
      const payload = {
        origin: { location: { latLng: { latitude: c.origin[0], longitude: c.origin[1] } } },
        destination: { location: { latLng: { latitude: c.destination[0], longitude: c.destination[1] } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      };

      const res = await fetch(rUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.routes?.[0]) {
        const route = data.routes[0];
        const inTrafficSec = parseInt(route.duration?.replace("s", "") ?? "0", 10) || 1;
        const normalSec = parseInt(route.staticDuration?.replace("s", "") ?? `${inTrafficSec}`, 10) || inTrafficSec;
        const distanceMeters = route.distanceMeters ?? 2000;
        const ratio = inTrafficSec / (normalSec || 1);
        const distanceKm = distanceMeters / 1000.0;
        const speedKmH = Math.max(5, Math.min(80, Math.round(distanceKm / (inTrafficSec / 3600.0))));
        const delaySec = Math.max(0, inTrafficSec - normalSec);

        let level = "low";
        if (ratio > 1.4) level = "heavy";
        else if (ratio > 1.15) level = "moderate";

        const color = level === "heavy" ? "#ef4444" : level === "moderate" ? "#f59e0b" : "#10b981";
        results[c.id] = { id: c.id, name: c.name, level, speedKmH, delaySec, color };
      } else {
        (results as any)._error = data.error?.message || JSON.stringify(data);
      }
    }

    if (results.brts || results.kunal || results.shivar || results.rahatani) {
      // Clean internal debug keys
      delete (results as any)._error;
      return new Response(JSON.stringify({ corridors: results, source: "google_api" }), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
      });
    }

    // If Google returned error
    return new Response(
      JSON.stringify({
        corridors: getSimulatedTraffic(hourParam),
        source: "ist_model",
        google_error: (results as any)._error,
      }),
      {
        headers: { "content-type": "application/json", "cache-control": "no-cache" },
      }
    );
  } catch (err: any) {
    console.warn("Server Google Routes API error:", err);
    return new Response(
      JSON.stringify({
        corridors: getSimulatedTraffic(hourParam),
        source: "ist_model",
        error: String(err?.message || err),
      }),
      {
        headers: { "content-type": "application/json", "cache-control": "no-cache" },
      }
    );
  }
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
