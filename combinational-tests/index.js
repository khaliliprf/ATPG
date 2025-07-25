const { readCircuitDescription } = require("../tools/parser");
const { dAlg, backwardImplicationSigValue } = require("../tools/d-alg");
const { unrollCircuit } = require("../tools/unroller");
const { log } = require("../tools/log");

function extractPIValues(finalState, circuitInfo) {
  const piValues = {};
  circuitInfo.primaryInputs.forEach(pi => {
    piValues[pi] = backwardImplicationSigValue(finalState.get(pi));
  });
  return piValues;
}

async function run(filename) {
  const originalCircuit = await readCircuitDescription(
    `./seq-tests/${filename}.txt`
  );
  console.log(originalCircuit);
  const unrolled = unrollCircuit(originalCircuit, 3);
  console.log("unrolled--------------");
  console.log(unrolled);
  console.log("gates", unrolled.gates);
  console.log("fanouts", unrolled.fanouts);
  return;
  let results = [];

  for (const fault of originalCircuit.stuckFaults) {
    const circuit = structuredClone(originalCircuit);
    circuit.stuckFaults = [fault];
    const finalTestState = dAlg(circuit, fault);

    let result = {
      fault: `stuck-at-${fault.value}`,
      wire: fault.wire,
      testable: "Not Found",
    };

    if (finalTestState) {
      log(
        `--- Test Vector Found For stuck-at-${fault.value} on wire ${fault.wire}! ---`
      );
      const piVector = extractPIValues(finalTestState, circuit);
      // Add primary input values to result (each PI as separate column)
      circuit.primaryInputs.forEach(pi => {
        result[`PI_${pi}`] = backwardImplicationSigValue(piVector[pi]) || "X";
      });

      // Add primary output values to result (each PO as separate column)
      circuit.primaryOutputs.forEach(po => {
        result[`PO_${po}`] = finalTestState.get(po) || "X"; // Set 'X' if no value is found
      });

      result.testable = "Found";
    } else {
      log(
        `--- Could not find a test vector for stuck-at-${fault.value} fault on ${fault.wire}. ---`
      );
      log(
        "This may indicate the fault is untestable (redundant) or the algorithm exhausted search paths."
      );
    }
    results.push(result);
  }
  console.log(`--------------${filename}----------------`);
  console.table(results);
}

async function runCombinationalTests() {
  run("b");
  // run("buff");
  // run("not");
  // run("fanout2");
  // run("fanout3");
  // run("fanout4");
  // run("and2");
  // run("and3");
  // run("and4");
  // run("nand2");
  // run("nand3");
  // run("nand4");
  // run("or2");
  // run("or3");
  // run("or4");
  // run("nor2");
  // run("nor3");
  // run("nor4");
  // run("a");
  // run("and-instead-xor");
  // run("e-a=1-b=1");
  // run("f-with-xor");
  // run("g-javab-nadare");
  // run("xor2");
  // run("xor3");
  // run("xor4");
  // run("xor2-and-or-not-fanout");
  // run("xor3-and-or-not-fanout");
  //---------
  // run("xnor2-and-or-not-fanout"); // TODO
  // run("xnor2");
  // run("xnor3"); // TODO
  // run("xnor4"); // TODO
}

module.exports = { runCombinationalTests };
