import fs from 'fs';
import readline from 'readline';

const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';

async function analyze() {
  console.log('Analyzing backup file:', backupFilePath);
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentCopyTable = null;
  const tableData = {};
  const schemaDefinitions = {
    tables: [],
    views: [],
    functions: [],
    policies: []
  };

  for await (const line of rl) {
    if (line.startsWith('CREATE TABLE ')) {
      schemaDefinitions.tables.push(line);
    } else if (line.startsWith('CREATE VIEW ') || line.startsWith('CREATE OR REPLACE VIEW ')) {
      schemaDefinitions.views.push(line);
    } else if (line.startsWith('CREATE FUNCTION ') || line.startsWith('CREATE OR REPLACE FUNCTION ')) {
      schemaDefinitions.functions.push(line);
    } else if (line.startsWith('CREATE POLICY ')) {
      schemaDefinitions.policies.push(line);
    }

    if (line.startsWith('COPY ')) {
      const match = line.match(/^COPY\s+([^\s]+)\s*\((.*?)\)\s+FROM stdin;/);
      if (match) {
        currentCopyTable = match[1];
        tableData[currentCopyTable] = {
          columns: match[2].split(',').map(c => c.trim()),
          rows: []
        };
      }
      continue;
    }

    if (currentCopyTable) {
      if (line === '\\.') {
        currentCopyTable = null;
      } else {
        tableData[currentCopyTable].rows.push(line);
      }
    }
  }

  console.log('\n--- DUMP TABLES WITH DATA ---');
  for (const [table, data] of Object.entries(tableData)) {
    if (table.startsWith('public.') || table === 'auth.users' || table.startsWith('storage.')) {
      console.log(`\nTable: ${table} (${data.rows.length} rows)`);
      console.log('Columns:', data.columns);
      if (data.rows.length > 0) {
        console.log('Sample row (first):', data.rows[0]);
        if (data.rows.length > 1) {
          console.log('Sample row (last):', data.rows[data.rows.length - 1]);
        }
      }
    }
  }

  console.log('\n--- PUBLIC & STORAGE OBJECT DEFINITIONS ---');
  console.log('Tables in public:', schemaDefinitions.tables.filter(t => t.includes('public.')));
  console.log('Views in public:', schemaDefinitions.views.filter(v => v.includes('public.')));
  console.log('Functions in public:', schemaDefinitions.functions.filter(f => f.includes('public.') || !f.includes('.')));
  console.log('Policies for public & storage:');
  schemaDefinitions.policies.filter(p => p.includes('public.') || p.includes('storage.') || p.includes('readers') || p.includes('photo_records') || p.includes('daily_reports') || p.includes('objects'))
    .forEach(p => console.log('  ', p));
}

analyze().catch(console.error);
