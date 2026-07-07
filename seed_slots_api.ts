import fetch from "node-fetch";

async function run() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date(); tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

  const slots = [
    { practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: today, start_time: '16:30:00', end_time: '16:50:00', status: 'open', fee: 69900 },
    { practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'clinic', slot_date: today, start_time: '17:00:00', end_time: '17:20:00', status: 'open', fee: 99900 },
    { practitioner_id: 'd0c00001-0000-0000-0000-000000000001', mode: 'video', slot_date: tomorrow, start_time: '10:00:00', end_time: '10:20:00', status: 'open', fee: 69900 }
  ];

  try {
    const res = await fetch("http://localhost:3000/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots })
    });
    
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
