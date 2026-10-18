import fs from 'fs';
import readline from 'readline';

const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';

async function extractSql() {
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inTargetBlock = false;
  let targetLines = [];
  const extracted = [];

  for await (const line of rl) {
    // Detect start of DDL blocks of interest
    if (
      line.includes('public.readers') ||
      line.includes('public.daily_reports') ||
      line.includes('public.photo_records') ||
      line.includes('public.supervisor_emails') ||
      line.includes('public.get_current_bogota_date') ||
      line.includes('storage.objects') ||
      line.includes('storage.buckets')
    ) {
      extracted.push(line);
    }
  }

  console.log(`Found ${extracted.length} relevant lines.`);
  fs.writeFileSync('d:\\FLUX-FOTOS-TRABAJADORES\\scratch\\extracted_summary.txt', extracted.join('\n'));
}

extractSql().catch(console.error);
