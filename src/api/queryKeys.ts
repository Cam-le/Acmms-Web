// src/api/queryKeys.ts
// Hierarchical query keys — single source of truth.
// Invalidating a parent invalidates all children:
//   qk.farms.all        → list + every detail
//   qk.farms.list()     → list only
//   qk.farms.detail(id) → one detail only

export const qk = {
  // ── Farms ──────────────────────────────────────────────────────────────
  farms: {
    all: ["farms"] as const,
    list: () => [...qk.farms.all, "list"] as const,
    detail: (id: string) => [...qk.farms.all, "detail", id] as const,
  },

  // ── Plots ──────────────────────────────────────────────────────────────
  plots: {
    all: ["plots"] as const,
    list: () => [...qk.plots.all, "list"] as const,
    detail: (id: string) => [...qk.plots.all, "detail", id] as const,
  },

  // ── Beds ───────────────────────────────────────────────────────────────
  beds: {
    all: ["beds"] as const,
    list: () => [...qk.beds.all, "list"] as const,
    detail: (id: string) => [...qk.beds.all, "detail", id] as const,
  },

  // ── Crops ──────────────────────────────────────────────────────────────
  crops: {
    all: ["crops"] as const,
    list: () => [...qk.crops.all, "list"] as const,
    detail: (id: string) => [...qk.crops.all, "detail", id] as const,
    stages: (cropId: string) => [...qk.crops.all, "stages", cropId] as const,
    stageTasks: (stageId: string) =>
      [...qk.crops.all, "stageTasks", stageId] as const,
  },

  // ── Soils ──────────────────────────────────────────────────────────────
  soils: {
    all: ["soils"] as const,
    list: () => [...qk.soils.all, "list"] as const,
    compatibilities: () => [...qk.soils.all, "compatibilities"] as const,
  },

  // ── Seasons ────────────────────────────────────────────────────────────
  seasons: {
    all: ["seasons"] as const,
    list: () => [...qk.seasons.all, "list"] as const,
    detail: (id: string) => [...qk.seasons.all, "detail", id] as const,
    harvests: (seasonId: string) =>
      [...qk.seasons.all, "harvests", seasonId] as const,
    harvestDetails: (harvestId: string) =>
      [...qk.seasons.all, "harvestDetails", harvestId] as const,
  },

  // ── Tasks ──────────────────────────────────────────────────────────────
  tasks: {
    all: ["tasks"] as const,
    list: () => [...qk.tasks.all, "list"] as const,
    detail: (id: string) => [...qk.tasks.all, "detail", id] as const,
  },

  // ── IoT ────────────────────────────────────────────────────────────────
  iot: {
    all: ["iot"] as const,
    devices: () => [...qk.iot.all, "devices"] as const,
    latestSensor: (deviceCode: string) =>
      [...qk.iot.all, "latestSensor", deviceCode] as const,
  },

  // ── Reports / Advisory ─────────────────────────────────────────────────
  reports: {
    all: ["reports"] as const,
    list: () => [...qk.reports.all, "list"] as const,
    detail: (id: string) => [...qk.reports.all, "detail", id] as const,
    diagnosis: (reportId: string) =>
      [...qk.reports.all, "diagnosis", reportId] as const,
  },

  // ── Staff / Workers ────────────────────────────────────────────────────
  staffs: {
    all: ["staffs"] as const,
    list: () => [...qk.staffs.all, "list"] as const,
    unassigned: () => [...qk.staffs.all, "unassigned"] as const,
    roles: () => [...qk.staffs.all, "roles"] as const,
  },

  // ── Billing ────────────────────────────────────────────────────────────
  billing: {
    all: ["billing"] as const,
    priceSettings: () => [...qk.billing.all, "priceSettings"] as const,
  },

  // ── Weather ────────────────────────────────────────────────────────────
  weather: {
    all: ["weather"] as const,
    current: (farmId: string) =>
      [...qk.weather.all, "current", farmId] as const,
    forecast: (farmId: string, days: number) =>
      [...qk.weather.all, "forecast", farmId, days] as const,
  },
} as const;
