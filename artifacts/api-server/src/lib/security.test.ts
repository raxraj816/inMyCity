import test from "node:test";
import assert from "node:assert/strict";

import { isOriginAllowed } from "./security";

function withEnv(env: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("requests without an Origin are allowed", () => {
  // Native builds of the Expo app send no Origin header; blocking them would break the app.
  withEnv({ NODE_ENV: "production", CORS_ALLOWED_ORIGINS: "https://inmycity.app" }, () => {
    assert.equal(isOriginAllowed(undefined), true);
  });
});

test("production allows only configured origins", () => {
  withEnv(
    {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://inmycity.app,https://www.inmycity.app",
    },
    () => {
      assert.equal(isOriginAllowed("https://inmycity.app"), true);
      assert.equal(isOriginAllowed("https://www.inmycity.app"), true);

      // The old `origin: true` reflected any of these back with credentials enabled.
      assert.equal(isOriginAllowed("https://evil.example"), false);
      assert.equal(isOriginAllowed("http://localhost:8081"), false);
      // Suffix and prefix lookalikes must not slip through.
      assert.equal(isOriginAllowed("https://inmycity.app.evil.example"), false);
      assert.equal(isOriginAllowed("https://notinmycity.app"), false);
    },
  );
});

test("development allows local and tunnel origins", () => {
  withEnv({ NODE_ENV: "development", CORS_ALLOWED_ORIGINS: undefined }, () => {
    assert.equal(isOriginAllowed("http://localhost:8081"), true);
    assert.equal(isOriginAllowed("http://127.0.0.1:3001"), true);
    assert.equal(isOriginAllowed("http://192.168.1.42:8081"), true);
    assert.equal(isOriginAllowed("https://abc-123.ngrok-free.app"), true);

    assert.equal(isOriginAllowed("https://evil.example"), false);
  });
});

test("configured origins still apply in development", () => {
  withEnv(
    { NODE_ENV: "development", CORS_ALLOWED_ORIGINS: "https://staging.inmycity.app" },
    () => {
      assert.equal(isOriginAllowed("https://staging.inmycity.app"), true);
    },
  );
});
