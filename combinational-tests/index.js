const { readCircuitDescription } = require("../tools/parser");
const { dAlg } = require("../tools/d-alg");

// --- 9. Extract Primary Input Values ---
/**
 * Extracts the primary input values from a successful circuit state.
 * @param {CircuitState} finalState - The final circuit state containing the test vector.
 * @param {object} circuitInfo - The structural information of the circuit.
 * @returns {object} An object mapping primary input IDs to their assigned values.
 *
 */
function extractPIValues(finalState, circuitInfo) {
  const piValues = {};
  circuitInfo.primaryInputs.forEach(pi => {
    piValues[pi] = finalState.get(pi);
  });
  return piValues;
}

async function run(filename) {
  const originalCircuit = await readCircuitDescription(
    `./combinational-tests/${filename}.txt`
  );
  let results = [];

  for (const fault of originalCircuit.stuckFaults) {
    const circuit = structuredClone(originalCircuit);
    circuit.stuckFaults = [fault];
    const finalTestState = dAlg(circuit, fault);

    let result = {
      fault: `stuck-at-${fault.value}`,
      wire: fault.wire,
      testable: "Not Found", // Default to "Not Found"
    };

    if (finalTestState) {
      console.log(
        `--- Test Vector Found For stuck-at-${fault.value} on wire ${fault.wire}! ---`
      );
      const piVector = extractPIValues(finalTestState, circuit);
      // Add primary input values to result (each PI as separate column)
      circuit.primaryInputs.forEach(pi => {
        result[`PI_${pi}`] = piVector[pi] || "X"; // Set 'X' if no value is found
      });

      // Add primary output values to result (each PO as separate column)
      circuit.primaryOutputs.forEach(po => {
        result[`PO_${po}`] = finalTestState.get(po) || "X"; // Set 'X' if no value is found
      });

      result.testable = "Found"; // Update status to "Found"

      console.log("Primary Input Test Vector:");
      console.log(piVector);
      // console.log("\nFinal Circuit State (all wires):");
      // Sort wires for consistent output
      // const sortedWires = Array.from(circuit.allWires).sort();
      // const finalWireValues = {};
      // sortedWires.forEach(wire => {
      //   finalWireValues[wire] = finalTestState.get(wire);
      // });
      // // console.log(finalWireValues);

      // // Verify PO values
      // console.log("\nPrimary Output Status:");
      // circuit.primaryOutputs.forEach(po => {
      //   console.log(`${po}: ${finalTestState.get(po)}`);
      // });
    } else {
      console.log(
        `--- Could not find a test vector for stuck-at-${fault.value} fault on ${fault.wire}. ---`
      );
      console.log(
        "This may indicate the fault is untestable (redundant) or the algorithm exhausted search paths."
      );
    }
    results.push(result);
  }

  console.table(results);
}

async function runCombinationalTests() {
  run("a");
}

module.exports = { runCombinationalTests };
