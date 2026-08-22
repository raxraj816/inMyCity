/**
 * Web build of MapPreview.
 *
 * `react-native-maps` has no web implementation, so Metro resolves this file for
 * `platform=web` and the native module never reaches the web bundle. The detail screens keep
 * their Directions action, which opens Google Maps in a new tab, so nothing is lost — there
 * is simply no inline map on web.
 */
export function MapPreview(_props: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  delta?: number;
}) {
  return null;
}
