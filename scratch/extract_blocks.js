import fs from 'fs';
import readline from 'readline';

const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';

async function extractFullBlocks() {
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let capturing = false;
  let currentBlock = [];
  const blocks = [];

  for await (const line of rl) {
    if (line.startsWith('--') && line.includes('Name:')) {
      if (capturing && currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
        capturing = false;
      }
      if (
        line.includes('readers') ||
        line.includes('daily_reports') ||
        line.includes('photo_records') ||
        line.includes('supervisor_emails') ||
        line.includes('get_current_bogota_date') ||
        line.includes('objects') && line.includes('storage') ||
        line.includes('buckets') && line.includes('storage')
      ) {
        capturing = true;
      }
    }

    if (capturing) {
      // Don't capture COPY data blocks here
      if (line.startsWith('COPY ')) {
        currentBlock.push(line);
        currentBlock.push('... [COPY DATA OMITTED] ...');
        capturing = false;
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      } else {
        currentBlock.push(line);
      }
    }
  }

  if (capturing && currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }

  console.log(`Extracted ${blocks.length} definition blocks.`);
  fs.writeFileSync('d:\\FLUX-FOTOS-TRABAJADORES\\scratch\\extracted_blocks.sql', blocks.join('\n\n-- -----------------------------------------------------\n\n'));
}

extractFullBlocks().catch(console.error);
