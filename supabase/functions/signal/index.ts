import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.3.1/mod.ts";

const supabase = createClient(
  Deno.env.get("SB_URL")!,
  Deno.env.get("SB_ANON_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  },
);

serve(async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (req.method === "POST" && pathname === "/offer") {
    const { callId, offer } = await req.json();
    const { data, error } = await supabase
      .from("calls")
      .insert([{ callId, offer }]);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }

  if (req.method === "POST" && pathname === "/answer") {
    const { callId, answer } = await req.json();
    const { data, error } = await supabase
      .from("calls")
      .update({ answer })
      .eq("callId", callId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }

  if (req.method === "GET" && pathname.startsWith("/offer/")) {
    const callId = pathname.split("/")[2];
    const { data, error } = await supabase
      .from("calls")
      .select("offer")
      .eq("callId", callId)
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }

  if (req.method === "GET" && pathname.startsWith("/answer/")) {
    const callId = pathname.split("/")[2];
    const { data, error } = await supabase
      .from("calls")
      .select("answer")
      .eq("callId", callId)
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
});
