import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  try {
    const { url, branch } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({
        error: 'URL is required'
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const response = await fetch(`${url}/archive/refs/heads/${branch || 'main'}.zip`);
    if (!response.ok) {
      throw new Error('Failed to download the repository');
    }
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="repo.zip"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
