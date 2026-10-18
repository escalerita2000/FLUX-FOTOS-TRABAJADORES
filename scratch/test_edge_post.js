const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';

async function testEdgeAuth() {
  const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.temp.uploader.gmail.1786490400925@gmail.com',
      password: 'TestPassword123!'
    })
  });
  const auth = await loginRes.json();
  const token = auth.access_token;

  console.log('Testing Edge Function with Bearer token (empty form)...');
  const res = await fetch(`${url}/functions/v1/upload-photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: new FormData()
  });

  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Response:', data);
}

testEdgeAuth().catch(console.error);
