import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useServers } from "./useServers";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

function makeServerFetchChain(result = { data: [], error: null }) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, order };
}

describe("useServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null });
    supabase.rpc.mockReset();
    supabase.from.mockReset();
  });

  it("returns empty servers when user is not logged in", async () => {
    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.servers).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fetches servers for the authenticated user", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    const fetchChain = makeServerFetchChain({
      data: [{ id: "s1", name: "Alpha" }],
      error: null,
    });

    supabase.from.mockImplementation((table) => {
      if (table === "servers") return { select: fetchChain.select };
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result.current.servers).toEqual([{ id: "s1", name: "Alpha" }]);
    expect(result.current.error).toBe(null);
  });

  it("createServer creates server, owner membership, default channel, then refetches", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });

    let serverFetchCount = 0;
    const fetchChain = {
      order: vi.fn(() => {
        serverFetchCount += 1;
        if (serverFetchCount === 1) {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: [{ id: "s-new", name: "New Server" }], error: null });
      }),
    };
    fetchChain.eq = vi.fn(() => ({ order: fetchChain.order }));
    fetchChain.select = vi.fn(() => ({ eq: fetchChain.eq }));

    const insertServerPayloads = [];
    const insertServer = vi.fn((payload) => {
      insertServerPayloads.push(payload);
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "s-new", name: payload.name },
            error: null,
          }),
        })),
      };
    });

    const insertServerMembers = vi.fn().mockResolvedValue({ error: null });
    const insertChannels = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === "servers") {
        return { select: fetchChain.select, insert: insertServer };
      }
      if (table === "server_members") {
        return { insert: insertServerMembers };
      }
      if (table === "channels") {
        return { insert: insertChannels };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let created;
    await act(async () => {
      created = await result.current.createServer("New Server", "desc", "self_hosted");
    });

    expect(insertServerPayloads[0]).toEqual({
      name: "New Server",
      description: "desc",
      owner_id: "user-1",
      hosting_type: "self_hosted",
    });
    expect(insertServerMembers).toHaveBeenCalledWith({
      server_id: "s-new",
      user_id: "user-1",
      role: "owner",
    });
    expect(insertChannels).toHaveBeenCalledWith({
      server_id: "s-new",
      name: "general",
      type: "text",
    });
    expect(created).toEqual({ id: "s-new", name: "New Server" });
    expect(result.current.servers).toEqual([{ id: "s-new", name: "New Server" }]);
  });

  it("joinServer throws for invalid invite code", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    const fetchChain = makeServerFetchChain();
    supabase.from.mockImplementation((table) => {
      if (table === "servers") return { select: fetchChain.select };
      throw new Error(`Unexpected table ${table}`);
    });
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.joinServer("BADCODE")).rejects.toThrow("Invalid invite code");
  });

  it("joinServer inserts membership and refetches on valid invite", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });

    let serverFetchCount = 0;
    const fetchChain = {
      order: vi.fn(() => {
        serverFetchCount += 1;
        if (serverFetchCount === 1) return Promise.resolve({ data: [], error: null });
        return Promise.resolve({ data: [{ id: "s-2", name: "Joined" }], error: null });
      }),
    };
    fetchChain.eq = vi.fn(() => ({ order: fetchChain.order }));
    fetchChain.select = vi.fn(() => ({ eq: fetchChain.eq }));

    const duplicateCheckSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const duplicateCheckEqUser = vi.fn(() => ({ single: duplicateCheckSingle }));
    const duplicateCheckEqServer = vi.fn(() => ({ eq: duplicateCheckEqUser }));
    const duplicateCheckSelect = vi.fn(() => ({ eq: duplicateCheckEqServer }));

    const memberInsert = vi.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === "servers") return { select: fetchChain.select };
      if (table === "server_members") {
        return { select: duplicateCheckSelect, insert: memberInsert };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    supabase.rpc.mockResolvedValue({
      data: [{ id: "s-2", name: "Joined", invite_code: "INV123" }],
      error: null,
    });

    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let joinedServer;
    await act(async () => {
      joinedServer = await result.current.joinServer("INV123");
    });

    expect(supabase.rpc).toHaveBeenCalledWith("lookup_server_by_invite", { code: "INV123" });
    expect(memberInsert).toHaveBeenCalledWith({
      server_id: "s-2",
      user_id: "user-1",
      role: "member",
    });
    expect(joinedServer).toEqual({ id: "s-2", name: "Joined", invite_code: "INV123" });
    expect(result.current.servers).toEqual([{ id: "s-2", name: "Joined" }]);
  });

  it("joinServer throws when user is already a member", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    const fetchChain = makeServerFetchChain();
    const duplicateCheckSingle = vi.fn().mockResolvedValue({
      data: { server_id: "s-2", user_id: "user-1" },
      error: null,
    });
    const duplicateCheckEqUser = vi.fn(() => ({ single: duplicateCheckSingle }));
    const duplicateCheckEqServer = vi.fn(() => ({ eq: duplicateCheckEqUser }));
    const duplicateCheckSelect = vi.fn(() => ({ eq: duplicateCheckEqServer }));

    supabase.from.mockImplementation((table) => {
      if (table === "servers") return { select: fetchChain.select };
      if (table === "server_members") return { select: duplicateCheckSelect };
      throw new Error(`Unexpected table ${table}`);
    });
    supabase.rpc.mockResolvedValue({
      data: [{ id: "s-2", name: "Joined" }],
      error: null,
    });

    const { result } = renderHook(() => useServers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.joinServer("INV123")).rejects.toThrow(
      "Already a member of this server"
    );
  });

  it("leaveServer and deleteServer call filtered deletes then refetch", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });

    const fetchChain = makeServerFetchChain();

    const memberDeleteEqUser = vi.fn().mockResolvedValue({ error: null });
    const memberDeleteEqServer = vi.fn(() => ({ eq: memberDeleteEqUser }));
    const memberDelete = vi.fn(() => ({ eq: memberDeleteEqServer }));

    const serverDeleteEqOwner = vi.fn().mockResolvedValue({ error: null });
    const serverDeleteEqId = vi.fn(() => ({ eq: serverDeleteEqOwner }));
    const serverDelete = vi.fn(() => ({ eq: serverDeleteEqId }));

    supabase.from.mockImplementation((table) => {
      if (table === "servers") return { select: fetchChain.select, delete: serverDelete };
      if (table === "server_members") return { delete: memberDelete };
      throw new Error(`Unexpected table ${table}`);
    });

    const { result } = renderHook(() => useServers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.leaveServer("s-1");
    });
    expect(memberDeleteEqServer).toHaveBeenCalledWith("server_id", "s-1");
    expect(memberDeleteEqUser).toHaveBeenCalledWith("user_id", "user-1");

    await act(async () => {
      await result.current.deleteServer("s-1");
    });
    expect(serverDeleteEqId).toHaveBeenCalledWith("id", "s-1");
    expect(serverDeleteEqOwner).toHaveBeenCalledWith("owner_id", "user-1");
  });
});
