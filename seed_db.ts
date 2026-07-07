import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting seed...");

  const users = [
    { id: 'a0000000-0000-0000-0000-000000000001', mobile: '+919876543210', email: 'aditi.shastri@meyveda.in', role: 'practitioner' },
    { id: 'b0000000-0000-0000-0000-000000000010', mobile: '+919800000010', email: 'rohit@meyveda.in', role: 'patient' },
    { id: 'b0000000-0000-0000-0000-000000000011', mobile: '+919800000011', email: 'meera@meyveda.in', role: 'patient' },
    { id: 'b0000000-0000-0000-0000-000000000012', mobile: '+919800000012', email: 'suresh@meyveda.in', role: 'patient' },
    { id: 'b0000000-0000-0000-0000-000000000013', mobile: '+919800000013', email: 'kavitha@meyveda.in', role: 'patient' }
  ];

  const { error: e1 } = await supabase.from('users').upsert(users, { onConflict: 'mobile' });
  console.log("Users inserted. Error:", e1);

  const practitioners = [
    { id: 'd0c00001-0000-0000-0000-000000000001', user_id: 'a0000000-0000-0000-0000-000000000001', full_name: 'Dr. Aditi Shastri', gender: 'female', disciplines: ['Ayurveda'], verification_status: 'verified' }
  ];

  await supabase.from('practitioners').upsert(practitioners);
  console.log("Practitioners inserted");

  const patients = [
    { id: 'c0000000-0000-0000-0000-000000000001', user_id: 'b0000000-0000-0000-0000-000000000010', full_name: 'Rohit Kumar', date_of_birth: '1994-01-01', gender: 'male', city: 'Bangalore' },
    { id: 'c0000000-0000-0000-0000-000000000002', user_id: 'b0000000-0000-0000-0000-000000000011', full_name: 'Meera Patel', date_of_birth: '1981-01-01', gender: 'female', city: 'Bangalore' },
    { id: 'c0000000-0000-0000-0000-000000000003', user_id: 'b0000000-0000-0000-0000-000000000012', full_name: 'Suresh Rao', date_of_birth: '1968-01-01', gender: 'male', city: 'Bangalore' },
    { id: 'c0000000-0000-0000-0000-000000000004', user_id: 'b0000000-0000-0000-0000-000000000013', full_name: 'Kavitha Nair', date_of_birth: '1997-01-01', gender: 'female', city: 'Bangalore' }
  ];

  await supabase.from('patients').upsert(patients);
  console.log("Patients inserted");

  const today = new Date().toISOString().split('T')[0];

  const tomorrowObj = new Date(); tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;
  
  const fridayObj = new Date(); fridayObj.setDate(fridayObj.getDate() + 3);
  const friday = `${fridayObj.getFullYear()}-${String(fridayObj.getMonth() + 1).padStart(2, '0')}-${String(fridayObj.getDate()).padStart(2, '0')}`;

  const slots = [
    // Existing booked slots
    { id: 'e0000000-0000-0000-0000-000000000001', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: today, start_time: '16:30:00', end_time: '16:50:00', status: 'booked', fee: 69900 },
    { id: 'e0000000-0000-0000-0000-000000000002', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: today, start_time: '17:00:00', end_time: '17:20:00', status: 'booked', fee: 99900 },
    { id: 'e0000000-0000-0000-0000-000000000003', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: today, start_time: '17:30:00', end_time: '17:50:00', status: 'booked', fee: 69900 },
    { id: 'e0000000-0000-0000-0000-000000000004', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: today, start_time: '15:30:00', end_time: '15:50:00', status: 'booked', fee: 99900 },
    
    // New open slots for today
    { id: 'e0000000-0000-0000-0000-000000000005', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: today, start_time: '18:00:00', end_time: '18:20:00', status: 'open', fee: 69900 },
    { id: 'e0000000-0000-0000-0000-000000000006', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: today, start_time: '18:30:00', end_time: '18:50:00', status: 'open', fee: 99900 },
    
    // New open slots for tomorrow
    { id: 'e0000000-0000-0000-0000-000000000007', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: tomorrow, start_time: '10:00:00', end_time: '10:20:00', status: 'open', fee: 69900 },
    { id: 'e0000000-0000-0000-0000-000000000008', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: tomorrow, start_time: '11:00:00', end_time: '11:20:00', status: 'open', fee: 99900 },

    // New open slots for Friday (3 days from now)
    { id: 'e0000000-0000-0000-0000-000000000009', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: friday, start_time: '14:00:00', end_time: '14:20:00', status: 'open', fee: 69900 },
    { id: 'e0000000-0000-0000-0000-000000000010', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: friday, start_time: '15:00:00', end_time: '15:20:00', status: 'open', fee: 99900 }
  ];

  await supabase.from('slots').upsert(slots);
  console.log("Slots inserted");

  const checkedInAt = new Date(Date.now() - 5 * 60000).toISOString();
  
  const appointments = [
    { id: 'f0000000-0000-0000-0000-000000000001', slot_id: 'e0000000-0000-0000-0000-000000000001', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', patient_id: 'c0000000-0000-0000-0000-000000000001', mode: 'video', status: 'checked_in', reason_for_visit: 'Digestive issues, fatigue', scheduled_date: today, scheduled_time: '16:30:00', checked_in_at: checkedInAt },
    { id: 'f0000000-0000-0000-0000-000000000002', slot_id: 'e0000000-0000-0000-0000-000000000002', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', patient_id: 'c0000000-0000-0000-0000-000000000002', mode: 'clinic', status: 'scheduled', reason_for_visit: 'Joint pain, mobility', scheduled_date: today, scheduled_time: '17:00:00', checked_in_at: null },
    { id: 'f0000000-0000-0000-0000-000000000003', slot_id: 'e0000000-0000-0000-0000-000000000003', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', patient_id: 'c0000000-0000-0000-0000-000000000003', mode: 'video', status: 'scheduled', reason_for_visit: 'Skin condition, Pitta', scheduled_date: today, scheduled_time: '17:30:00', checked_in_at: null },
    { id: 'f0000000-0000-0000-0000-000000000004', slot_id: 'e0000000-0000-0000-0000-000000000004', practitioner_id: 'd0c00001-0000-0000-0000-000000000001', patient_id: 'c0000000-0000-0000-0000-000000000004', mode: 'clinic', status: 'completed', reason_for_visit: 'Follow-up — Panchakarma', scheduled_date: today, scheduled_time: '15:30:00', checked_in_at: null }
  ];

  await supabase.from('appointments').upsert(appointments);
  console.log("Appointments inserted");
  
  console.log("Done!");
}

run();
