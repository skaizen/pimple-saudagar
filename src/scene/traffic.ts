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
 * Fetches live Google Maps Directions / Routes traffic data if VITE_GOOGLE_MAPS_API_KEY is configured,
 * otherwise falls back seamlessly to the live IST time-of-day traffic model.
 */
export async function fetchLiveGoogleTraffic(hourIST: number): Promise<{
  corridors: Record<string, TrafficCorridor>;
  source: "google_api" | "ist_model";
}> {
  const apiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return {
      corridors: getSimulatedGoogleTraffic(hourIST),
      source: "ist_model",
    };
  }

  try {
    const results: Record<string, TrafficCorridor> = {};

    for (const c of CORRIDORS_DEF) {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${c.origin}&destination=${c.destination}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        const normalDuration = leg.duration.value; // seconds
        const inTrafficDuration = leg.duration_in_traffic ? leg.duration_in_traffic.value : normalDuration;
        const ratio = inTrafficDuration / (normalDuration || 1);
        const distanceKm = leg.distance.value / 1000.0;
        const speedKmH = Math.round(distanceKm / (inTrafficDuration / 3600.0));
        const delaySec = Math.max(0, inTrafficDuration - normalDuration);

        let level: CongestionLevel = "low";
        if (ratio > 1.45) level = "heavy";
        else if (ratio > 1.15) level = "moderate";

        const color = level === "heavy" ? "#ef4444" : level === "moderate" ? "#f59e0b" : "#10b981";

        results[c.id] = {
          id: c.id,
          name: c.name,
          level,
          speedKmH,
          delaySec,
          color,
        };
      }
    }

    if (Object.keys(results).length > 0) {
      return { corridors: results, source: "google_api" };
    }
  } catch (err) {
    console.warn("Google Maps API query failed, falling back to IST traffic model", err);
  }

  return {
    corridors: getSimulatedGoogleTraffic(hourIST),
    source: "ist_model",
  };
}

