import AsyncStorage from "@react-native-async-storage/async-storage";

import { shareUrlForRoute } from "./links";

export type SavedPlanKind = "itinerary" | "neighborhood";

export type SavedPlan = {
  id: string;
  kind: SavedPlanKind;
  title: string;
  subtitle: string;
  city: string;
  route: string;
  summary?: string;
  createdAt: string;
};

const STORAGE_KEY = "@inmycity/saved_plans";

function sortPlans(plans: SavedPlan[]) {
  return [...plans].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getSavedPlans(): Promise<SavedPlan[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortPlans(parsed as SavedPlan[]) : [];
  } catch {
    return [];
  }
}

async function writeSavedPlans(plans: SavedPlan[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortPlans(plans)));
}

export async function isPlanSaved(id: string): Promise<boolean> {
  const plans = await getSavedPlans();
  return plans.some((plan) => plan.id === id);
}

export async function savePlan(plan: Omit<SavedPlan, "createdAt">): Promise<SavedPlan[]> {
  const plans = await getSavedPlans();
  const next = [
    { ...plan, createdAt: new Date().toISOString() },
    ...plans.filter((item) => item.id !== plan.id),
  ];
  await writeSavedPlans(next);
  return next;
}

export async function removeSavedPlan(id: string): Promise<SavedPlan[]> {
  const plans = await getSavedPlans();
  const next = plans.filter((plan) => plan.id !== id);
  await writeSavedPlans(next);
  return next;
}

export async function toggleSavedPlan(
  plan: Omit<SavedPlan, "createdAt">,
): Promise<{ saved: boolean; plans: SavedPlan[] }> {
  const plans = await getSavedPlans();
  const exists = plans.some((item) => item.id === plan.id);

  if (exists) {
    const next = plans.filter((item) => item.id !== plan.id);
    await writeSavedPlans(next);
    return { saved: false, plans: next };
  }

  const next = [{ ...plan, createdAt: new Date().toISOString() }, ...plans];
  await writeSavedPlans(next);
  return { saved: true, plans: next };
}

export function buildPlanShareText(
  plan: Pick<SavedPlan, "title" | "subtitle" | "city" | "summary" | "route">,
) {
  // Include a link so the recipient can open the plan, not just read about it. Omitted
  // until a public web origin is configured — see lib/links.ts.
  const url = shareUrlForRoute(plan.route);

  const parts = [
    plan.title,
    plan.subtitle,
    plan.summary,
    `Shared from inMyCity for ${plan.city}.`,
    url,
  ].filter(Boolean);

  return parts.join("\n\n");
}
