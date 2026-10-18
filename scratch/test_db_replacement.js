import { createClient } from '@supabase/supabase-js';

const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function testAll() {
  const supabase = createClient(url, key);
  await supabase.auth.signInWithPassword({
    email: 'test.temp.uploader.gmail.1786490400925@gmail.com',
    password: 'TestPassword123!'
  });

  console.log('Testing getDailyStatus for 2026-09-26...');
  // Simulating getDailyStatus
  const { data: readers } = await supabase.from('readers').select('id, name, created_at').order('name');
  const { data: reports } = await supabase.from('daily_reports').select('*').eq('report_date', '2026-09-26');
  const { data: records, error } = await supabase
    .from('photo_records')
    .select('*, supported_reader:readers!supported_reader_id(id, name)')
    .eq('capture_date', '2026-09-26');

  if (error) throw error;
  console.log(`Success! Readers: ${readers.length}, Reports: ${reports.length}, Photos: ${records.length}`);

  // Simulating getHistory for all records
  console.log('Testing getHistory for last 5 records...');
  const { data: histRecords, error: histError } = await supabase
    .from('photo_records')
    .select('*, reader:readers!reader_id(*), supported_reader:readers!supported_reader_id(id, name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (histError) throw histError;
  console.log(`Success! History fetched: ${histRecords.length}`);
  console.log('First history record:');
  console.log({
    id: histRecords[0].id,
    reader: histRecords[0].reader.name,
    date: histRecords[0].capture_date,
    type: histRecords[0].photo_type,
    path: histRecords[0].storage_path
  });
}

testAll().catch(console.error);
