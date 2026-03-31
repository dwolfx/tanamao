const url = 'https://bieixouswzpcnebkhcjr.supabase.co/functions/v1/vision-ocr';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWl4b3Vzd3pwY25lYmtoY2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTMxNjksImV4cCI6MjA5MDQ4OTE2OX0.yPQLiZ6bvBwzNyWiksiYCtfEv1qggdp_vH5_oEmCtVc';

async function test() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anon}`
    },
    body: JSON.stringify({ imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' })
  });

  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("BODY:", text);
}

test();
