require("dotenv").config();
const { runCombinationalTests } = require("./combinational-tests/index");
const { runSequentialTests } = require("./seq-tests/index");

(async () => {
  // runCombinationalTests();
  runSequentialTests();
})();
