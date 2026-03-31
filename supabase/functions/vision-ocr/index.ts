import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image base64 provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const API_KEY = (globalThis as any).Deno.env.get('GOOGLE_API_KEY')
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'A chave da API do Google não está configurada no Supabase Secrets (GOOGLE_API_KEY)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Call Google Cloud Vision API
    const googleResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
              },
            ],
          },
        ],
      }),
    })

    const data = await googleResponse.json()

    if (!googleResponse.ok) {
      console.error('Google Vision API Error:', data)
      throw new Error(`Google Vision API failed: ${data.error?.message || 'Unknown error'}`)
    }

    // Get the full text extracted
    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || ''

    return new Response(JSON.stringify({ text: fullText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
