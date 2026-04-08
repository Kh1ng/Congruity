import { describe, expect, it } from "vitest";
import {
  buildDirectServer,
  isDirectServerId,
  parseDirectConnectInput,
  toSocketUrl,
} from "./directConnect";

describe("directConnect", () => {
  it("converts http/https URLs to ws/wss signaling URLs", () => {
    expect(toSocketUrl("http://localhost:3001")).toBe("ws://localhost:3001");
    expect(toSocketUrl("https://example.com")).toBe("wss://example.com");
    expect(toSocketUrl("ws://localhost:3001")).toBe("ws://localhost:3001");
  });

  it("builds a direct pseudo-server with a default voice channel", () => {
    const server = buildDirectServer({ signalingUrl: "ws://127.0.0.1:3001" });
    expect(server.isDirect).toBe(true);
    expect(isDirectServerId(server.id)).toBe(true);
    expect(server.directConfig.signaling_url).toBe("ws://127.0.0.1:3001");
    expect(server.directConfig.channels).toHaveLength(1);
    expect(server.directConfig.channels[0].type).toBe("voice");
  });

  it("parses congruity direct join links", () => {
    const server = parseDirectConnectInput(
      "congruity://join?signal=ws://10.0.0.5:3001&name=LAN%20Server"
    );
    expect(server.name).toBe("LAN Server");
    expect(server.directConfig.signaling_url).toBe("ws://10.0.0.5:3001");
  });
});
