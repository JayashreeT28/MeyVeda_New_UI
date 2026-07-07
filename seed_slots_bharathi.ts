import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const BHARATHI_ID = "d9f3d560-204d-4122-89db-e052f79a0ba9";

async function run() {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  console.log("Generating slots for dates:", dates);

  const slots = [];
  for (const date of dates) {
    // 09:00 AM
    slots.push({
      practitioner_id: BHARATHI_ID,
      mode: 'video',
      slot_date: date,
      start_time: '09:00:00',
      end_time: '09:20:00',
      status: 'open',
      fee: 0
    });
    // 10:00 AM
    slots.push({
      practitioner_id: BHARATHI_ID,
      mode: 'video',
      slot_date: date,
      start_time: '10:00:00',
      end_time: '10:20:00',
      status: 'open',
      fee: 0
    });
    // 02:00 PM
    slots.push({
      practitioner_id: BHARATHI_ID,
      mode: 'clinic',
      slot_date: date,
      start_time: '14:00:00',
      end_time: '14:20:00',
      status: 'open',
      fee: 0
    });
    // 03:00 PM
    slots.push({
      practitioner_id: BHARATHI_ID,
      mode: 'clinic',
      slot_date: date,
      start_time: '15:00:00',
      end_time: '15:20:00',
      status: 'open',
      fee: 0
    });
  }

  // Clear existing slots for bharathi first to avoid duplicate seed issues
  const { error: deleteErr } = await supabase
    .from("slots")
    .delete()
    .eq("practitioner_id", BHARATHI_ID);

  if (deleteErr) {
    console.error("Warning: Error clearing existing slots:", deleteErr);
  }

  const { data, error } = await supabase.from("slots").insert(slots).select();

  if (error) {
    console.error("Error seeding slots:", error);
  } else {
    console.log("Successfully seeded slots count:", data?.length);
  }
}

run();
