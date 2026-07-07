const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const tables = [
    "users", "patients", "practitioners", "consultations", "medicines", "prescriptions", "appointments"
  ];
  
  for (const table of tables) {
    const res = await supabase.from(table).select("*").limit(1);
    if (res.error) {
      console.log(`[MISSING] ${table}: ${res.error.message}`);
    } else {
      console.log(`[EXISTS] ${table}`);
    }
  }
}

test();
