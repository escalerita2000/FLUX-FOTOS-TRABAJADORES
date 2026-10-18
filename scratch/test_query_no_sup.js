const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function testJoinWithoutSupervisor() {
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

  console.log('Testing query: photo_records with readers joins, but WITHOUT supervisor_emails...');
  const res = await fetch(`${url}/rest/v1/photo_records?select=*,reader:readers!reader_id(*),supported_reader:readers!supported_reader_id(id,name)&limit=2`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Result count:', Array.isArray(data) ? data.length : data);
  if (Array.isArray(data) && data.length > 0) {
    console.log('Sample record:', data[0]);
  }
}

testJoinWithoutSupervisor().catch(console.error);
