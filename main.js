const fs = require("fs");
const TestGenerator = require("core");

const circuitFilePath = "circuit.txt";

try {
  const fileContent = fs.readFileSync(circuitFilePath, "utf8");
  const generator = new TestGenerator(fileContent);
  generator.generateTestSequences();
} catch (error) {
  console.error(`Error reading circuit file: ${error.message}`);
}
