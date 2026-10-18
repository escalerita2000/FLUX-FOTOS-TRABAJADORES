const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function checkCounts() {
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

  // Count readers
  const rRes = await fetch(`${url}/rest/v1/readers?select=id`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'count=exact',
      'Range': '0-0'
    }
  });
  console.log('Remote readers count:', rRes.headers.get('content-range'));

  // Count daily_reports
  const repRes = await fetch(`${url}/rest/v1/daily_reports?select=id`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'count=exact',
      'Range': '0-0'
    }
  });
  console.log('Remote daily_reports count:', repRes.headers.get('content-range'));

  // Count photo_records
  const pRes = await fetch(`${url}/rest/v1/photo_records?select=id`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'count=exact',
      'Range': '0-0'
    }
  });
  console.log('Remote photo_records count:', pRes.headers.get('content-range'));

  // Check supervisor_emails view
  const sRes = await fetch(`${url}/rest/v1/supervisor_emails?select=*`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`
    }
  });
  const supervisors = await sRes.json();
  console.log('Remote supervisor_emails view:', supervisors);

  // Check storage list
  const stRes = await fetch(`${url}/storage/v1/object/list/lectores-fotos`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix: 'readers',
      limit: 10
    })
  });
  console.log('Storage list status:', stRes.status, stRes.statusText);
  const stData = await stRes.json();
  console.log('Storage objects sample:', stData);
}

checkCounts().catch(console.error);
