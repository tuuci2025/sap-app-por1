import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const POR1_PROXY_URL = Deno.env.get("POR1_PROXY_URL");
  console.log("POR1_PROXY_URL raw value:", JSON.stringify(POR1_PROXY_URL));
  
  if (!POR1_PROXY_URL) {
    return new Response(
      JSON.stringify({ error: "POR1_PROXY_URL is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Ensure the URL has a protocol
  const baseUrl = POR1_PROXY_URL.startsWith("http") ? POR1_PROXY_URL : `http://${POR1_PROXY_URL}`;
  console.log("Using baseUrl:", baseUrl);

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/api/por1/open-rows";

    const targetUrl = `${baseUrl}${path}`;
    console.log("Fetching targetUrl:", targetUrl);

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
    };

    if (req.method === "POST") {
      fetchOptions.body = await req.text();
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Proxy error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
