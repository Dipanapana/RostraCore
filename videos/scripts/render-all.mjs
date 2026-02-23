import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

// Ensure output directory exists
mkdirSync('out', { recursive: true });

const compositions = [
  'GettingStarted',
  'EmployeeManagement',
  'ShiftScheduling',
  'AttendanceCheckin',
  'PayrollProcessing',
  'ClientSiteManagement',
  'IncidentReporting',
];

console.log(`Rendering ${compositions.length} videos...\n`);

for (const comp of compositions) {
  console.log(`[${compositions.indexOf(comp) + 1}/${compositions.length}] Rendering ${comp}...`);
  try {
    execSync(
      `npx remotion render src/index.ts ${comp} out/${comp}.mp4 --codec h264`,
      { stdio: 'inherit' }
    );
    console.log(`  ✓ ${comp}.mp4 rendered successfully\n`);
  } catch (error) {
    console.error(`  ✗ Failed to render ${comp}\n`);
  }
}

console.log('Done! Videos are in the out/ directory.');
