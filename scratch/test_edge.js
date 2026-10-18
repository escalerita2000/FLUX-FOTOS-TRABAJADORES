const url = 'https://umhexyqukxgnbztlbqbc.supabase.co/functions/v1/upload-photo';

async function testEdge() {
  console.log('Testing Edge Function endpoint:', url);
  try {
    const res = await fetch(url, {
      method: 'OPTIONS'
    });
    console.log('OPTIONS status:', res.status, res.statusText);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Edge Function fetch error:', err);
  }
}

testEdge();
