const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function test() {
  console.log('Testing remote Supabase project:', url);
  
  // 1. Check readers
  try {
    const res = await fetch(`${url}/rest/v1/readers?select=id,name`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('GET /readers status:', res.status, res.statusText);
    const body = await res.json();
    console.log('Total readers currently in remote DB:', Array.isArray(body) ? body.length : body);
    if (Array.isArray(body) && body.length > 0) {
      console.log('Sample remote reader:', body[0]);
    }
  } catch (e) {
    console.error('Error querying readers:', e.message);
  }

  // 2. Check daily_reports
  try {
    const res = await fetch(`${url}/rest/v1/daily_reports?select=id&limit=5`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('GET /daily_reports status:', res.status, res.statusText);
    const body = await res.json();
    console.log('daily_reports currently in remote DB:', body);
  } catch (e) {
    console.error('Error querying daily_reports:', e.message);
  }

  // 3. Check photo_records
  try {
    const res = await fetch(`${url}/rest/v1/photo_records?select=id&limit=5`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('GET /photo_records status:', res.status, res.statusText);
    const body = await res.json();
    console.log('photo_records currently in remote DB:', body);
  } catch (e) {
    console.error('Error querying photo_records:', e.message);
  }

  // 4. Check get_current_bogota_date RPC
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_current_bogota_date`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('POST /rpc/get_current_bogota_date status:', res.status, res.statusText);
    const body = await res.text();
    console.log('RPC response:', body);
  } catch (e) {
    console.error('Error calling RPC:', e.message);
  }
}

test();
