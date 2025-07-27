// فایل اصلی شما که dAlg و unrollCircuit را دارد
const { dAlg } = require("../tools/d-alg");
const { unrollCircuit } = require("../tools/unroller");
const { readCircuitDescription } = require("../tools/parser");
const { log } = require("../tools/log");
const chalk = require("chalk");

/**
 * Final, corrected manager function for finding sequential test vectors.
 * This version correctly handles the state justification requirement.
 * @param {object} circuitInfo - Information about the original circuit.
 * @param {object} fault - The target fault.
 * @param {number} maxFramesLimit - The maximum number of time-frames to try.
 * @returns {Array<object> | null} A sequence of test vectors or null if unsuccessful.
 */
function findTestVectorSequentially(circuitInfo, fault, maxFramesLimit = 10) {
  for (let numFrames = 1; numFrames <= maxFramesLimit; numFrames++) {
    log(`\n--- Attempting with ${numFrames} time-frame(s) ---`);

    const unrolledCircuit = unrollCircuit(
      structuredClone(circuitInfo),
      numFrames
    );

    const testResultState = dAlg(unrolledCircuit, fault);

    if (testResultState) {
      const isTestValid = checkInitialStateDependency(
        testResultState,
        circuitInfo,
        numFrames
      );

      if (isTestValid) {
        log(">> Valid test found (independent of initial state)!");
        return extractTestSequence(testResultState, circuitInfo, numFrames);
      } else {
        log(
          `>> Test found, but it depends on a specific initial state. More frames needed for justification...`
        );
        // Continue the loop to try with more frames to justify this required state.
      }
    } else {
      log(
        `>> No test found with ${numFrames} frame(s). Trying with more frames...`
      );
    }
  }

  console.log(
    "\n--- Test not found after reaching the maximum frame limit ---"
  );
  return null;
}

/**
 * Formats a test sequence and circuit info into a human-readable string.
 * @param {Array<object>} sequence - The test sequence, an array of {frame, vector} objects.
 * @param {object} circuitInfo - The original circuit information object, containing the fault list.
 * @returns {string} The formatted output string.
 */
function formatTestSequence(sequence, circuitInfo) {
  let outputLines = [];

  // 1. Format the fault line from the circuit information.
  if (circuitInfo.stuckFaults && circuitInfo.stuckFaults.length > 0) {
    const fault = circuitInfo.stuckFaults[0];
    outputLines.push(`STUCK_AT ${fault.wire}, ${fault.value}`);
  }

  // 2. Sort the sequence by frame number to ensure chronological order.
  const sortedSequence = [...sequence].sort((a, b) => a.frame - b.frame);

  // 3. Format each vector line.
  sortedSequence.forEach((frameData, index) => {
    const lineNumber = index + 1; // Line numbers start from 1.

    // Convert the vector object { An: '1', Bn: '1' } to "An=1, Bn=1"
    const vectorString = Object.entries(frameData.vector)
      .map(([pi, value]) => `${pi}=${value}`)
      .join(", ");

    outputLines.push(`@${lineNumber}  ${vectorString}`);
  });

  // 4. Join all lines with a newline character and return.
  return outputLines.join("\n");
}

/**
 * Checks if the found test vector depends on a specific, non-X initial state.
 * @param {CircuitState} finalState - The final circuit state found by dAlg.
 * @param {object} originalCircuitInfo - Info of the original circuit.
 * @param {number} numFrames - The number of frames used.
 * @returns {boolean} - True if the test is valid (initial state is X), false otherwise.
 */
function checkInitialStateDependency(
  finalState,
  originalCircuitInfo,
  numFrames
) {
  const firstFrameIndex = -(numFrames - 1);

  // Helper to get wire name for a specific frame
  const getWireName = (originalName, frameIndex) => {
    if (frameIndex === 0) return originalName;
    return `${originalName}-${Math.abs(frameIndex)}`;
  };

  // Check the value of each initial state input (PPI of the first frame)
  for (const dff of originalCircuitInfo.dffs) {
    const q_initial_wire = getWireName(dff.q, firstFrameIndex);
    log({ q_initial_wire });
    if (finalState.get(q_initial_wire) !== "X") {
      return false; // Dependency found!
    }
    if (dff.q_bar) {
      const q_bar_initial_wire = getWireName(dff.q_bar, firstFrameIndex);
      log({ q_bar_initial_wire });
      if (finalState.get(q_bar_initial_wire) !== "X") {
        return false; // Dependency found!
      }
    }
  }

  return true; // No dependency, the test is valid.
}

/**
 * This helper function extracts the primary input values from the final state
 * and returns them as a sequence of vectors for each time-frame.
 * @param {CircuitState} finalState - The final circuit state found by dAlg.
 * @param {object} originalCircuitInfo - Info of the original circuit to access input names.
 * @param {number} numFrames - The number of frames with which the test was found.
 * @returns {Array<object>} - The test sequence.
 */
function extractTestSequence(finalState, originalCircuitInfo, numFrames) {
  const sequence = [];
  const clockSignals = new Set(originalCircuitInfo.dffs.map(dff => dff.clock));
  const originalPIs = originalCircuitInfo.primaryInputs.filter(
    pi => !clockSignals.has(pi)
  );

  for (let i = -(numFrames - 1); i <= 0; i++) {
    const vector = {};
    const frameSuffix = i === 0 ? "" : `-${Math.abs(i)}`;

    for (const pi of originalPIs) {
      const wireNameInFrame = `${pi}${frameSuffix}`;
      vector[pi] = finalState.get(wireNameInFrame) || "X"; // Use 'X' if no value was assigned.
    }
    sequence.push({ frame: i, vector });
  }
  return sequence;
}

async function run(filename) {
  const originalCircuit = await readCircuitDescription(
    `./seq-tests/${filename}.txt`
  );
  for (const fault of originalCircuit.stuckFaults) {
    const circuit = structuredClone(originalCircuit);
    circuit.stuckFaults = [fault];

    const result = findTestVectorSequentially(circuit, fault, 10);

    const formatted = formatTestSequence(result, circuit);
    console.log(chalk.blue(`----------${filename}----------`));
    console.log(chalk.green(formatted));
  }
}

async function runSequentialTests() {
  run("b");
  run("d");
  run("f");
}

module.exports = { runSequentialTests };
