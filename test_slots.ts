import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: slots, error } = await supabase.from("slots").select("*");
  console.log("Slots count:", slots?.length, "Error:", error);
  if (slots && slots.length > 0) console.log(slots.slice(0, 5));
}
run();
