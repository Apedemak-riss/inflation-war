import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
};

Deno.serve(async (req: Request) => {
    // 1. Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Parse request payload
        const { endpoint, method = 'GET', body = null } = await req.json();

        if (!endpoint) {
            return new Response(JSON.stringify({ error: 'Missing endpoint parameter' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. Inject Challonge API Key from Supabase Secrets Securely
        const apiKey = Deno.env.get('CHALLONGE_API_KEY');
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Missing CHALLONGE_API_KEY secret in Supabase' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // We receive the raw endpoint path from the client e.g. "/tournaments/123/matches"
        // Ensure it doesn't already have an api key, and construct the full URL
        const urlObj = new URL(`https://api.challonge.com/v1${endpoint}.json`);
        urlObj.searchParams.set('api_key', apiKey);

        // If it's the open matches fetch, it might pass state=open etc via body or we can just pass them in the endpoint string
        // If the client passed query parameters in the endpoint string like `/matches?state=open`, the URL constructor handles it.
        // Actually, URL constructor with base `https://api.challonge.com/v1` handles `endpoint` cleanly.
        
        // 4. Execute Native Server Fetch
        const fetchHeaders: Record<string, string> = {
            'Accept': 'application/json'
        };

        const fetchOptions: RequestInit = {
            method,
            headers: fetchHeaders
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOptions.body = body;
        }

        const externalResponse = await fetch(urlObj.toString(), fetchOptions);
        const externalData = await externalResponse.text();

        return new Response(externalData, {
            status: externalResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
