import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data } = await supabase.from('practitioners').select('id, base_clinic_fee').eq('id', 'd0c00001-0000-0000-0000-000000000001').single();
  console.log(data);
}
run();
