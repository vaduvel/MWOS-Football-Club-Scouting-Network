import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

loadEnv({ path: '.env.local' });

const DEFAULT_FILE = '/Users/vaduvageorge/Downloads/MWOS%20FC%20Anthropometrics%20A-Z-1.xlsx';

function parseArgs(argv) {
  const args = {
    file: DEFAULT_FILE,
    team: 'first-team',
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--file' && argv[index + 1]) {
      args.file = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--team' && argv[index + 1]) {
      args.team = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function parseNullableNumber(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFoot(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return 'unknown';
  if (['r', 'right'].includes(normalized)) return 'right';
  if (['l', 'left'].includes(normalized)) return 'left';
  if (['r / l', 'r/l', 'l / r', 'l/r', 'both'].includes(normalized)) return 'both';
  return 'unknown';
}

function parseSourceRowNumber(value) {
  const normalized = normalizeText(value).replace(/\./g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDisplayName(firstName, lastName) {
  return [normalizeText(firstName), normalizeText(lastName)].filter(Boolean).join(' ').trim();
}

function buildImportRows(rows) {
  return rows
    .slice(2)
    .map((row) => {
      const lastName = normalizeText(row[1]);
      const firstName = normalizeText(row[2]);
      const displayName = buildDisplayName(firstName, lastName);

      if (!displayName) {
        return null;
      }

      return {
        source_row_number: parseSourceRowNumber(row[0]),
        squad_number: null,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        weight_kg: parseNullableNumber(row[3]),
        height_cm: parseNullableNumber(row[4]),
        bmi: parseNullableNumber(row[5]),
        dominant_foot: normalizeFoot(row[6]),
        nationality: normalizeText(row[7]) || null,
        primary_position: normalizeText(row[8]) || null,
        secondary_position: normalizeText(row[9]) || null,
        source_label: 'anthropometrics_seed',
        is_active: true,
        notes: null,
      };
    })
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const workbook = XLSX.readFile(args.file);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });

  const imports = buildImportRows(rows);

  const missingAnthropometrics = imports.filter(
    (row) => row.height_cm === null || row.weight_kg === null || row.bmi === null,
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: teamRow, error: teamError } = await supabase
    .from('teams')
    .select('id, slug, name')
    .eq('slug', args.team)
    .maybeSingle();

  if (teamError) {
    throw teamError;
  }

  if (!teamRow) {
    throw new Error(`Could not find team with slug "${args.team}".`);
  }

  const payload = imports.map((row) => ({
    team_id: teamRow.id,
    ...row,
  }));

  console.log(`Workbook: ${args.file}`);
  console.log(`Sheet: ${firstSheetName}`);
  console.log(`Team: ${teamRow.name} (${teamRow.slug})`);
  console.log(`Rows prepared: ${payload.length}`);
  console.log(`Rows missing anthropometrics: ${missingAnthropometrics.length}`);

  if (missingAnthropometrics.length) {
    console.log('Missing data players:');
    missingAnthropometrics.forEach((row) => {
      console.log(`- ${row.display_name}`);
    });
  }

  if (args.dryRun) {
    console.log('Dry run only. No rows were written.');
    return;
  }

  const { error: upsertError } = await supabase
    .from('club_players')
    .upsert(payload, { onConflict: 'team_id,display_name' });

  if (upsertError) {
    throw upsertError;
  }

  console.log(`Imported ${payload.length} players into club_players.`);
}

main().catch((error) => {
  console.error('Club player import failed.');
  console.error(error);
  process.exitCode = 1;
});
