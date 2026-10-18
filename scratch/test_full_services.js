import { createClient } from '@supabase/supabase-js';

const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function testFull() {
  const supabase = createClient(url, key);
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: 'test.temp.uploader.gmail.1786490400925@gmail.com',
    password: 'TestPassword123!'
  });

  const testDate = '2026-09-26';
  console.log(`Testing getDailyStatus for date: ${testDate}...`);

  // 1. Fetch readers
  const { data: readers } = await supabase
    .from('readers')
    .select('id, name, created_at')
    .order('name');
  console.log(`Total readers loaded: ${readers.length}`);

  // 2. Fetch daily reports
  const { data: reports } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('report_date', testDate);
  console.log(`Reports for ${testDate}: ${reports.length}`);

  // 3. Fetch photo records safely
  let records = [];
  const { data: recordsData, error: recordsError } = await supabase
    .from('photo_records')
    .select('*, supported_reader:readers!supported_reader_id(id, name)')
    .eq('capture_date', testDate);

  if (recordsError) {
    console.error('Photo records error:', recordsError);
  } else {
    records = recordsData || [];
    console.log(`Photo records for ${testDate}: ${records.length}`);
  }

  // 4. Map daily status
  const statuses = readers.map((reader) => {
    const readerRecords = records.filter(r => r.reader_id === reader.id);
    const reportForReader = reports?.find(rep => rep.reader_id === reader.id);
    const itinerary = reportForReader ? reportForReader.itinerary : null;
    const entradaRecord = readerRecords.find(r => r.photo_type === 'ENTRADA') || null;
    const salidaRecord = readerRecords.find(r => r.photo_type === 'SALIDA') || null;
    const apoyoRecords = readerRecords.filter(r => r.photo_type === 'APOYO');

    return {
      reader,
      itinerary,
      entradaRecord,
      salidaRecord,
      apoyoRecords
    };
  });

  const withEntrada = statuses.filter(s => s.entradaRecord).length;
  const withSalida = statuses.filter(s => s.salidaRecord).length;
  const withItinerary = statuses.filter(s => s.itinerary).length;
  console.log(`Date ${testDate} summary: Entradas: ${withEntrada}, Salidas: ${withSalida}, Itinerarios: ${withItinerary}`);

  // 5. Test monthly data for 2026-09
  console.log('\nTesting monthly data for 2026-09...');
  const { data: monthlyRecords } = await supabase
    .from('photo_records')
    .select('id, reader_id, capture_date, photo_type')
    .gte('capture_date', '2026-09-01')
    .lte('capture_date', '2026-09-30');
  console.log(`Monthly photo records in 2026-09: ${monthlyRecords.length}`);
  const uniqueDays = new Set(monthlyRecords.map(r => r.capture_date));
  console.log(`Days processed in 2026-09: ${uniqueDays.size} days (${Array.from(uniqueDays).sort().join(', ')})`);
}

testFull().catch(console.error);
