import { format } from "date-fns";
import { buildHealthReportFromData } from "./weeklyHealth";

async function run() {
  const report = await buildHealthReportFromData();
  console.log(`[${format(new Date(), "yyyy-MM-dd HH:mm:ss")}] health report written for ${report.date}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
