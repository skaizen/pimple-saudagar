import type { TrafficCorridor, CongestionLevel } from "./types";

export const CORRIDORS_DEF = [
  {
    id: "brts",
    name: "Nashik Phata – Wakad BRTS",
    origin: "18.5970,73.7850",
    destination: "18.5990,73.8080",
    freeFlowSpeed: 50,
  },
  {
    id: "kunal",
    name: "Kunal Icon Road",
    origin: "18.6040,73.7920",
    destination: "18.5980,73.7960",
    freeFlowSpeed: 38,
  },
  {
    id: "shivar",
    name: "Shivar Road / Govind Garden",
    origin: "18.5990,73.7940",
    destination: "18.5950,73.8010",
    freeFlowSpeed: 35,
  },
  {
    id: "rahatani",
    name: "Rahatani Link Road",
    origin: "18.6080,73.7900",
    destination: "18.6020,73.8050",
    freeFlowSpeed: 40,
  },
];

export function getSimulatedGoogleTraffic(hourIST: number): Record<string, TrafficCorridor> {
  // Real-world Pune/PCMC traffic patterns based on IST hour:
  // Morning Rush: 08:30 - 11:00 (Heavy on BRTS & Kokane Chowk toward Hinjewadi)
  // Afternoon Lull: 12:00 - 16:30 (Free flowing)
  // Evening Rush: 17:30 - 21:00 (Heavy on Jagtap Dairy, Shivar Chowk, Kunal Icon)
  // Night: 22:00 - 07:00 (Clear)

  const isMorningPeak = hourIST >= 8.5 && hourIST <= 11.0;
  const isEveningPeak = hourIST >= 17.5 && hourIST <= 21.0;
  const isPostWorkLull = hourIST >= 21.0 && hourIST <= 22.5;

  const result: Record<string, TrafficCorridor> = {};

  for (const c of CORRIDORS_DEF) {
    let level: CongestionLevel = "low";
    let speed = c.freeFlowSpeed;
    let delaySec = 0;

    if (isEveningPeak) {
      if (c.id === "brts" || c.id === "shivar") {
        level = "heavy";
        speed = Math.round(c.freeFlowSpeed * 0.35); // Slow crawl 12-15 km/h
        delaySec = 420; // 7 min delay
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

    result[c.id] = {
      id: c.id,
      name: c.name,
      level,
      speedKmH: speed,
      delaySec,
      color,
    };
  }

  return result;
}

/**
 * Fetches live Google Maps traffic data via our server-side secure proxy (/api/traffic),
 * keeping the Google Maps API key strictly confidential (visibility: secret).
 * Falls back seamlessly to the IST time-of-day traffic model if the server is offline.
 */
export async function fetchLiveGoogleTraffic(hourIST: number): Promise<{
  corridors: Record<string, TrafficCorridor>;
  source: "google_api" | "ist_model";
}> {
  try {
    const res = await fetch(`/api/traffic?hour=${encodeURIComponent(hourIST)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.corridors) {
        return data as {
          corridors: Record<string, TrafficCorridor>;
          source: "google_api" | "ist_model";
        };
      }
    }
  } catch (err) {
    console.warn("Server traffic endpoint query failed, using local IST model", err);
  }

  return {
    corridors: getSimulatedGoogleTraffic(hourIST),
    source: "ist_model",
  };
}

