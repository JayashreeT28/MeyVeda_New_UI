import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: practitioners } = await supabase.from('practitioners').select('id');
  if (!practitioners) return;

  let sql = `INSERT INTO slots (id, practitioner_id, mode, slot_date, start_time, end_time, status, fee) VALUES\n`;
  const values: string[] = [];

  const today = new Date();
  
  for (const pract of practitioners) {
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      
      values.push(`(gen_random_uuid(), '${pract.id}', 'video', '${dateStr}', '10:00:00', '10:20:00', 'open', 69900)`);
      values.push(`(gen_random_uuid(), '${pract.id}', 'clinic', '${dateStr}', '11:00:00', '11:20:00', 'open', 99900)`);
      values.push(`(gen_random_uuid(), '${pract.id}', 'video', '${dateStr}', '16:30:00', '16:50:00', 'open', 69900)`);
      values.push(`(gen_random_uuid(), '${pract.id}', 'clinic', '${dateStr}', '17:00:00', '17:20:00', 'open', 99900)`);
    }
  }

  sql += values.join(",\n") + ";\n";
  fs.writeFileSync('insert_slots_dummy_data.sql', sql);
  console.log("SQL file generated successfully.");
}

run();
