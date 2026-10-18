const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function testAuth() {
  console.log('Testing auth login for test user...');
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
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
    console.log('Auth status:', res.status, res.statusText);
    const body = await res.json();
    if (res.ok && body.access_token) {
      console.log('Successfully authenticated! User ID:', body.user.id);
      console.log('User email:', body.user.email);
      
      // Now query readers with this authenticated token!
      const rRes = await fetch(`${url}/rest/v1/readers?select=id,name`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${body.access_token}`
        }
      });
      const rData = await rRes.json();
      console.log('Authenticated /readers query count:', Array.isArray(rData) ? rData.length : rData);
      if (Array.isArray(rData) && rData.length > 0) {
        console.log('Sample reader:', rData[0]);
      }

      // Query daily_reports
      const repRes = await fetch(`${url}/rest/v1/daily_reports?select=id&limit=5`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${body.access_token}`
        }
      });
      const repData = await repRes.json();
      console.log('Authenticated /daily_reports query count:', Array.isArray(repData) ? repData.length : repData);

      // Query photo_records
      const pRes = await fetch(`${url}/rest/v1/photo_records?select=id&limit=5`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${body.access_token}`
        }
      });
      const pData = await pRes.json();
      console.log('Authenticated /photo_records query count:', Array.isArray(pData) ? pData.length : pData);

    } else {
      console.log('Auth failed response:', body);
    }
  } catch (err) {
    console.error('Auth error:', err);
  }
}

testAuth();
