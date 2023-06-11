import Humanforce from './humanforce.js';
import * as fs from 'fs';

const humanforce = new Humanforce();

// Login
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf-8'));
await humanforce.login(credentials.email, credentials.password, true);

// Fetch user profile
const profile = await humanforce.getProfile();
console.log(`Logged into ${humanforce.companyName} as ${profile.fullName} (${profile.employeeCode})!`);

// Show next 14 days of shifts
const endDate = new Date();
endDate.setDate(endDate.getDate() + 14);
const shifts = await humanforce.getCalendar(new Date(), endDate);
console.log('Next 14 days...');
for (const shift of shifts) {
    console.log(` - ${shift.startTime.toLocaleString()} - ${shift.endTime.toLocaleTimeString()} ${shift.role}`);
}
