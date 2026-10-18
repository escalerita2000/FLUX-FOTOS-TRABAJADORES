const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function testJoin() {
  const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test.temp.uploader.gmail.1786490400925@gmail.com',
      password: 'TestPassword123!'
    })
  });
  const auth = await loginRes.json();
  const token = auth.access_token;

  console.log('Testing query from db.ts: photo_records with joins...');
  const res = await fetch(`${url}/rest/v1/photo_records?select=*,reader:readers!reader_id(*),supervisor:supervisor_emails(email),supported_reader:readers!supported_reader_id(id,name)&limit=2`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Data or Error:', JSON.stringify(data, null, 2));
}

testJoin().catch(console.error);
