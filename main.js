require("dotenv").config();
const { runCombinationalTests } = require("./combinational-tests/index");

(async () => {
  runCombinationalTests();
})();
