/**
 * Design tokens.
 *
 * Every colour that carries text — either as the text itself on the page background, or as a
 * fill with white text on top — meets WCAG AA (4.5:1). Several of these used to sit between
 * 2.1:1 and 4.0:1: white on the brand orange was 2.80:1, white on the "Open" green 2.28:1.
 * The hues are unchanged; the shades are one or two steps deeper, which is what buys the
 * contrast. `constants/colors.test.ts` asserts every pair the app actually renders, so a
 * lighter shade cannot creep back in unnoticed.
 *
 * The `…Light` tokens are backgrounds only — never put white text on one.
 */
const colors = {
  light: {
    text: "#0f172a",
    tint: "#c2410c",

    background: "#f8fafc",
    foreground: "#0f172a",

    card: "#ffffff",
    cardForeground: "#0f172a",

    primary: "#c2410c",
    primaryForeground: "#ffffff",

    secondary: "#1e293b",
    secondaryForeground: "#ffffff",

    muted: "#f1f5f9",
    mutedForeground: "#64748b",

    accent: "#fff7ed",
    accentForeground: "#c2410c",

    destructive: "#dc2626",
    destructiveForeground: "#ffffff",

    border: "#e2e8f0",
    input: "#e2e8f0",

    // Extra brand tokens
    navy: "#0f172a",
    navyLight: "#1e293b",
    /** The brand orange. Carries white text on badges and pills, so it is orange-700. */
    amber: "#c2410c",
    /** Background tint only. */
    amberLight: "#fb923c",
    success: "#15803d",
    successLight: "#dcfce7",
    warning: "#b45309",
    warningLight: "#fef3c7",
    info: "#2563eb",
    infoLight: "#dbeafe",
    /** Used for the nightlife category badge, which also carries white text. */
    purple: "#9333ea",
    purpleLight: "#f3e8ff",
    overlay: "rgba(15, 23, 42, 0.6)",
    tabBar: "#ffffff",
    tabBarBorder: "#e2e8f0",
  },
  radius: 12,
};

export default colors;
