// ocr-extract edge function
// Downloads document from storage, extracts text (stub / mock), stores in document_text_content.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get document record
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, file_path, file_name, file_type")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) throw new Error("Document not found");

    // Mark as processing
    await supabase.from("document_text_content").upsert({
      document_id,
      extraction_status: "processing",
      extracted_text: null,
    }, { onConflict: "document_id" });

    // Stub: in real implementation, download file and call OCR_API_KEY service
    // const ocrApiKey = Deno.env.get("OCR_API_KEY");
    const mockText = `[Extracted text from ${doc.file_name}]\n\nThis is a placeholder extraction. Integrate a real OCR service using the OCR_API_KEY environment variable to extract actual text content from ${doc.file_type} documents.`;

    // Store extracted text
    await supabase.from("document_text_content").upsert({
      document_id,
      extracted_text: mockText,
      extraction_status: "completed",
      extracted_at: new Date().toISOString(),
    }, { onConflict: "document_id" });

    return new Response(
      JSON.stringify({ success: true, document_id, chars: mockText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
