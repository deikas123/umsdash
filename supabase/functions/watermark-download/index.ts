import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;

    const { filePath, userName, userEmail } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: 'filePath is required' }), { status: 400, headers: corsHeaders });
    }

    // Generate watermark text
    const watermarkText = `Downloaded by: ${userName || userEmail || userId} | ${new Date().toISOString().split('T')[0]}`;

    // Create a signed URL with the watermark info embedded as metadata
    // For now, return the signed URL and watermark info for client-side watermarking
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: signedData, error: signedError } = await adminClient.storage
      .from('documents')
      .createSignedUrl(filePath, 300);

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Failed to generate download URL' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Log the watermarked download
    await adminClient.from('audit_logs').insert({
      user_id: userId,
      action: 'watermarked_download',
      entity_type: 'document',
      details: { file_path: filePath, watermark: watermarkText },
    });

    return new Response(
      JSON.stringify({
        signedUrl: signedData.signedUrl,
        watermarkText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
