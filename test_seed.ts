import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const today = new Date().toISOString().split('T')[0];
  const slots = [
    { id: 'e0000000-0000-0000-0000-000000000005', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: today, start_time: '18:00:00', end_time: '18:20:00', status: 'open', fee: 69900 },
    { id: 'e0000000-0000-0000-0000-000000000006', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: today, start_time: '18:30:00', end_time: '18:50:00', status: 'open', fee: 99900 }
  ];
  const { error } = await supabase.from('slots').upsert(slots);
  console.log("Error:", error);
}
run();
