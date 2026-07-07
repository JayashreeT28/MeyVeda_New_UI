import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  // 1. Try to sign up a dummy user
  const email = 'test_insert_' + Date.now() + '@meyveda.in';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  console.log("SignUp Error:", authErr?.message);
  
  if (!authErr && authData.session) {
    const today = new Date().toISOString().split('T')[0];
    const slots = [
      { id: 'f0000000-0000-0000-0000-000000000001', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: today, start_time: '18:00:00', end_time: '18:20:00', status: 'open', fee: 69900 }
    ];
    const { error: insertErr } = await supabase.from('slots').insert(slots);
    console.log("Insert Error after Auth:", insertErr?.message || "Success");
  }
}
run();
