import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: p, error: e1 } = await supabase.from('practitioners').select('*');
  console.log("Practitioners:", p?.length, "Error:", e1);
  const { data: s, error: e2 } = await supabase.from('slots').select('*');
  console.log("Slots:", s?.length, "Error:", e2);
}
run();
