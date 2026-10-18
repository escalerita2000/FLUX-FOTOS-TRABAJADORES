import { createClient } from '@supabase/supabase-js';

const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function testServices() {
  const supabase = createClient(url, key);

  console.log('Logging in as test user...');
  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'test.temp.uploader.gmail.1786490400925@gmail.com',
    password: 'TestPassword123!'
  });
  if (loginErr) throw loginErr;
  console.log('Logged in as:', session.user.email);

  // Test querying photo_records WITHOUT embedding supervisor_emails
  console.log('\n--- Querying photo_records without supervisor view ---');
  const { data: photos, error: pErr } = await supabase
    .from('photo_records')
    .select('*, reader:readers!reader_id(*), supported_reader:readers!supported_reader_id(id, name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (pErr) {
    console.error('Photo query failed:', pErr);
  } else {
    console.log(`Successfully fetched ${photos.length} records!`);
    console.log('Sample record:');
    console.log({
      id: photos[0].id,
      reader: photos[0].reader?.name,
      date: photos[0].capture_date,
      type: photos[0].photo_type,
      storage_path: photos[0].storage_path,
      uploaded_by: photos[0].uploaded_by
    });
  }

  // Test daily reports
  console.log('\n--- Querying daily_reports ---');
  const { data: reports, error: repErr } = await supabase
    .from('daily_reports')
    .select('*')
    .limit(5);
  console.log(`Successfully fetched ${reports.length} daily reports!`);

  // Test signed URL generation for the first photo
  if (photos && photos.length > 0) {
    console.log('\n--- Testing Signed URL generation ---');
    const { data: signedData, error: sErr } = await supabase.storage
      .from('lectores-fotos')
      .createSignedUrl(photos[0].storage_path, 300);
    if (sErr) {
      console.error('Signed URL error:', sErr);
    } else {
      console.log('Signed URL generated successfully!');
      console.log('Signed URL:', signedData.signedUrl.substring(0, 100) + '...');
      // Test fetching the image
      const imgRes = await fetch(signedData.signedUrl);
      console.log('Image download test status:', imgRes.status, imgRes.statusText, 'Content-Length:', imgRes.headers.get('content-length'));
    }
  }
}

testServices().catch(console.error);
