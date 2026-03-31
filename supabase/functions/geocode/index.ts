import "@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { addresses } = await req.json()
    if (!addresses || !Array.isArray(addresses)) {
      throw new Error('addresses array is required')
    }

    const results = [];
    
    // Process sequentially to respect OpenStreetMap's 1 request/sec limit
    for (const item of addresses) {
      if (item.lat && item.lng) {
        results.push(item);
        continue;
      }

      const query = item.addressQuery || item.endereco_completo;
      if (!query) {
        results.push(item);
        continue;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
        const res = await fetch(url, {
          headers: { 
            'User-Agent': 'TanamaoDeliveryApp/1.0 (test-environment)' 
          }
        });
        
        // Handle rate limits or HTML responses safely
        if (!res.ok) {
           results.push({ ...item, error: `HTTP ${res.status}` });
        } else {
           const data = await res.json();
           if (Array.isArray(data) && data.length > 0) {
             results.push({ ...item, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
           } else {
             console.warn(`Geocode failed for ${query}: Not found`);
             results.push({ ...item, error: 'NOT_FOUND' });
           }
        }
      } catch (e: any) {
        results.push({ ...item, error: e.message });
      }

      // Nominatim Free Usage Policy: Absolute maximum of 1 request per second
      await new Promise(r => setTimeout(r, 1100));
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/geocode' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
