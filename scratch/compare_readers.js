import fs from 'fs';
import readline from 'readline';

const url = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const key = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function compare() {
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

  // 1. Fetch all remote readers
  const rRes = await fetch(`${url}/rest/v1/readers?select=id,name&order=name`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${token}` }
  });
  const remoteReaders = await rRes.json();

  // Parse readers from dump
  const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inReaders = false;
  const dumpReaders = [];
  for await (const line of rl) {
    if (line.startsWith('COPY public.readers ')) {
      inReaders = true;
      continue;
    }
    if (inReaders) {
      if (line === '\\.') break;
      const [id, name] = line.split('\t');
      dumpReaders.push({ id, name });
    }
  }

  console.log(`Readers in Dump: ${dumpReaders.length}, Readers in Remote DB: ${remoteReaders.length}`);
  const missingInRemote = dumpReaders.filter(d => !remoteReaders.some(r => r.id === d.id));
  console.log('Dump readers missing in Remote:', missingInRemote);
  const extraInRemote = remoteReaders.filter(r => !dumpReaders.some(d => d.id === r.id));
  console.log('Remote readers not in Dump:', extraInRemote);

  // Check matching IDs and Names
  let matchCount = 0;
  dumpReaders.forEach(d => {
    const remote = remoteReaders.find(r => r.id === d.id);
    if (remote && remote.name === d.name) matchCount++;
  });
  console.log(`Exact match count: ${matchCount} of ${dumpReaders.length}`);
}

compare().catch(console.error);
