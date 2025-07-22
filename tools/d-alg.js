const { log } = require("../tools/log");

// --- 1. SignalValue Enum ---
const SignalValue = {
  0: "0", // Logic 0
  1: "1", // Logic 1
  X: "X", // Unknown
  D: "D", // 1/0 (Good machine is 1, Faulty machine is 0)
  D_BAR: "D_BAR", // 0/1 (Good machine is 0, Faulty machine is 1)
};

function backwardImplicationSigValue(signalValue) {
  if (signalValue === "0" || signalValue === "1" || signalValue === "X")
    return signalValue;
  if (signalValue === "D") return "1";
  if (signalValue === "D_BAR") return "0";
}
// --- 2. Helper Functions for Gate Logic ---

/**
 * Determines the controlling value for a given gate type.
 * A controlling value at an input determines the output regardless of other inputs.
 * @param {string} gateType - Type of the logic gate (e.g., 'AND', 'OR', 'NAND', 'NOR').
 * @returns {SignalValue | null} The controlling value, or null if not applicable (e.g., XOR).
 */
function getControllingValue(gateType) {
  switch (gateType) {
    case "AND":
    case "NAND":
      return SignalValue["0"]; // 0 is controlling for AND/NAND
    case "OR":
    case "NOR":
      return SignalValue["1"]; // 1 is controlling for OR/NOR
    default:
      return null; // XOR/XNOR/NOT don't have a simple controlling value like AND/OR
  }
}

/**
 * Determines the non-controlling value for a given gate type.
 * A non-controlling value at an input allows other inputs to determine the output.
 * @param {string} gateType - Type of the logic gate.
 * @returns {SignalValue | null} The non-controlling value, or null if not applicable.
 */
function getNonControllingValue(gateType) {
  switch (gateType) {
    case "AND":
    case "NAND":
      return SignalValue["1"]; // 1 is non-controlling for AND/NAND
    case "OR":
    case "NOR":
      return SignalValue["0"]; // 0 is non-controlling for OR/NOR
    default:
      return null;
  }
}

/**
 * Simulates a single logic gate's output based on its type and input values.
 * Handles 5-valued logic (0, 1, X, D, D_BAR).
 * @param {string} gateType - The type of the gate (e.g., 'AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR').
 * @param {Array<SignalValue>} inputs - An array of input SignalValues to the gate.
 * @returns {SignalValue} The calculated output SignalValue.
 */
function simulateGate(gateType, inputs) {
  // Separate good and faulty machine inputs for D/D_BAR handling
  let goodInputs = [];
  let faultyInputs = [];
  let hasX = false; // Flag to track if any input is X

  for (const input of inputs) {
    if (input === SignalValue.D) {
      goodInputs.push(SignalValue["1"]);
      faultyInputs.push(SignalValue["0"]);
    } else if (input === SignalValue.D_BAR) {
      goodInputs.push(SignalValue["0"]);
      faultyInputs.push(SignalValue["1"]);
    } else if (input === SignalValue.X) {
      goodInputs.push(SignalValue.X);
      faultyInputs.push(SignalValue.X);
      hasX = true;
    } else {
      // 0 or 1
      goodInputs.push(input);
      faultyInputs.push(input);
    }
  }

  /**
   * Internal function to calculate a binary/X output for a given gate type.
   * @param {string} type - Gate type.
   * @param {Array<SignalValue>} vals - Array of binary/X input values.
   * @returns {SignalValue} Calculated output.
   */
  const calculateBinaryOutput = (type, vals) => {
    if (vals.includes(SignalValue.X)) hasX = true; // Update hasX for this context

    switch (type) {
      case "AND":
        if (vals.includes(SignalValue["0"])) return SignalValue["0"];
        if (vals.every(v => v === SignalValue["1"])) return SignalValue["1"];
        return SignalValue.X;
      case "OR":
        if (vals.includes(SignalValue["1"])) return SignalValue["1"];
        if (vals.every(v => v === SignalValue["0"])) return SignalValue["0"];
        return SignalValue.X;
      case "NOT":
        if (vals[0] === SignalValue["0"]) return SignalValue["1"];
        if (vals[0] === SignalValue["1"]) return SignalValue["0"];
        return SignalValue.X;
      case "NAND":
        const andOutput = calculateBinaryOutput("AND", vals);
        return calculateBinaryOutput("NOT", [andOutput]);
      case "NOR":
        const orOutput = calculateBinaryOutput("OR", vals);
        return calculateBinaryOutput("NOT", [orOutput]);
      case "XOR":
        // XOR for multiple inputs (odd number of 1s)
        let countOnes = 0;
        for (const val of vals) {
          if (val === SignalValue.X) return SignalValue.X;
          if (val === SignalValue["1"]) countOnes++;
        }
        return countOnes % 2 === 1 ? SignalValue["1"] : SignalValue["0"];
      case "XNOR":
        const xorOutput = calculateBinaryOutput("XOR", vals);
        return calculateBinaryOutput("NOT", [xorOutput]);
      default:
        return SignalValue.X; // Unknown gate type
    }
  };

  // Calculate outputs for both good and faulty machines
  const goodOutput = calculateBinaryOutput(gateType, goodInputs);
  const faultyOutput = calculateBinaryOutput(gateType, faultyInputs);

  // If any input was X and the output is still X for both, keep X
  if (goodOutput === SignalValue.X || faultyOutput === SignalValue.X) {
    return SignalValue.X;
  }

  // Combine good and faulty outputs into 5-valued logic
  if (goodOutput === faultyOutput) {
    return goodOutput;
  } else if (
    goodOutput === SignalValue["1"] &&
    faultyOutput === SignalValue["0"]
  ) {
    return SignalValue.D;
  } else if (
    goodOutput === SignalValue["0"] &&
    faultyOutput === SignalValue["1"]
  ) {
    return SignalValue.D_BAR;
  } else {
    // This case indicates a problem in the simulation logic or an unreachable state
    // For robustness, return X, but ideally should not happen if logic is correct
    console.warn(
      `Unexpected simulation result for gate ${gateType}: Good=${goodOutput}, Faulty=${faultyOutput}`
    );
    return SignalValue.X;
  }
}

// --- 3. CircuitState Class ---
class CircuitState {
  /**
   * Initializes a new circuit state with all wires set to unknown (X).
   * @param {object} circuitInfo - Object containing circuit gates, primary inputs/outputs, and all wires.
   */
  constructor(circuitInfo) {
    this.values = {}; // Map: wireId -> SignalValue (current state of each wire)
    this.circuitInfo = circuitInfo; // Reference to the circuit structure

    // Initialize all wires to X
    circuitInfo.allWires.forEach(wire => {
      this.values[wire] = SignalValue.X;
    });

    // Store gate objects in a Map for efficient lookup by output wire
    this.gatesByOutput = new Map();
    circuitInfo.gates.forEach(gate => {
      this.gatesByOutput.set(gate.output, gate);
    });
  }

  /**
   * این متد سعی می‌کند یک مقدار value را به wire مشخص شده اختصاص دهد. مهمترین وظیفه این متد، تشخیص تناقض (Conflict Detection) است.
   * Assigns a value to a specific wire. Checks for consistency.
   * @param {string} wire - The ID of the wire to assign.
   * @param {SignalValue} value - The value to assign (0, 1, X, D, D_BAR).
   * @returns {boolean} True if the assignment is consistent (no conflict), false otherwise.
   */
  assign(wire, value) {
    log(wire, value);
    const currentValue = this.values[wire];

    if (currentValue === SignalValue.X) {
      // If currently unknown, just assign the new value
      this.values[wire] = value;
      return true;
    } else if (currentValue === value) {
      // If already assigned correctly, no change needed
      return true;
    } else {
      // Conflict detection
      // Direct conflict (e.g., trying to assign 0 when it's already 1, or vice-versa)
      if (
        (currentValue === SignalValue["0"] && value === SignalValue["1"]) ||
        (currentValue === SignalValue["1"] && value === SignalValue["0"])
      ) {
        return false;
      }
      // D/D_BAR conflict (e.g., trying to assign D when it's already D_BAR)
      if (
        (currentValue === SignalValue.D && value === SignalValue.D_BAR) ||
        (currentValue === SignalValue.D_BAR && value === SignalValue.D)
      ) {
        return false;
      }
      // Trying to assign 0/1 to D/D_BAR or vice-versa (simplified for 5-valued algebra)
      // A more robust system (Muth's 9-valued) handles this gracefully.
      // For 5-valued, if we have D (1/0) and try to assign 1, it implies no fault.
      // This is a simplification; for strict 5-valued, this might be a conflict.
      // Here, we consider it a conflict if it explicitly tries to change a known D/D_BAR to 0/1 or vice-versa.
      if (
        (currentValue === SignalValue.D ||
          currentValue === SignalValue.D_BAR) &&
        (value === SignalValue["0"] || value === SignalValue["1"])
      ) {
        return false; // Cannot override a D/D_BAR with a binary value
      }
      if (
        (value === SignalValue.D || value === SignalValue.D_BAR) &&
        (currentValue === SignalValue["0"] || currentValue === SignalValue["1"])
      ) {
        return false; // Cannot override a binary value with D/D_BAR
      }

      // If we reach here, it's either setting X to a value (handled above),
      // or setting a value to X (which is usually not allowed without backtracking),
      // or a known value is incompatible. We assume it's a conflict for simplicity.
      return false;
    }
  }

  /**
   * یک متد ساده برای بازیابی مقدار فعلی یک سیم.
   * Gets the current value of a wire.
   * @param {string} wire - The ID of the wire.
   * @returns {SignalValue} The current value of the wire.
   */
  get(wire) {
    return this.values[wire];
  }

  getFault(f) {
    return this.stuckFaults;
  }

  /**
   * ایجاد یک کپی عمیق از وضعیت فعلی مدار. این متد برای Backtracking در الگوریتم D-Algorithm حیاتی است.
   * Creates a deep copy of the current CircuitState. Essential for backtracking.
   * @returns {CircuitState} A new CircuitState instance with copied values.
   */
  clone() {
    const newState = new CircuitState(this.circuitInfo); // Re-uses circuitInfo ref
    newState.values = { ...this.values }; // Shallow copy of the values object
    return newState;
  }
}

// --- 4. ImplicationStack Class ---
class ImplicationStack {
  constructor() {
    this.stack = []; // Stores { wire, value, decisionType (e.g., 'faultActivation', 'D-drive', 'justification'), triedAlternate }
  }

  /**
   * Pushes an item onto the stack. Represents a decision or an implied assignment.
   * @param {object} item - The item to push, usually { wire, value, triedAlternate: boolean }.
   */
  push(item) {
    log("pushed to ImplicationStack", item);
    this.stack.push(item);
  }

  /**
   * Pops the top item from the stack.
   * @returns {object | undefined} The popped item, or undefined if stack is empty.
   */
  pop() {
    log("poped from ImplicationStack");
    return this.stack.pop();
  }

  /**
   * Peeks at the top item without removing it.
   * @returns {object | undefined} The top item, or undefined if stack is empty.
   */
  peek() {
    log("peeked to ImplicationStack");

    return this.stack[this.stack.length - 1];
  }

  /**
   * Checks if the stack is empty.
   * @returns {boolean} True if empty, false otherwise.
   */
  isEmpty() {
    return this.stack.length === 0;
  }

  /**
   * این متد برای Backtracking استفاده می‌شود. وظیفه آن یافتن جدیدترین نقطه تصمیم‌گیری در پشته است که هنوز مسیر جایگزینی (alternative assignment) را امتحان نکرده است.
   * Finds the most recent decision point that has an untried alternative and marks it.
   * Used during backtracking.
   * @returns {object | null} The item to backtrack to, or null if no untried alternatives.
   */
  findUntriedAlternate() {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const item = this.stack[i];
      // Only consider decisions (not just implied values) that haven't tried alternate
      if (item.isDecision && !item.triedAlternate) {
        item.triedAlternate = true; // Mark as tried
        log("find Untried Alternate returned", item);

        return item;
      }
    }
    log("find Untried Alternate null");

    return null;
  }

  /**
   * Trims the stack back to a specified size (for restoring state after a failed path).
   * @param {number} targetSize - The desired size of the stack.
   */
  trimToSize(targetSize) {
    while (this.stack.length > targetSize) {
      this.pop();
    }
  }
}

// --- 5. Implication and Consistency Check Function (implyAndCheck) ---
// Performs forward and backward implications
// Updates dFrontier and jFrontier sets
// Returns true if consistent, false if conflict
function implyAndCheck(currentState, circuitInfo, dFrontier, jFrontier) {
  log("imply and check get called with following parameters:");
  // log("currentState", currentState);
  // log("circuitInfo", circuitInfo);
  log("dFrontier", dFrontier);
  log("jFrontier", jFrontier);
  let conflictFound = false;

  // Queue for wires whose values have changed and need to be propagated
  // A manual queue allows adding elements while iterating, crucial for implication chaining.
  const processingQueue = [];
  // Set to keep track of wires already processed in *this specific call* of implyAndCheck
  // to prevent redundant work and infinite loops in cyclic paths (though combinational circuits are acyclic).
  const processedInThisCycle = new Set();

  // Initialize queue with all currently non-X wires from the current state.
  // These are the starting points for implications.
  for (const wireId in currentState.values) {
    if (currentState.values[wireId] !== SignalValue.X) {
      processingQueue.push(wireId);
      log(
        `1 - ${wireId} pushed to processingQueue", processingQueue: ${processingQueue}`
      );
    }
  }

  // Clear frontiers before re-calculation based on current state.
  // This ensures they accurately reflect the current circuit state after implications.
  dFrontier.clear();
  jFrontier.clear();

  let queueIndex = 0; // Manual index for the processing queue

  while (queueIndex < processingQueue.length) {
    // log("currentState", currentState.values);

    log("==========imply and check new round==============");
    const currentWire = processingQueue[queueIndex++]; // Get the next wire to process
    log({ currentWire });

    // Skip if this wire has already been fully processed in this implication cycle.
    if (processedInThisCycle.has(currentWire)) {
      continue;
    }
    processedInThisCycle.add(currentWire); // Mark as processed for this cycle.

    // TODO
    log(" ------------------ 1. Forward Implications ---------------");
    // These propagate signal values (0, 1, X, D, D_BAR) towards the circuit outputs.

    // NEW: Handle Fanout Stem Implications.
    // If the currentWire is a fanout stem, its value must propagate to all its branches.
    const fanoutEntryForCurrentWire = circuitInfo.fanouts.find(
      f => f.input === currentWire
    );

    if (fanoutEntryForCurrentWire) {
      log(
        `current wire ${currentWire} is a fanout stem and branches are ${fanoutEntryForCurrentWire.outputs}`
      );
      // Iterate over all branches connected to this fanout stem.
      for (const branchWire of fanoutEntryForCurrentWire.outputs) {
        // If a branch is currently unknown (X), assign it the stem's value.
        if (currentState.get(branchWire) === SignalValue.X) {
          log(
            "If a branch is currently unknown (X), assign it the stems value."
          );
          if (!currentState.assign(branchWire, currentState.get(currentWire))) {
            log(
              "check inconsistency for assigning current wire() value to branch"
            );
            conflictFound = true; // Conflict if assignment is inconsistent.
            break; // Break from branch loop on conflict.
          }
          processingQueue.push(branchWire); // If value changed/assigned, push to queue for further implications.
          log(
            `2 - ${branchWire} pushed to processingQueue: ${processingQueue}`
          );
        }
        // If a branch already has a value, check for consistency with the stem's value.
        else if (
          branchWire !== currentState.circuitInfo.stuckFaults[0].wire &&
          currentState.get(branchWire) !== currentState.get(currentWire)
        ) {
          conflictFound = true; // Conflict if branch value is different from stem.
          break; // Break from branch loop on conflict.
        }
      }
    }
    if (conflictFound) return false; // Immediate return if conflict found.

    // Find all gates where `currentWire` is an input.
    // These gates are directly affected by the `currentWire`'s value.
    const gatesDrivenByCurrentWire = circuitInfo.gates.filter(gate =>
      gate.inputs.includes(currentWire)
    );

    log(
      `gates that ${currentWire} is an input(gates Driven By Current Wire ${currentWire}) are:`
    );
    log(gatesDrivenByCurrentWire);
    for (const gate of gatesDrivenByCurrentWire) {
      // Get current values of all inputs to the gate.
      const inputValuesForGate = gate.inputs.map(inputWire =>
        currentState.get(inputWire)
      );

      log(currentState.get(gate.output));
      // const oldOutputValue = backwardImplicationSigValue(
      //   currentState.get(gate.output)
      // );

      const oldOutputValue = currentState.get(gate.output);
      // Store old output value for comparison.

      // Simulate the gate to determine its implied output value.
      const simulatedOutput = simulateGate(gate.type, inputValuesForGate);
      log({ inputValuesForGate, oldOutputValue, simulatedOutput });

      // If the simulated output is a definite value (not X).
      if (
        simulatedOutput !== SignalValue.X &&
        gate.output !== currentState.circuitInfo.stuckFaults[0].wire
      ) {
        log("insideeeeeeee");
        // Attempt to assign this new value to the gate's output wire.
        if (!currentState.assign(gate.output, simulatedOutput)) {
          conflictFound = true; // Conflict detected during assignment.
          break; // Break from current gate loop.
        }
        // If the output value has changed (from X to definite, or definite to a different definite),
        // push the output wire to the queue for further implications.
        if (
          oldOutputValue === SignalValue.X ||
          oldOutputValue !== simulatedOutput
        ) {
          processingQueue.push(gate.output);
          log(
            `3 - ${gate.output} pushed to processingQueue", processingQueue: ${processingQueue}`
          );
        }
      }

      // Update D-frontier: Gates with D/D_BAR at inputs and X at output.
      const hasDInput = inputValuesForGate.some(val =>
        [SignalValue.D, SignalValue.D_BAR].includes(val)
      );
      const isOutputX = currentState.get(gate.output) === SignalValue.X;

      log(
        `gate ${gate.type} with input ${gate.inputs} and output ${
          gate.output
        } has ${hasDInput ? "" : "not"} D in inputs and has ${
          isOutputX ? "" : "not"
        } X in output(output is ${currentState.get(gate.output)})`
      );
      // log({ hasDInput, isOutputX });

      if (hasDInput && isOutputX) {
        dFrontier.add(gate.output); // Add to D-frontier if it matches the definition.
        log(`${gate.output} added to dFrontier: ${Array.from(dFrontier)}`);
      }
      // If the gate's output now contains a D or D_BAR, the fault effect has propagated through it.
      // It is no longer a 'frontier' for its inputs.
      else if (
        [SignalValue.D, SignalValue.D_BAR].includes(
          currentState.get(gate.output)
        )
      ) {
        log(`${gate.output} remove from dFrontier: ${Array.from(dFrontier)}`);
        dFrontier.delete(gate.output); // Remove from D-frontier.
      }
    }
    if (conflictFound) return false; // Immediate return if conflict found during forward gate simulation.

    // --- 2. Backward Implications (Line Justification) ---
    log("-------- 2. Backward Implications (Line Justification) ---------");
    // These determine input values required to justify a known output value.

    // NEW: Handle Fanout Branch Justification.
    // If the `currentWire` is a fanout branch and its value is known, it must justify its fanout stem.
    const fanoutStemEntryForBranch = circuitInfo.fanouts.find(f =>
      f.outputs.includes(currentWire)
    );

    // Only process if currentWire is indeed a branch AND it has a defined value (not X).
    if (
      fanoutStemEntryForBranch &&
      currentState.get(currentWire) !== SignalValue.X
    ) {
      log(
        `currentWire ${currentWire} is indeed a fanout branch AND it has a defined value (not X), fanout stem: ${fanoutStemEntryForBranch.input}, branches: ${fanoutStemEntryForBranch.outputs}`
      );

      const stemWire = fanoutStemEntryForBranch.input; // The main wire (stem) of the fanout.
      const currentValueOnStem = currentState.get(stemWire); // Current value of the stem.
      const currentBranchValue = currentState.get(currentWire); // Value on the branch (currentWire).

      // If the stem is unknown (X), assign it the branch's value.
      // This is a direct backward implication from branch to stem. [cite: 761]
      if (currentValueOnStem === SignalValue.X) {
        // TODO
        if (
          !currentState.assign(
            stemWire,
            backwardImplicationSigValue(currentBranchValue)
          )
        ) {
          conflictFound = true; // Conflict if assignment is inconsistent.
          break; // Break on conflict.
        }
        processingQueue.push(stemWire); // Stem's value changed, push to queue for further implications (e.g., to other branches).
        log(`4 - ${stemWire} pushed to processingQueue: ${processingQueue}`);
      }
      // If the stem already has a value, check for consistency with the branch's value.
      else if (
        currentBranchValue !== (SignalValue.D || SignalValue.D_BAR) &&
        currentValueOnStem !== currentBranchValue
      ) {
        conflictFound = true; // Conflict if stem value is different from branch.
        break; // Break on conflict.
      }
    }
    if (conflictFound) return false; // Immediate return if conflict found during fanout branch justification.

    // Original: Find the gate whose output is `currentWire`.
    // This is necessary for justifying the value on `currentWire` by determining its inputs.
    const drivingGate = currentState.gatesByOutput.get(currentWire);

    // Only proceed with gate-specific backward implications if `currentWire` is an output of a gate.
    // Primary inputs do not have a driving gate and do not need backward justification from preceding logic.
    if (drivingGate) {
      log(
        `gates that ${currentWire} is an output(gates Driven By Current Wire ${currentWire}) are`
      );
      log(drivingGate);

      const currentOutputValue = backwardImplicationSigValue(
        currentState.get(currentWire)
      );

      log({ currentOutputValue });

      // Only attempt justification if the output value of the driving gate is known (not X).
      if (currentOutputValue !== SignalValue.X) {
        // Perform unique backward implications.
        // These are specific cases where an output and gate type uniquely determine one or more inputs.
        const gateInputs = drivingGate.inputs;
        const gateType = drivingGate.type;

        // Example: NOT gate (Input is uniquely determined by output).
        if (gateType === "NOT") {
          const requiredInput =
            currentOutputValue === SignalValue["0"]
              ? SignalValue["1"]
              : SignalValue["0"];
          if (currentState.get(gateInputs[0]) === SignalValue.X) {
            if (
              !currentState.assign(
                gateInputs[0],
                backwardImplicationSigValue(requiredInput)
              )
            ) {
              conflictFound = true;
              break;
            }
            processingQueue.push(gateInputs[0]); // Push new implied input to queue.
            log(
              `5 - ${gateInputs[0]} pushed to processingQueue: ${processingQueue}`
            );
          }
        }
        // Example: NAND output '0' means ALL inputs MUST be '1'.
        else if (
          gateType === "NAND" &&
          currentOutputValue === SignalValue["0"]
        ) {
          for (const inputWire of gateInputs) {
            if (currentState.get(inputWire) === SignalValue.X) {
              if (
                !currentState.assign(
                  inputWire,
                  backwardImplicationSigValue(SignalValue["1"])
                )
              ) {
                conflictFound = true;
                break;
              }
              processingQueue.push(inputWire);
              log(
                `6 - ${inputWire} pushed to processingQueue: ${processingQueue}`
              );
            }
          }
        }
        // Example: AND output '1' means ALL inputs MUST be '1'.
        else if (
          gateType === "AND" &&
          currentOutputValue === SignalValue["1"]
        ) {
          for (const inputWire of gateInputs) {
            if (currentState.get(inputWire) === SignalValue.X) {
              if (
                !currentState.assign(
                  inputWire,
                  backwardImplicationSigValue(SignalValue["1"])
                )
              ) {
                conflictFound = true;
                break;
              }
              processingQueue.push(inputWire);
              log(
                `7 - ${inputWire} pushed to processingQueue: ${processingQueue}`
              );
            }
          }
        }
        // Example: NOR output '1' means ALL inputs MUST be '0'.
        else if (
          gateType === "NOR" &&
          currentOutputValue === SignalValue["1"]
        ) {
          for (const inputWire of gateInputs) {
            if (currentState.get(inputWire) === SignalValue.X) {
              if (
                !currentState.assign(
                  inputWire,
                  backwardImplicationSigValue(SignalValue["0"])
                )
              ) {
                conflictFound = true;
                break;
              }
              processingQueue.push(inputWire);
              log(
                `8 - ${inputWire} pushed to processingQueue: ${processingQueue}`
              );
            }
          }
        }
        // Example: OR output '0' means ALL inputs MUST be '0'.
        else if (gateType === "OR" && currentOutputValue === SignalValue["0"]) {
          for (const inputWire of gateInputs) {
            if (currentState.get(inputWire) === SignalValue.X) {
              if (
                !currentState.assign(
                  inputWire,
                  backwardImplicationSigValue(SignalValue["0"])
                )
              ) {
                conflictFound = true;
                break;
              }
              processingQueue.push(inputWire);
              log(
                `9 - ${inputWire} pushed to processingQueue: ${processingQueue}`
              );
            }
          }
        }

        // Get current values of all inputs to the driving gate.
        const inputValuesForDrivingGate = drivingGate.inputs.map(inputWire =>
          currentState.get(inputWire)
        );
        // Simulate the gate with its current input values to see what output it would imply.
        log({ inputValuesForDrivingGate });
        const simulatedOutputFromInputs = simulateGate(
          drivingGate.type,
          inputValuesForDrivingGate
        );
        log({ simulatedOutputFromInputs });
        // Check if the gate's output is consistent with its current inputs, and if it needs justification.
        // J-frontier: "consists of all gates whose output value is known but is not implied by its input values." [cite: 757]
        const allInputsKnown = inputValuesForDrivingGate.every(
          val => val !== SignalValue.X
        );

        log({ allInputsKnown });

        if (allInputsKnown) {
          // If all inputs are known, the simulated output MUST match the current output.
          // If not, it's a direct conflict.
          if (
            backwardImplicationSigValue(simulatedOutputFromInputs) !==
            currentOutputValue
          ) {
            conflictFound = true; // Conflict: known inputs imply one thing, but output is another.
            break;
          } else {
            // All inputs known and consistent, so the gate's output is justified.
            log(
              `wire ${
                drivingGate.output
              } get removed from jFrontier: ${Array.from(jFrontier)}`
            );
            jFrontier.delete(drivingGate.output);
          }
        } else {
          // Inputs are not all known, but output is known. It *might* need justification.
          // If the simulated output from current inputs is X (meaning current inputs don't fully determine output),
          // or if it implies a different value than the actual known output.
          if (
            simulatedOutputFromInputs === SignalValue.X ||
            simulatedOutputFromInputs !== currentOutputValue
          ) {
            jFrontier.add(drivingGate.output); // Add to J-frontier as it needs justification.
            log(
              `wire ${drivingGate.output} get added to jFrontier: ${Array.from(
                jFrontier
              )}`
            );
          } else {
            // Even with some X inputs, the known inputs might already imply the output (e.g., AND gate with a 0 input -> output 0).
            log(
              `wire ${
                drivingGate.output
              } get removed from jFrontier: ${Array.from(jFrontier)}`
            );
            jFrontier.delete(drivingGate.output); // Remove from J-frontier.
          }
        }
      } // End of if (currentOutputValue !== SignalValue.X)
    } // End of if (drivingGate)
    if (conflictFound) return false; // Immediate return if conflict found during backward gate implications.
  } // End of while loop (processingQueue)

  return !conflictFound; // Return true if no conflict occurred throughout all implications.
}

// --- 6. Primitive D-Cube of Failure (PDF) ---
/**
 * Generates the Primitive D-Cube of Failure for a stuck-at fault on a wire.
 * For a stuck-at-0 fault, the good machine needs to be 1, faulty is 0 (D).
 * For a stuck-at-1 fault, the good machine needs to be 0, faulty is 1 (D_BAR).
 * @param {string} faultWire - The ID of the wire with the fault.
 * @param {0 | 1} faultValue - The stuck-at value (0 or 1).
 * @returns {object} An object representing the PDF (e.g., { 'wireId': SignalValue.D }).
 */
function getPDF(faultWire, faultValue) {
  const pdf = {};
  if (faultValue === 0) {
    // Stuck-at-0 (s-a-0) fault
    pdf[faultWire] = SignalValue.D; // Good machine is 1, faulty is 0
  } else {
    // Stuck-at-1 (s-a-1) fault
    pdf[faultWire] = SignalValue.D_BAR; // Good machine is 0, faulty is 1
  }
  return pdf;
}

// --- 7. D-Algorithm Recursive Function ---
/**
 * The main recursive D-Algorithm function.
 * @param {CircuitState} currentState - The current state of the circuit (values on wires).
 * @param {object} circuitInfo - Structural information of the circuit.
 * @param {Set<string>} dFrontier - Current D-frontier gates.
 * @param {Set<string>} jFrontier - Current J-frontier gates.
 * @param {ImplicationStack} implicationStack - Stack to manage decisions and backtracking.
 * @returns {CircuitState | null} A CircuitState with a test vector if found, otherwise null.
 */
function dAlgRecursive(
  currentState,
  circuitInfo,
  dFrontier,
  jFrontier,
  implicationStack
) {
  // console.count("dAlgRecursive");
  // log("currentState", currentState.values);
  log("dFrontier & jFrontier", { dFrontier, jFrontier });
  log("===================================");
  // --- Step 1: Check for Success ---
  // A test is found if an error (D or D_BAR) has propagated to any primary output (PO)
  // AND all internal lines are justified (J-frontier is empty). [cite: 25]
  const errorAtPO = circuitInfo.primaryOutputs.some(po =>
    [SignalValue.D, SignalValue.D_BAR].includes(currentState.get(po))
  );

  log(`error is ${errorAtPO ? "" : "not"} at PO`);

  // اگر ارور ب خروجی اصلی رسیده و جی فرانتیر خالی شده یعنی توجیه شده خطا یعنی تونستیم مقدار مورد نیار رو برسونیم ب خطا
  if (errorAtPO && jFrontier.size === 0) {
    return currentState; // Test found, return the current state as the test vector
  }

  // --- Step 2: Check for Unpropagatable Fault (Failure) ---
  // If the error has not reached a PO AND the D-frontier is empty,
  // it means the fault effect cannot be propagated further. [cite_start]Backtrack. [cite: 12, 25]
  if (!errorAtPO && dFrontier.size === 0) {
    log("Error is not at PO and dFrontier is empty so Error can not propagate");
    return null; // Cannot propagate fault, this path fails.
  }

  // --- Step 3: D-Drive (Propagate the fault effect) ---
  // If the error is not yet at a PO, attempt to propagate it further. [cite: 25]
  if (!errorAtPO) {
    // اگر ارور به خروجی نرسیده بود ولی همچنان تو دی فرانتر گیتی داشتیم ک قبلا امتحان نکرده بودیم اونو امتحان میکنیم
    log("Select an untried gate from the D-frontier");
    // For simplicity, we iterate. In real D-ALG, heuristics guide this choice.
    const dFrontierGates = Array.from(dFrontier);
    log(`current dFrontier: ${dFrontierGates}`);

    for (const gateOutputId of dFrontierGates) {
      const gate = currentState.gatesByOutput.get(gateOutputId);
      if (!gate) continue; // Should not happen if D-frontier is correctly managed
      log({ gate });

      // Save the current state for potential backtracking
      const savedState = currentState.clone();
      const savedDFrontier = new Set(dFrontier);
      const savedJFrontier = new Set(jFrontier);
      const savedStackSize = implicationStack.stack.length;

      const nonControllingValue = getNonControllingValue(gate.type);
      const controllingValue = getControllingValue(gate.type);
      log({ nonControllingValue, controllingValue });

      // Assign non-controlling value to all X inputs of the gate in D-frontier
      // to allow D/D_BAR to propagate.
      let assignmentSuccessful = true;
      const assignmentsMadeInThisStep = [];
      for (const inputWire of gate.inputs) {
        if (
          [SignalValue.D, SignalValue.D_BAR].includes(
            currentState.get(inputWire)
          )
        ) {
          continue; // This is the D-input, don't change it
        }
        if (currentState.get(inputWire) === SignalValue.X) {
          // For XOR/XNOR, non-controlling value depends on good machine output.
          // For simplicity, we try 0 and 1 if nonControllingValue is null.
          const valueToAssign =
            nonControllingValue !== null
              ? nonControllingValue
              : SignalValue["0"]; // Default to 0 if no clear non-controlling
          if (!currentState.assign(inputWire, valueToAssign)) {
            assignmentSuccessful = false;
            break;
          }
          implicationStack.push({
            wire: inputWire,
            value: valueToAssign,
            isDecision: true,
            triedAlternate: false,
          });
          assignmentsMadeInThisStep.push({
            wire: inputWire,
            value: valueToAssign,
          });
          log({ assignmentsMadeInThisStep });
        }
      }

      log({ assignmentSuccessful });

      if (assignmentSuccessful) {
        // Perform implications after making assignments
        const currentDFrontier = new Set(dFrontier); // Update these for the recursive call
        const currentJFrontier = new Set(jFrontier);
        if (
          implyAndCheck(
            currentState,
            circuitInfo,
            currentDFrontier,
            currentJFrontier
          )
        ) {
          log("implyAndCheck was successfulllllllll");
          const result = dAlgRecursive(
            currentState,
            circuitInfo,
            currentDFrontier,
            currentJFrontier,
            implicationStack
          );
          if (result) {
            return result; // Test found! Propagate success back.
          }
        }
      }

      // If the path failed, backtrack: restore state and try alternate (if any)
      currentState = savedState;
      dFrontier.clear();
      savedDFrontier.forEach(item => dFrontier.add(item));
      jFrontier.clear();
      savedJFrontier.forEach(item => jFrontier.add(item));
      implicationStack.trimToSize(savedStackSize); // Restore stack to before this decision

      // If we tried a default non-controlling value (like 0) and it failed, try the alternate (1)
      // This is a simplified backtracking for input assignments to D-frontier gates.
      if (nonControllingValue === null && assignmentSuccessful) {
        // Only for XOR/XNOR type behavior
        // Find the assignments made in the failed D-drive attempt
        const decisionItem = implicationStack.findUntriedAlternate(); // This needs more sophisticated tracking in stack
        // The current simple stack doesn't track specific "decisions" for D-drive,
        // so this part would be complex. For a proper D-ALG, choices are made on inputs.
        // For demonstration, we simply return null here if the first try fails.
        // A full D-ALG would explicitly manage "untried ways" for each selected gate.
      }
    }
    return null; // All D-drive paths from D-frontier failed.
  }

  // --- Step 4: Consistency (Justify internal signals) ---
  // If errorAtPO is true but J-frontier is NOT empty, we need to justify internal signals. [cite: 25]
  if (jFrontier.size > 0) {
    // Select a gate from the J-frontier.
    // Pseudo-code suggests selecting highest-numbered unjustified 0 or 1 signal.
    // For simplicity, we pick the first one.
    const gateOutputIdToJustify = Array.from(jFrontier)[0];
    const gate = currentState.gatesByOutput.get(gateOutputIdToJustify);
    if (!gate) return null; // Should not happen

    const savedState = currentState.clone();
    const savedDFrontier = new Set(dFrontier);
    const savedJFrontier = new Set(jFrontier);
    const savedStackSize = implicationStack.stack.length;

    const targetOutputValue = currentState.get(gateOutputIdToJustify);
    const controllingValue = getControllingValue(gate.type);
    const nonControllingValue = getNonControllingValue(gate.type);
    const isOutputInverted =
      gate.type === "NAND" || gate.type === "NOR" || gate.type === "NOT";

    // This part needs to iterate through 'singular cover' entries for the gate
    // to find combinations of input values that justify the target output. [cite: 369]
    // This is a simplified approach, focusing on trying values for X inputs.
    const xInputs = gate.inputs.filter(
      inputWire => currentState.get(inputWire) === SignalValue.X
    );

    if (xInputs.length === 0) {
      // All inputs are known, but the gate is still in J-frontier (meaning it's inconsistent).
      // This implies a conflict, so backtrack.
      return null;
    }

    // Simplistic justification strategy:
    // Try to set one X input to controlling value if the targetOutput requires it
    // Or set all X inputs to non-controlling if the target output requires non-controlling values from all inputs.
    // This would require a more sophisticated singular cover lookup.
    // For a general case, we can try assigning '0' then '1' to one of the X inputs.
    const inputToTry = xInputs[0]; // Select one X input to assign
    const valuesToAttempt = [SignalValue["0"], SignalValue["1"]]; // Try 0 then 1

    for (const valueToAssign of valuesToAttempt) {
      const trialState = savedState.clone(); // Start from saved state for each attempt
      const trialDFrontier = new Set(savedDFrontier);
      const trialJFrontier = new Set(savedJFrontier);
      const trialStackSize = savedStackSize;

      if (trialState.assign(inputToTry, valueToAssign)) {
        // Mark this as a decision point for backtracking
        implicationStack.push({
          wire: inputToTry,
          value: valueToAssign,
          isDecision: true,
          triedAlternate: false,
        });

        if (
          implyAndCheck(trialState, circuitInfo, trialDFrontier, trialJFrontier)
        ) {
          // Check if the current J-frontier gate is now justified.
          // Important: J-frontier is updated inside implyAndCheck.
          // If the current gate is *not* in trialJFrontier after implication, it means it's justified.
          if (!trialJFrontier.has(gateOutputIdToJustify)) {
            // Found a consistent path that justifies the target gate,
            // now continue dAlgRecursive with the new state.
            const result = dAlgRecursive(
              trialState,
              circuitInfo,
              trialDFrontier,
              trialJFrontier,
              implicationStack
            );
            if (result) {
              return result; // Test found!
            }
          } else {
            // The gate is still in J-frontier even after trying this assignment.
            // This path didn't fully justify, try next.
          }
        }
      }
      // Backtrack if this attempt fails: restore state and pop implications made in this specific branch.
      currentState = savedState;
      dFrontier.clear();
      savedDFrontier.forEach(item => dFrontier.add(item));
      jFrontier.clear();
      savedJFrontier.forEach(item => jFrontier.add(item));
      implicationStack.trimToSize(savedStackSize); // Restore stack before this decision
      // Mark the last decision as tried for its alternate.
      const lastDecision = implicationStack.peek(); // This is complex, better to manage 'isDecision' in stack
      if (
        lastDecision &&
        lastDecision.wire === inputToTry &&
        lastDecision.value === valueToAssign
      ) {
        lastDecision.triedAlternate = true; // Mark as tried if it was a decision
      }
    }
    return null; // All justification attempts for this gate failed.
  }

  // Should not reach here in a complete D-ALG unless all paths failed.
  // This indicates no test could be found on this branch.
  return null;
}

// --- 8. Main D-Algorithm Entry Point ---
/**
 * Main entry function for the D-Algorithm.
 * @param {object} circuitInfo - The structural information of the circuit.
 * @param {object} fault - The target fault { wire: string, value: 0 | 1 }.
 * @returns {object | null} The final CircuitState (test vector) if a test is found, null otherwise.
 */
function dAlg(circuitInfo, fault) {
  // console.count("dAlg");

  // Initialize circuit state with all wires to X
  const initialState = new CircuitState(circuitInfo);
  const implicationStack = new ImplicationStack(); // Stack for decisions and implications

  // Step 1: Activate the fault by applying its Primitive D-Cube of Failure (PDF).
  const pdf = getPDF(fault.wire, fault.value);
  log("pdf", pdf);

  for (const wire in pdf) {
    if (!initialState.assign(wire, pdf[wire])) {
      console.error(
        "Initial fault activation caused a conflict. Fault might be untestable/redundant."
      );
      return null;
    }

    // Push the fault activation as the first decision on the stack
    implicationStack.push({
      wire: wire,
      value: pdf[wire],
      isDecision: true,
      triedAlternate: false,
    });
  }

  const dFrontier = new Set();
  const jFrontier = new Set();

  // Perform initial implications after fault activation.
  if (!implyAndCheck(initialState, circuitInfo, dFrontier, jFrontier)) {
    log("Initial implication after fault activation resulted in a conflict.");
    return null; // Conflict means fault is untestable from the start.
  }

  log("dFrontier & jFrontier after initial implyAndCheck", {
    dFrontier,
    jFrontier,
  });

  // Call the recursive D-Algorithm function
  return dAlgRecursive(
    initialState,
    circuitInfo,
    dFrontier,
    jFrontier,
    implicationStack
  );
}

module.exports = { dAlg };
