import fs from 'fs';
import readline from 'readline';

const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';

async function auditDump() {
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const inventory = {
    tables: [],
    primaryKeys: [],
    foreignKeys: [],
    checkConstraints: [],
    uniqueConstraints: [],
    indexes: [],
    views: [],
    functions: [],
    triggers: [],
    rlsStatus: [],
    policies: [],
    grants: []
  };

  let capture = false;
  let currentHeader = '';
  let currentLines = [];

  for await (const line of rl) {
    if (line.startsWith('-- Name: ') && line.includes('Schema: public')) {
      currentHeader = line;
      currentLines = [];
      capture = true;
      continue;
    } else if (line.startsWith('-- Name: ') && line.includes('Schema: storage') && (line.includes('lectores-fotos') || line.includes('objects') || line.includes('buckets'))) {
      currentHeader = line;
      currentLines = [];
      capture = true;
      continue;
    } else if (line.startsWith('-- Name: ') && capture) {
      // Flush previous
      processBlock(currentHeader, currentLines, inventory);
      capture = false;
      currentHeader = '';
      currentLines = [];
    }

    if (capture) {
      if (line.startsWith('COPY ')) {
        capture = false;
      } else {
        currentLines.push(line);
      }
    }
  }

  if (capture) {
    processBlock(currentHeader, currentLines, inventory);
  }

  console.log('\n================ COMPLETE AUDIT OF DUMP OBJECTS ================');
  console.log('1. TABLES (public):', inventory.tables);
  console.log('\n2. PRIMARY KEYS:', inventory.primaryKeys);
  console.log('\n3. FOREIGN KEYS:', inventory.foreignKeys);
  console.log('\n4. UNIQUE CONSTRAINTS & INDEXES:');
  inventory.uniqueConstraints.forEach(c => console.log('  Constraint:', c));
  inventory.indexes.forEach(i => console.log('  Index:', i));
  console.log('\n5. CHECK CONSTRAINTS:', inventory.checkConstraints);
  console.log('\n6. VIEWS:', inventory.views);
  console.log('\n7. FUNCTIONS:', inventory.functions);
  console.log('\n8. TRIGGERS:', inventory.triggers);
  console.log('\n9. RLS STATUS:', inventory.rlsStatus);
  console.log('\n10. POLICIES:');
  inventory.policies.forEach(p => console.log(`  [${p.schema}.${p.table}] "${p.name}" (${p.command}): ${p.definition}`));
  console.log('\n11. GRANTS (ACLs):');
  inventory.grants.forEach(g => console.log('  ', g));
}

function processBlock(header, lines, inv) {
  const text = lines.join('\n').trim();
  if (!text) return;

  if (header.includes('Type: TABLE;')) {
    const match = header.match(/-- Name: ([^;]+);/);
    if (match) inv.tables.push(match[1].trim());
  } else if (header.includes('Type: CONSTRAINT;')) {
    if (text.includes('PRIMARY KEY')) {
      inv.primaryKeys.push(text);
    } else if (text.includes('UNIQUE')) {
      inv.uniqueConstraints.push(text);
    } else if (text.includes('CHECK')) {
      inv.checkConstraints.push(text);
    }
  } else if (header.includes('Type: FK CONSTRAINT;')) {
    inv.foreignKeys.push(text);
  } else if (header.includes('Type: INDEX;')) {
    inv.indexes.push(text);
  } else if (header.includes('Type: VIEW;')) {
    inv.views.push(text);
  } else if (header.includes('Type: FUNCTION;')) {
    inv.functions.push(text);
  } else if (header.includes('Type: TRIGGER;')) {
    inv.triggers.push(text);
  } else if (header.includes('Type: ROW SECURITY;')) {
    inv.rlsStatus.push(text);
  } else if (header.includes('Type: POLICY;')) {
    const match = header.match(/-- Name: ([^\s]+)\s+([^;]+); Type: POLICY; Schema: ([^;]+);/);
    inv.policies.push({
      table: match ? match[1].trim() : '',
      name: match ? match[2].trim() : '',
      schema: match ? match[3].trim() : '',
      definition: text
    });
  } else if (header.includes('Type: ACL;')) {
    inv.grants.push(text);
  }
}

auditDump().catch(console.error);
