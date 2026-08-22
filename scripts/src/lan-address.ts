import { networkInterfaces } from "node:os";

/**
 * Prints this machine's LAN IPv4 address.
 *
 * Needed to run the app on a real phone: Expo Go and the API both have to be reachable from
 * another device, and `localhost` on the phone means the phone itself. Used by
 * `pnpm run dev:app:lan` and `dev:api:lan` so the address never has to be hard-coded — it
 * changes whenever the router hands out a new lease.
 */
export function lanAddress(): string | null {
  const interfaces = networkInterfaces();

  // Prefer real Wi-Fi/Ethernet adapters over virtual ones (Docker, VPNs, VMs), which
  // otherwise win and hand out an address the phone cannot route to.
  const preferred = ["en0", "en1", "eth0", "wlan0", "Wi-Fi", "Ethernet"];
  const names = [
    ...preferred.filter((name) => name in interfaces),
    ...Object.keys(interfaces).filter((name) => !preferred.includes(name)),
  ];

  for (const name of names) {
    if (/^(lo|docker|br-|veth|utun|awdl|llw|bridge|vnic|vmnet)/i.test(name)) continue;

    for (const entry of interfaces[name] ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      // Link-local addresses are not routable for this purpose.
      if (entry.address.startsWith("169.254.")) continue;
      return entry.address;
    }
  }

  return null;
}

const address = lanAddress();

if (!address) {
  console.error(
    "Could not find a LAN address. Connect this machine to Wi-Fi, or use a tunnel instead.",
  );
  process.exit(1);
}

process.stdout.write(address);
