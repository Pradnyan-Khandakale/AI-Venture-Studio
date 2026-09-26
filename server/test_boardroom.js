import { connectDatabase } from "./config/database.js";
import { runBoardroomTestSuite } from "./services/boardroomTestSuite.js";

console.log("[Test] Running Boardroom verification suite...");
await connectDatabase();
runBoardroomTestSuite()
  .then((report) => {
    console.log("[Test] Results Matrix:");
    console.log(JSON.stringify(report.results.matrix, null, 2));
    console.log(`[Test] Total: ${report.results.summary.passed} passed, ${report.results.summary.failed} failed.`);
    process.exit(report.results.allPassed ? 0 : 1);
  })
  .catch((err) => {
    console.error("[Test] Suite failed:", err);
    process.exit(1);
  });
