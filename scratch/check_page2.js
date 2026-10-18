const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function checkPage2() {
  const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.temp.uploader.gmail.1786490400925@gmail.com',
      password: 'TestPassword123!'
    })
  });
  const auth = await loginRes.json();
  const token = auth.access_token;

  const pRes = await fetch(`${url}/rest/v1/photo_records?select=id`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`,
      'Range': '1000-1035'
    }
  });
  const page2 = await pRes.json();
  console.log('Page 2 count:', page2.length);
  console.log('Content-Range:', pRes.headers.get('content-range'));
}

checkPage2().catch(console.error);
