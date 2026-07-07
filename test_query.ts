import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: practitioners } = await supabase.from("practitioners").select("*");
  console.log("Practitioners:", practitioners?.length);
  
  const { data: slots } = await supabase.from("slots").select("*");
  console.log("Slots:", slots?.length);
  if (slots && slots.length > 0) {
     console.log("First slot:", slots[0]);
  }
}
run();
