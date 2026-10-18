import fs from 'fs';
import readline from 'readline';

const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function compareRecords() {
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

  // Fetch count of reports and sample IDs
  const repRes = await fetch(`${url}/rest/v1/daily_reports?select=id&limit=1000`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${token}` }
  });
  const remoteReports = await repRes.json();

  // Fetch count of photos and sample IDs
  const pRes = await fetch(`${url}/rest/v1/photo_records?select=id&limit=2000`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${token}` }
  });
  const remotePhotos = await pRes.json();

  // Parse dump
  const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let mode = null;
  const dumpReportIds = new Set();
  const dumpPhotoIds = new Set();

  for await (const line of rl) {
    if (line.startsWith('COPY public.daily_reports ')) {
      mode = 'reports';
      continue;
    }
    if (line.startsWith('COPY public.photo_records ')) {
      mode = 'photos';
      continue;
    }
    if (line === '\\.') {
      mode = null;
      continue;
    }

    if (mode === 'reports') {
      const id = line.split('\t')[0];
      dumpReportIds.add(id);
    } else if (mode === 'photos') {
      const id = line.split('\t')[0];
      dumpPhotoIds.add(id);
    }
  }

  console.log(`Daily Reports: Dump has ${dumpReportIds.size}, Remote has ${remoteReports.length}`);
  const missingReports = [...dumpReportIds].filter(id => !remoteReports.some(r => r.id === id));
  console.log('Missing daily reports in remote:', missingReports.length);

  console.log(`Photo Records: Dump has ${dumpPhotoIds.size}, Remote has ${remotePhotos.length}`);
  const missingPhotos = [...dumpPhotoIds].filter(id => !remotePhotos.some(p => p.id === id));
  console.log('Missing photo records in remote:', missingPhotos.length);
}

compareRecords().catch(console.error);
