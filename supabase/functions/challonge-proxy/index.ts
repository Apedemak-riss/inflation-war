import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    // 1.5. Manually verify JWT to secure the proxy (since API Gateway verify_jwt has issues)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user session' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
        const apiKeyRaw = Deno.env.get('CHALLONGE_API_KEY');
        const apiKey = apiKeyRaw ? apiKeyRaw.trim() : null;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Missing CHALLONGE_API_KEY secret in Supabase' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // We receive the raw endpoint path from the client e.g. "/tournaments/123/matches"
        // By default, route to v2.1. If the path explicitly calls /v1/, route cleanly.
        let urlString = `https://api.challonge.com/v2.1${endpoint}`;
        let fetchHeaders: Record<string, string> = {
            'Accept': 'application/json',
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/vnd.api+json' // JSON:API standard
        };

        if (endpoint.startsWith('/v1/')) {
            urlString = `https://api.challonge.com${endpoint}`;
            const rawKey = apiKey.replace('Bearer ', '').trim();
            const separator = urlString.includes('?') ? '&' : '?';
            urlString = `${urlString}${separator}api_key=${rawKey}`;
            
            fetchHeaders = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
        }

        const fetchOptions: RequestInit = {
            method,
            headers: fetchHeaders
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            // Under JSON:API, the front end now passes a stringified JSON object
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const externalResponse = await fetch(urlString, fetchOptions);
        const externalData = await externalResponse.text();

        // Supabase-js invokes swallow non-2xx body payloads by throwing generic errors.
        // We pass 422 as 200 so the frontend can read the JSON:API validation errors perfectly.
        const returnStatus = externalResponse.status === 422 ? 200 : externalResponse.status;

        return new Response(externalData, {
            status: returnStatus,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
