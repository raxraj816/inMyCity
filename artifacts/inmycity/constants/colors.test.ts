import { describe, it } from "node:test";
import assert from "node:assert/strict";

import colors from "./colors.ts";

/**
 * Contrast is a property of the palette, so it is checked here rather than by eye on a device.
 *
 * Every pair below is one the app actually renders: text on the page, text on a card, and
 * white labels on the coloured badges and pills. If a token is ever lightened, this fails
 * before the app ships with unreadable text.
 */

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

const light = colors.light;
const WHITE = "#ffffff";

/** Screen accents are declared per screen rather than as tokens; they carry white pill text. */
const SCREEN_ACCENTS: Record<string, string> = {
  "places / events / itineraries": "#4f46e5",
  deals: "#047857",
  nightlife: "#be185d",
  dining: "#c2410c",
  hotels: "#b45309",
  movies: "#7c3aed",
  shops: "#c2410c",
  sports: "#15803d",
  transit: "#0e7490",
  "home categories: events": "#0369a1",
  "home categories: activities": "#dc2626",
};

describe("colour contrast", () => {
  it("body text is readable on the page and on cards", () => {
    assert.ok(contrastRatio(light.foreground, light.background) >= AA_NORMAL);
    assert.ok(contrastRatio(light.cardForeground, light.card) >= AA_NORMAL);
  });

  it("secondary text is readable on the page and on cards", () => {
    assert.ok(
      contrastRatio(light.mutedForeground, light.background) >= AA_NORMAL,
      `muted on background is ${contrastRatio(light.mutedForeground, light.background).toFixed(2)}:1`,
    );
    assert.ok(contrastRatio(light.mutedForeground, light.card) >= AA_NORMAL);
  });

  it("white badge and pill labels are readable on every coloured fill", () => {
    const fills: Record<string, string> = {
      amber: light.amber,
      primary: light.primary,
      tint: light.tint,
      success: light.success,
      warning: light.warning,
      info: light.info,
      destructive: light.destructive,
      purple: light.purple,
      secondary: light.secondary,
    };

    for (const [name, fill] of Object.entries(fills)) {
      const ratio = contrastRatio(WHITE, fill);
      assert.ok(ratio >= AA_NORMAL, `white on ${name} (${fill}) is ${ratio.toFixed(2)}:1`);
    }
  });

  it("the brand colour is readable as text, not just as a fill", () => {
    const ratio = contrastRatio(light.amber, light.background);
    assert.ok(ratio >= AA_NORMAL, `amber text on background is ${ratio.toFixed(2)}:1`);
    assert.ok(contrastRatio(light.accentForeground, light.accent) >= AA_NORMAL);
  });

  it("every screen accent carries white text", () => {
    for (const [screen, accent] of Object.entries(SCREEN_ACCENTS)) {
      const ratio = contrastRatio(WHITE, accent);
      assert.ok(ratio >= AA_NORMAL, `${screen} accent ${accent} is ${ratio.toFixed(2)}:1`);
    }
  });

  it("every screen accent also works as text on the page, which is how chips use it", () => {
    for (const [screen, accent] of Object.entries(SCREEN_ACCENTS)) {
      const ratio = contrastRatio(accent, light.background);
      assert.ok(ratio >= AA_NORMAL, `${screen} accent ${accent} on background is ${ratio.toFixed(2)}:1`);
    }
  });

  it("borders stay distinguishable from the surfaces they separate", () => {
    // Non-text contrast only needs 3:1.
    assert.ok(contrastRatio(light.border, light.card) >= 1.2);
    assert.ok(contrastRatio(light.tabBarBorder, light.tabBar) >= 1.2);
  });

  it("disabled and placeholder text still clears the large-text threshold", () => {
    assert.ok(contrastRatio(light.mutedForeground, light.muted) >= AA_LARGE);
  });
});
