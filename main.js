// --- Global Nine-Valued Logic Definitions ---
const NineValuedLogic = {
  "0/0": "0",
  "1/1": "1",
  "X/X": "X",
  D: "D", // 1/0 (Good is 1, Faulty is 0)
  D_BAR: "D_BAR", // 0/1 (Good is 0, Faulty is 1)
  "0/X": "0/X", // Good is 0, Faulty is X
  "1/X": "1/X", // Good is 1, Faulty is X
  "X/0": "X/0", // Good is X, Faulty is 0
  "X/1": "X/1", // Good is X, Faulty is 1
};

// --- Helper Functions for Logic Gate Evaluation ---
// These functions operate on Wire objects and return a NineValuedLogic string

function getNineValuedResult(good, faulty) {
  if (good === "X" || faulty === "X") {
    if (good === "0" && faulty === "X") return NineValuedLogic["0/X"];
    if (good === "1" && faulty === "X") return NineValuedLogic["1/X"];
    if (good === "X" && faulty === "0") return NineValuedLogic["X/0"];
    if (good === "X" && faulty === "1") return NineValuedLogic["X/1"];
    return NineValuedLogic["X/X"];
  }
  if (good === "1" && faulty === "0") return NineValuedLogic.D;
  if (good === "0" && faulty === "1") return NineValuedLogic.D_BAR;
  if (good === "0" && faulty === "0") return NineValuedLogic["0/0"];
  if (good === "1" && faulty === "1") return NineValuedLogic["1/1"];
  return null; // Indicates a contradiction or invalid state
}

function evaluateAND(inputWires) {
  let currentGood = inputWires[0].getGoodCircuitValue();
  let currentFaulty = inputWires[0].getFaultyCircuitValue();

  for (let i = 1; i < inputWires.length; i++) {
    const nextGood = inputWires[i].getGoodCircuitValue();
    const nextFaulty = inputWires[i].getFaultyCircuitValue();

    // Good Circuit AND logic
    if (currentGood === "0" || nextGood === "0") {
      currentGood = "0";
    } else if (currentGood === "X" || nextGood === "X") {
      currentGood = "X";
    } else {
      currentGood = "1";
    }

    // Faulty Circuit AND logic
    if (currentFaulty === "0" || nextFaulty === "0") {
      currentFaulty = "0";
    } else if (currentFaulty === "X" || nextFaulty === "X") {
      currentFaulty = "X";
    } else {
      currentFaulty = "1";
    }
  }
  return getNineValuedResult(currentGood, currentFaulty);
}

function evaluateOR(inputWires) {
  let currentGood = inputWires[0].getGoodCircuitValue();
  let currentFaulty = inputWires[0].getFaultyCircuitValue();

  for (let i = 1; i < inputWires.length; i++) {
    const nextGood = inputWires[i].getGoodCircuitValue();
    const nextFaulty = inputWires[i].getFaultyCircuitValue();

    // Good Circuit OR logic
    if (currentGood === "1" || nextGood === "1") {
      currentGood = "1";
    } else if (currentGood === "X" || nextGood === "X") {
      currentGood = "X";
    } else {
      currentGood = "0";
    }

    // Faulty Circuit OR logic
    if (currentFaulty === "1" || nextFaulty === "1") {
      currentFaulty = "1";
    } else if (currentFaulty === "X" || nextFaulty === "X") {
      currentFaulty = "X";
    } else {
      currentFaulty = "0";
    }
  }
  return getNineValuedResult(currentGood, currentFaulty);
}

function evaluateNOT(inputWire) {
  const goodVal = inputWire.getGoodCircuitValue();
  const faultyVal = inputWire.getFaultyCircuitValue();

  let newGood = "X",
    newFaulty = "X";

  if (goodVal === "0") newGood = "1";
  else if (goodVal === "1") newGood = "0";

  if (faultyVal === "0") newFaulty = "1";
  else if (faultyVal === "1") newFaulty = "0";

  return getNineValuedResult(newGood, newFaulty);
}

function evaluateNAND(inputWires) {
  const andResult = evaluateAND(inputWires);
  return evaluateNOT({
    value: andResult,
    getGoodCircuitValue: () => andResult.split("/")[0],
    getFaultyCircuitValue: () => andResult.split("/")[1],
  });
}

function evaluateNOR(inputWires) {
  const orResult = evaluateOR(inputWires);
  return evaluateNOT({
    value: orResult,
    getGoodCircuitValue: () => orResult.split("/")[0],
    getFaultyCircuitValue: () => orResult.split("/")[1],
  });
}

function evaluateXOR(inputWires) {
  let currentGood = inputWires[0].getGoodCircuitValue();
  let currentFaulty = inputWires[0].getFaultyCircuitValue();

  for (let i = 1; i < inputWires.length; i++) {
    const nextGood = inputWires[i].getGoodCircuitValue();
    const nextFaulty = inputWires[i].getFaultyCircuitValue();

    if (currentGood === "X" || nextGood === "X") {
      currentGood = "X";
    } else {
      currentGood = currentGood === nextGood ? "0" : "1";
    }

    if (currentFaulty === "X" || nextFaulty === "X") {
      currentFaulty = "X";
    } else {
      currentFaulty = currentFaulty === nextFaulty ? "0" : "1";
    }
  }
  return getNineValuedResult(currentGood, currentFaulty);
}

function evaluateBUFF(inputWire) {
  return inputWire.value;
}

function evaluateDFF(dWire, clockWire, presetWire, resetWire, lastQState) {
  const dVal_G = dWire.getGoodCircuitValue();
  const dVal_F = dWire.getFaultyCircuitValue();
  const clockVal = clockWire ? clockWire.getGoodCircuitValue() : "1";
  const presetVal = presetWire ? presetWire.getGoodCircuitValue() : "0";
  const resetVal = resetWire ? resetWire.getGoodCircuitValue() : "0";

  let nextQ_G = lastQState.split("/")[0];
  let nextQ_F = lastQState.split("/")[1];

  if (resetVal === "1") {
    nextQ_G = "0";
    nextQ_F = "0";
  } else if (presetVal === "1") {
    nextQ_G = "1";
    nextQ_F = "1";
  } else if (clockVal === "1") {
    nextQ_G = dVal_G;
    nextQ_F = dVal_F;
  }

  if (
    dVal_G === "X" ||
    clockVal === "X" ||
    presetVal === "X" ||
    resetVal === "X"
  ) {
    nextQ_G = "X";
  }
  if (
    dVal_F === "X" ||
    clockVal === "X" ||
    presetVal === "X" ||
    resetVal === "X"
  ) {
    nextQ_F = "X";
  }

  return getNineValuedResult(nextQ_G, nextQ_F);
}

// --- Wire Class ---
class Wire {
  constructor(id) {
    this.id = id;
    this.sourceNode = null;
    this.destinationNodes = new Set();
    this.value = NineValuedLogic["X/X"];
    this.faultStatus = null; // 'STUCK_AT_0' or 'STUCK_AT_1'
    this.isPrimaryInput = false;
    this.isPrimaryOutput = false;
    this.isPseudoPrimaryInput = false; // D input of DFF
    this.isPseudoPrimaryOutput = false; // Q output of DFF
  }

  setValue(val) {
    if (Object.values(NineValuedLogic).includes(val) || val === null) {
      // Allow null for contradiction
      this.value = val;
    } else {
      console.error(
        `Attempted to set invalid logic value: ${val} for wire ${this.id}.`
      );
    }
  }

  applyFault(type, value) {
    if (type === "STUCK_AT") {
      this.faultStatus = `STUCK_AT_${value}`;
    }
  }

  getGoodCircuitValue() {
    if (this.value === null) return null;
    if (this.value === NineValuedLogic.D) return "1";
    if (this.value === NineValuedLogic.D_BAR) return "0";
    if (this.value === NineValuedLogic["0/X"]) return "0";
    if (this.value === NineValuedLogic["1/X"]) return "1";
    if (
      this.value === NineValuedLogic["X/0"] ||
      this.value === NineValuedLogic["X/1"]
    )
      return "X";
    return this.value.split("/")[0];
  }

  getFaultyCircuitValue() {
    if (this.value === null) return null;
    if (this.value === NineValuedLogic.D) return "0";
    if (this.value === NineValuedLogic.D_BAR) return "1";
    if (this.value === NineValuedLogic["0/X"]) return "X";
    if (this.value === NineValuedLogic["1/X"]) return "X";
    if (this.value === NineValuedLogic["X/0"]) return "0";
    if (this.value === NineValuedLogic["X/1"]) return "1";
    return this.value.split("/")[1];
  }
}

// --- Gate Class ---
class Gate {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.inputWires = [];
    this.outputWire = null;
    this.outputWires = []; // For FANOUT type
    this.clockWire = null;
    this.presetWire = null;
    this.resetWire = null;
    this.sGraphInputs = new Set();
    this.sGraphOutputs = new Set();
    this.sequentialLevel = -1; // For sequential depth calculation
    this.lastState = NineValuedLogic["X/X"]; // For DFFs
  }

  addInput(wire) {
    this.inputWires.push(wire);
    wire.destinationNodes.add(this);
  }

  addOutput(wire) {
    if (this.type === "FANOUT") {
      this.outputWires.push(wire);
    } else {
      this.outputWire = wire;
    }
    wire.sourceNode = this;
  }

  addClock(wire) {
    if (this.type === "DFF") {
      this.clockWire = wire;
      wire.destinationNodes.add(this);
    }
  }

  addPreset(wire) {
    if (this.type === "DFF") {
      this.presetWire = wire;
      wire.destinationNodes.add(this);
    }
  }

  addReset(wire) {
    if (this.type === "DFF") {
      this.resetWire = wire;
      wire.destinationNodes.add(this);
    }
  }

  // Evaluates the gate's output based on its inputs using 9-valued logic.
  // Returns true if the output value changed, false otherwise.
  evaluate() {
    if (this.type === "DFF") return false; // DFFs are evaluated by TimeFrameExpansion logic, not here

    const oldOutputVal = this.outputWire ? this.outputWire.value : null;
    // For FANOUT, check if any output changed
    const oldFanoutVals =
      this.type === "FANOUT" ? this.outputWires.map(w => w.value) : [];

    let newOutputVal = null; // For single-output gates
    let changed = false;

    switch (this.type) {
      case "AND":
      case "OR":
      case "NOT":
      case "NAND":
      case "NOR":
      case "XOR":
      case "BUFF":
        const inputsForEval =
          this.type === "NOT" || this.type === "BUFF"
            ? this.inputWires[0]
            : this.inputWires;
        newOutputVal = {
          AND: evaluateAND,
          OR: evaluateOR,
          NOT: evaluateNOT,
          NAND: evaluateNAND,
          NOR: evaluateNOR,
          XOR: evaluateXOR,
          BUFF: evaluateBUFF,
        }[this.type](inputsForEval);

        if (this.outputWire) {
          if (this.outputWire.value !== newOutputVal) {
            this.outputWire.setValue(newOutputVal);
            changed = true;
          }
        }
        break;
      case "FANOUT":
        if (this.inputWires.length > 0) {
          const inputValue = this.inputWires[0].value;
          this.outputWires.forEach(outWire => {
            if (outWire.value !== inputValue) {
              outWire.setValue(inputValue);
              changed = true;
            }
          });
        }
        break;
      default:
        console.warn(
          `Gate type ${this.type} not fully implemented in evaluate().`
        );
        break;
    }

    // Return true if any output value actually changed
    if (this.type === "FANOUT") {
      return changed;
    } else if (this.outputWire) {
      return oldOutputVal !== this.outputWire.value;
    }
    return false;
  }

  getControllingValue() {
    switch (this.type) {
      case "AND":
      case "NAND":
        return "0";
      case "OR":
      case "NOR":
        return "1";
      default:
        return null; // No controlling value for NOT, BUFF, XOR, DFF, FANOUT
    }
  }

  getInversion() {
    switch (this.type) {
      case "NOT":
      case "NAND":
      case "NOR":
      case "XOR":
        return true; // XOR is special, but for simple inversion check, it inverts if one input is 1
      case "AND":
      case "OR":
      case "BUFF":
        return false;
      default:
        return false;
    }
  }
}

// --- Circuit Class ---
class Circuit {
  constructor() {
    this.wires = new Map();
    this.gates = new Map();
    this.primaryInputs = new Set();
    this.primaryOutputs = new Set();
    this.flipFlops = [];
    this.sGraph = new Map();
    this.isCyclic = false;
    this.sequentialDepth = 0;
    this.faults = [];
    this.dffCounter = 0; // For unique DFF IDs
    this.gateCounter = 0; // For unique generic combinatorial gate IDs (AND_0, OR_1, etc.)

    this.decisionStack = []; // For D-Algorithm backtracking
  }

  getOrCreateWire(id) {
    if (!this.wires.has(id)) {
      const wire = new Wire(id);
      this.wires.set(id, wire);
    }
    return this.wires.get(id);
  }

  parseCircuit(fileContent) {
    const lines = fileContent
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    for (const line of lines) {
      if (line.startsWith("STUCK_AT")) {
        const parts = line.split(/[ ,]+/).filter(p => p.length > 0);
        const wireId = parts[1];
        const stuckValue = parseInt(parts[2]);
        this.faults.push({ wireId: wireId, stuckValue: stuckValue });
        continue;
      }

      const parts = line.split(/[(), ]+/).filter(p => p.length > 0);
      const type = parts[0].toUpperCase();

      let currentGateId;
      let gate;

      if (type === "DFF") {
        currentGateId = `DFF_${this.dffCounter++}`;
        gate = new Gate(currentGateId, type);
        this.gates.set(currentGateId, gate);
        this.flipFlops.push(gate);
      } else {
        currentGateId = `${type}_${this.gateCounter++}`;
        gate = new Gate(currentGateId, type);
        this.gates.set(currentGateId, gate);
      }

      let outputWireFoundForGate = false;
      for (let i = 1; i < parts.length; i += 2) {
        const portType = parts[i];
        const wireId = parts[i + 1];
        const wire = this.getOrCreateWire(wireId);

        if (portType === "out") {
          gate.addOutput(wire);
          this.primaryOutputs.add(wire);
          outputWireFoundForGate = true;
        } else if (portType === "in") {
          gate.addInput(wire);
          this.primaryInputs.add(wire);
        } else if (type === "DFF") {
          switch (portType) {
            case "d":
              gate.addInput(wire);
              wire.isPseudoPrimaryInput = true;
              this.primaryInputs.add(wire);
              break;
            case "q":
              gate.addOutput(wire);
              wire.isPseudoPrimaryOutput = true;
              this.primaryOutputs.add(wire);
              outputWireFoundForGate = true;
              break;
            case "q_bar":
              gate.addOutput(wire);
              wire.isPseudoPrimaryOutput = true;
              this.primaryOutputs.add(wire);
              outputWireFoundForGate = true;
              break;
            case "clock":
              gate.addClock(wire);
              this.primaryInputs.add(wire);
              break;
            case "preset":
              gate.addPreset(wire);
              this.primaryInputs.add(wire);
              break;
            case "reset":
              gate.addReset(wire);
              this.primaryInputs.add(wire);
              break;
            default:
              console.warn(`Unknown DFF port type: ${portType}`);
          }
        } else {
          console.warn(
            `Unknown port type '${portType}' for gate type '${type}'. Line: ${line}`
          );
        }
      }

      // Sanity check for gates that must have an output
      if (!outputWireFoundForGate && type !== "FANOUT" && type !== "DFF") {
        // This warning means an 'out(...)' port was not explicitly found.
        // Depending on format, sometimes the first parameter (e.g., 'C' in AND(C), in(A)) can implicitly be the output wire.
        // Your current parsing relies on "out(...)" which is better for explicit connections.
      }
    }

    // Finalize Primary Inputs: a wire is a PI if it's not the output of any gate (sourceNode is null) AND it's an input to at least one gate.
    this.primaryInputs = new Set(
      Array.from(this.wires.values()).filter(
        wire => wire.sourceNode === null && wire.destinationNodes.size > 0
      )
    );
    // Finalize Primary Outputs: a wire is a PO if it's not an input to any gate (destinationNodes is empty) AND it's an output of at least one gate.
    this.primaryOutputs = new Set(
      Array.from(this.wires.values()).filter(
        wire => wire.destinationNodes.size === 0 && wire.sourceNode !== null
      )
    );

    console.log("Circuit parsing complete.");
    console.log("Total Wires:", this.wires.size);
    console.log("Total Gates/DFFs:", this.gates.size);
    console.log(
      "Primary Inputs:",
      Array.from(this.primaryInputs).map(w => w.id)
    );
    console.log(
      "Primary Outputs:",
      Array.from(this.primaryOutputs).map(w => w.id)
    );
    console.log(
      "Flip-Flops:",
      this.flipFlops.map(ff => ff.id)
    );
    console.log("Faults:", this.faults);

    // Build S-Graph and detect cycles/levelize ONLY if there are flip-flops
    if (this.flipFlops.length > 0) {
      this.buildSGraph();
      this.detectCyclesAndLevelize();
    } else {
      this.isCyclic = false;
      this.sequentialDepth = 0; // Combinatorial circuit, depth 0
      console.log("Circuit has no flip-flops. It is combinatorial.");
      console.log("Sequential Depth (d_seq):", this.sequentialDepth);
    }
  }

  // --- buildSGraph, detectCyclesAndLevelize --- (Only called if flipFlops.length > 0)
  buildSGraph() {
    this.sGraph = new Map();
    this.flipFlops.forEach(ff => {
      this.sGraph.set(ff.id, new Set());

      const dInputWire = ff.inputWires.find(
        w => w.isPseudoPrimaryInput && w.destinationNodes.has(ff)
      );

      if (dInputWire) {
        const q = [dInputWire.sourceNode];
        const visited = new Set();

        while (q.length > 0) {
          const currentNode = q.shift();
          if (!currentNode || visited.has(currentNode.id)) continue;
          visited.add(currentNode.id);

          if (currentNode.type === "DFF" && currentNode.id !== ff.id) {
            this.sGraph.get(ff.id).add(currentNode.id);
          }

          currentNode.inputWires.forEach(inputWire => {
            if (inputWire.sourceNode) {
              q.push(inputWire.sourceNode);
            }
          });

          if (currentNode.type === "FANOUT") {
            currentNode.outputWires.forEach(outputWire => {
              outputWire.destinationNodes.forEach(destNode => {
                q.push(destNode);
              });
            });
          }
        }
      }
    });
    console.log("S-Graph:", this.sGraph);
  }

  detectCyclesAndLevelize() {
    const numFFs = this.flipFlops.length;

    const visited = new Set();
    const recursionStack = new Set();
    const levels = new Map();
    let maxLevel = 0;

    const dfs = ffId => {
      visited.add(ffId);
      recursionStack.add(ffId);

      let currentLevel = 1;
      if (this.sGraph.has(ffId)) {
        for (const neighborFFId of this.sGraph.get(ffId)) {
          if (!visited.has(neighborFFId)) {
            if (dfs(neighborFFId)) {
              this.isCyclic = true;
              return true;
            }
          } else if (recursionStack.has(neighborFFId)) {
            this.isCyclic = true;
            return true;
          }
          if (levels.has(neighborFFId)) {
            currentLevel = Math.max(currentLevel, levels.get(neighborFFId) + 1);
          }
        }
      }

      levels.set(ffId, currentLevel);
      maxLevel = Math.max(maxLevel, currentLevel);
      recursionStack.delete(ffId);
      return false;
    };

    for (const ff of this.flipFlops) {
      if (!visited.has(ff.id)) {
        if (dfs(ff.id)) {
          break;
        }
      }
    }

    if (this.isCyclic) {
      console.log("Circuit is Cyclic.");
      this.sequentialDepth = Math.pow(9, numFFs);
    } else {
      console.log("Circuit is Cycle-Free.");
      this.sequentialDepth = maxLevel;
      console.log("Sequential Depth (d_seq):", this.sequentialDepth);
      this.flipFlops.forEach(ff => {
        if (levels.has(ff.id)) {
          ff.sequentialLevel = levels.get(ff.id);
        }
      });
    }
  }

  // --- D-Algorithm Related Methods ---
  assignAndPropagate(wire, newValue) {
    // Check for contradiction
    if (wire.value !== NineValuedLogic["X/X"]) {
      const currentGood = wire.getGoodCircuitValue();
      const currentFaulty = wire.getFaultyCircuitValue();
      const newGood = NineValuedLogic[newValue].split("/")[0];
      const newFaulty = NineValuedLogic[newValue].split("/")[1];

      if (currentGood !== "X" && newGood !== "X" && currentGood !== newGood)
        return false;
      if (
        currentFaulty !== "X" &&
        newFaulty !== "X" &&
        currentFaulty !== newFaulty
      )
        return false;
    }

    if (this.decisionStack.length > 0) {
      this.decisionStack[this.decisionStack.length - 1].changes.push({
        wire: wire,
        oldValue: wire.value,
      });
    }
    wire.setValue(newValue);
    return true;
  }

  implyAndCheck() {
    const propagationQueue = [];
    const gatesReadyToEvaluate = new Set();

    this.primaryInputs.forEach(piWire => {
      if (piWire.value !== NineValuedLogic["X/X"]) {
        piWire.destinationNodes.forEach(gate => gatesReadyToEvaluate.add(gate));
      }
    });
    this.pseudoPrimaryInputs.forEach(ppiWire => {
      if (ppiWire.value !== NineValuedLogic["X/X"]) {
        ppiWire.destinationNodes.forEach(gate =>
          gatesReadyToEvaluate.add(gate)
        );
      }
    });

    Array.from(gatesReadyToEvaluate).forEach(gate =>
      propagationQueue.push(gate)
    );

    let changedInThisPass;
    do {
      changedInThisPass = false;
      const currentQueueSnapshot = [...propagationQueue];
      propagationQueue.length = 0;

      for (const currentGate of currentQueueSnapshot) {
        if (currentGate.type === "DFF") continue;

        const gateChangedOutput = currentGate.evaluate();

        if (
          (currentGate.outputWire && currentGate.outputWire.value === null) ||
          (currentGate.type === "FANOUT" &&
            currentGate.outputWires.some(ow => ow.value === null))
        ) {
          return "FAILURE";
        }

        if (gateChangedOutput) {
          changedInThisPass = true;
          if (currentGate.outputWire) {
            currentGate.outputWire.destinationNodes.forEach(destGate =>
              propagationQueue.push(destGate)
            );
          }
          if (currentGate.type === "FANOUT") {
            currentGate.outputWires.forEach(outWire => {
              outWire.destinationNodes.forEach(destGate =>
                propagationQueue.push(destGate)
              );
            });
          }
        }
      }
    } while (changedInThisPass && propagationQueue.length > 0);

    return "SUCCESS";
  }

  dAlgorithm(faultWireId, faultStuckValue) {
    const targetFaultWire = this.wires.get(faultWireId);
    if (!targetFaultWire) {
      console.error(`Fault wire ${faultWireId} not found.`);
      return false;
    }

    this.decisionStack.push({ type: "D_ALG_REC_CALL", changes: [] });

    if (this.implyAndCheck() === "FAILURE") {
      this.popDecisionLevel();
      return false;
    }

    let goodValAtFault = faultStuckValue === 0 ? "1" : "0";
    let faultyValAtFault = faultStuckValue.toString();
    const dValueToSet = getNineValuedResult(goodValAtFault, faultyValAtFault);

    if (
      targetFaultWire.value === NineValuedLogic["X/X"] ||
      (targetFaultWire.value !== NineValuedLogic.D &&
        targetFaultWire.value !== NineValuedLogic.D_BAR)
    ) {
      if (!this.assignAndPropagate(targetFaultWire, dValueToSet)) {
        this.popDecisionLevel();
        return false;
      }
      if (this.implyAndCheck() === "FAILURE") {
        this.popDecisionLevel();
        return false;
      }
    }

    while (true) {
      if (this.isFaultDetectedAtPO()) {
        this.popDecisionLevel();
        return true;
      }

      const dFrontier = this.getDFrontier();
      const jFrontier = this.getJFrontier();

      if (
        dFrontier.size === 0 &&
        jFrontier.size === 0 &&
        !this.isFaultDetectedAtPO()
      ) {
        this.popDecisionLevel();
        return false;
      }

      if (dFrontier.size > 0) {
        const targetGate = dFrontier.values().next().value;

        this.decisionStack.push({
          type: "D_DRIVE_DECISION",
          gateId: targetGate.id,
          changes: [],
        });

        const nonControllingValue =
          targetGate.getControllingValue() === "0"
            ? NineValuedLogic["1/1"]
            : NineValuedLogic["0/0"];
        let branchSuccessful = false;

        let currentAssignmentSuccessful = true;
        for (const inputWire of targetGate.inputWires) {
          if (inputWire.value === NineValuedLogic["X/X"]) {
            if (!this.assignAndPropagate(inputWire, nonControllingValue)) {
              currentAssignmentSuccessful = false;
              break;
            }
          }
        }

        if (currentAssignmentSuccessful && this.implyAndCheck() === "SUCCESS") {
          if (this.dAlgorithm(faultWireId, faultStuckValue)) {
            branchSuccessful = true;
          }
        }

        this.popDecisionLevel();
        if (branchSuccessful) return true;

        return false;
      } else if (jFrontier.size > 0) {
        const targetGate = jFrontier.values().next().value;

        this.decisionStack.push({
          type: "J_DRIVE_DECISION",
          gateId: targetGate.id,
          changes: [],
        });

        let branchSuccessful = false;
        const requiredOutputValue = targetGate.outputWire
          ? targetGate.outputWire.value
          : NineValuedLogic["X/X"];

        let candidateInputAssignments = [];

        if (targetGate.type === "AND" || targetGate.type === "NAND") {
          if (
            requiredOutputValue === NineValuedLogic["0/0"] ||
            requiredOutputValue === NineValuedLogic.D_BAR ||
            requiredOutputValue === NineValuedLogic["X/0"]
          ) {
            for (const inputWire of targetGate.inputWires) {
              if (inputWire.value === NineValuedLogic["X/X"]) {
                let assignment = [];
                assignment.push([
                  inputWire,
                  targetGate.type === "AND"
                    ? NineValuedLogic["0/0"]
                    : NineValuedLogic["1/1"],
                ]);
                targetGate.inputWires.forEach(otherInput => {
                  if (
                    otherInput !== inputWire &&
                    otherInput.value === NineValuedLogic["X/X"]
                  ) {
                    assignment.push([
                      otherInput,
                      targetGate.type === "AND"
                        ? NineValuedLogic["1/1"]
                        : NineValuedLogic["0/0"],
                    ]);
                  }
                });
                candidateInputAssignments.push(assignment);
              }
            }
          } else if (
            requiredOutputValue === NineValuedLogic["1/1"] ||
            requiredOutputValue === NineValuedLogic.D ||
            requiredOutputValue === NineValuedLogic["X/1"]
          ) {
            let allRequiredValueAssignment = [];
            let impossible = false;
            for (const inputWire of targetGate.inputWires) {
              if (inputWire.value === NineValuedLogic["X/X"]) {
                allRequiredValueAssignment.push([
                  inputWire,
                  targetGate.type === "AND"
                    ? NineValuedLogic["1/1"]
                    : NineValuedLogic["0/0"],
                ]);
              } else if (
                inputWire.getGoodCircuitValue() !==
                (targetGate.type === "AND" ? "1" : "0")
              ) {
                impossible = true;
                break;
              }
            }
            if (!impossible && allRequiredValueAssignment.length > 0)
              candidateInputAssignments.push(allRequiredValueAssignment);
          }
        } else if (targetGate.type === "OR" || targetGate.type === "NOR") {
          if (
            requiredOutputValue === NineValuedLogic["0/0"] ||
            requiredOutputValue === NineValuedLogic.D_BAR ||
            requiredOutputValue === NineValuedLogic["X/0"]
          ) {
            let allRequiredValueAssignment = [];
            let impossible = false;
            for (const inputWire of targetGate.inputWires) {
              if (inputWire.value === NineValuedLogic["X/X"]) {
                allRequiredValueAssignment.push([
                  inputWire,
                  targetGate.type === "OR"
                    ? NineValuedLogic["0/0"]
                    : NineValuedLogic["1/1"],
                ]);
              } else if (
                inputWire.getGoodCircuitValue() !==
                (targetGate.type === "OR" ? "0" : "1")
              ) {
                impossible = true;
                break;
              }
            }
            if (!impossible && allRequiredValueAssignment.length > 0)
              candidateInputAssignments.push(allRequiredValueAssignment);
          } else if (
            requiredOutputValue === NineValuedLogic["1/1"] ||
            requiredOutputValue === NineValuedLogic.D ||
            requiredOutputValue === NineValuedLogic["X/1"]
          ) {
            for (const inputWire of targetGate.inputWires) {
              if (inputWire.value === NineValuedLogic["X/X"]) {
                let assignment = [];
                assignment.push([
                  inputWire,
                  targetGate.type === "OR"
                    ? NineValuedLogic["1/1"]
                    : NineValuedLogic["0/0"],
                ]);
                targetGate.inputWires.forEach(otherInput => {
                  if (
                    otherInput !== inputWire &&
                    otherInput.value === NineValuedLogic["X/X"]
                  ) {
                    assignment.push([
                      otherInput,
                      targetGate.type === "OR"
                        ? NineValuedLogic["0/0"]
                        : NineValuedLogic["1/1"],
                    ]);
                  }
                });
                candidateInputAssignments.push(assignment);
              }
            }
          }
        } else if (targetGate.type === "NOT" || targetGate.type === "BUFF") {
          if (
            targetGate.inputWires.length === 1 &&
            targetGate.inputWires[0].value === NineValuedLogic["X/X"]
          ) {
            let requiredInputGood = requiredOutputValue.split("/")[0];
            let requiredInputFaulty = requiredOutputValue.split("/")[1];

            if (targetGate.type === "NOT") {
              if (requiredInputGood !== "X")
                requiredInputGood = requiredInputGood === "0" ? "1" : "0";
              if (requiredInputFaulty !== "X")
                requiredInputFaulty = requiredInputFaulty === "0" ? "1" : "0";
            }
            const requiredInputNineVal = getNineValuedResult(
              requiredInputGood,
              requiredInputFaulty
            );
            if (requiredInputNineVal) {
              candidateInputAssignments.push([
                [targetGate.inputWires[0], requiredInputNineVal],
              ]);
            }
          }
        }

        if (
          candidateInputAssignments.length === 0 &&
          Array.from(targetGate.inputWires).some(
            w => w.value === NineValuedLogic["X/X"]
          )
        ) {
          let fallbackAssignment0 = [];
          let fallbackAssignment1 = [];
          for (const inputWire of targetGate.inputWires) {
            if (inputWire.value === NineValuedLogic["X/X"]) {
              fallbackAssignment0.push([inputWire, NineValuedLogic["0/0"]]);
              fallbackAssignment1.push([inputWire, NineValuedLogic["1/1"]]);
            }
          }
          if (fallbackAssignment0.length > 0)
            candidateInputAssignments.push(fallbackAssignment0);
          if (fallbackAssignment1.length > 0)
            candidateInputAssignments.push(fallbackAssignment1);
        }

        for (const assignment of candidateInputAssignments) {
          this.decisionStack.push({ type: "J_ASSIGNMENT_CHOICE", changes: [] });
          let assignmentSuccessful = true;
          for (const [wire, value] of assignment) {
            if (!this.assignAndPropagate(wire, value)) {
              assignmentSuccessful = false;
              break;
            }
          }

          if (assignmentSuccessful && this.implyAndCheck() === "SUCCESS") {
            if (this.dAlgorithm(faultWireId, faultStuckValue)) {
              branchSuccessful = true;
              break;
            }
          }
          this.popDecisionLevel();
        }

        this.popDecisionLevel();
        if (branchSuccessful) return true;
        return false;
      }

      this.popDecisionLevel();
      return false;
    }
  }

  getDFrontier() {
    const dFrontier = new Set();
    this.gates.forEach(gate => {
      if (gate.type === "DFF") return;

      const inputsWithD = gate.inputWires.filter(
        w => w.value === NineValuedLogic.D || w.value === NineValuedLogic.D_BAR
      );

      if (inputsWithD.length > 0) {
        let canPropagate = true;
        const controllingValue = gate.getControllingValue();

        for (const inputWire of gate.inputWires) {
          if (inputsWithD.includes(inputWire)) continue;

          const goodVal = inputWire.getGoodCircuitValue();
          const faultyVal = inputWire.getFaultyCircuitValue();

          if (controllingValue !== null) {
            if (goodVal !== "X" && goodVal === controllingValue) {
              canPropagate = false;
              break;
            }
            if (faultyVal !== "X" && faultyVal === controllingValue) {
              canPropagate = false;
              break;
            }
          }
        }

        if (canPropagate) {
          if (
            gate.outputWire &&
            gate.outputWire.value === NineValuedLogic["X/X"]
          ) {
            dFrontier.add(gate);
          } else if (
            gate.type === "FANOUT" &&
            gate.outputWires.some(ow => ow.value === NineValuedLogic["X/X"])
          ) {
            dFrontier.add(gate);
          }
        }
      }
    });
    return dFrontier;
  }

  getJFrontier() {
    const jFrontier = new Set();
    this.gates.forEach(gate => {
      if (gate.type === "DFF" || gate.type === "FANOUT") return;

      if (gate.outputWire && gate.outputWire.value !== NineValuedLogic["X/X"]) {
        const hasXInputs = gate.inputWires.some(
          w => w.value === NineValuedLogic["X/X"]
        );

        if (hasXInputs) {
          jFrontier.add(gate);
        }
      }
    });
    return jFrontier;
  }

  isFaultDetectedAtPO() {
    return Array.from(this.primaryOutputs).some(
      wire =>
        wire.value === NineValuedLogic.D || wire.value === NineValuedLogic.D_BAR
    );
  }

  saveCircuitState() {
    const state = new Map();
    this.wires.forEach(wire => {
      state.set(wire.id, wire.value);
    });
    return state;
  }

  restoreCircuitState(state) {
    this.wires.forEach(wire => {
      if (state.has(wire.id)) {
        wire.setValue(state.get(wire.id));
      } else {
        wire.setValue(NineValuedLogic["X/X"]);
      }
    });
  }

  popDecisionLevel() {
    if (this.decisionStack.length === 0) {
      return;
    }

    const lastDecision = this.decisionStack.pop();
    for (let i = lastDecision.changes.length - 1; i >= 0; i--) {
      const change = lastDecision.changes[i];
      change.wire.setValue(change.oldValue);
    }
    this.implyAndCheck();
  }

  resetCircuitState() {
    this.wires.forEach(wire => {
      wire.setValue(NineValuedLogic["X/X"]);
      wire.faultStatus = null;
    });
    this.gates.forEach(gate => {
      if (gate.type === "DFF") {
        gate.lastState = NineValuedLogic["X/X"];
      }
    });
    this.decisionStack = [];
  }

  resetCircuitToState(frameInitialState) {
    this.resetCircuitState();

    if (frameInitialState && frameInitialState.inputVector) {
      Array.from(frameInitialState.inputVector.entries()).forEach(
        ([wireId, value]) => {
          const wire = this.wires.get(wireId);
          if (wire && wire.isPrimaryInput) {
            wire.setValue(value);
          }
        }
      );
    }

    if (frameInitialState && frameInitialState.ffStates) {
      this.flipFlops.forEach(ff => {
        const qOutputWire = ff.outputWire;
        if (qOutputWire && frameInitialState.ffStates.has(qOutputWire.id)) {
          const dInputWire = ff.inputWires.find(w => w.isPseudoPrimaryInput);
          if (dInputWire) {
            dInputWire.setValue(frameInitialState.ffStates.get(qOutputWire.id));
          }
          ff.lastState = frameInitialState.ffStates.get(qOutputWire.id);
        } else {
          ff.lastState = NineValuedLogic["X/X"];
        }
      });
    }
  }
}

// --- TestGenerator Class ---
class TestGenerator {
  constructor(circuitContent) {
    this.originalCircuit = new Circuit();
    this.originalCircuit.parseCircuit(circuitContent);
    // console.log({ originalCircuit: this.originalCircuit });
    this.testSequences = new Map();

    this.actualPrimaryInputs = Array.from(
      this.originalCircuit.primaryInputs
    ).filter(w => !w.isPseudoPrimaryInput);
    this.actualPrimaryOutputs = Array.from(
      this.originalCircuit.primaryOutputs
    ).filter(w => !w.isPseudoPrimaryOutput);
    this.pseudoPrimaryInputs = Array.from(
      this.originalCircuit.primaryInputs
    ).filter(w => w.isPseudoPrimaryInput);
    this.pseudoPrimaryOutputs = Array.from(
      this.originalCircuit.primaryOutputs
    ).filter(w => w.isPseudoPrimaryOutput);
  }

  generateTestSequences() {
    console.log(
      "\nStarting Test Generation (Combined Combinatorial & Sequential Logic)..."
    );

    for (const fault of this.originalCircuit.faults) {
      console.log(`\nTargeting fault: ${fault.wireId} s-a-${fault.stuckValue}`);
      const faultKey = `${fault.wireId}_s_a_${fault.stuckValue}`;
      let foundTestForFault = false;
      let currentSequence = [];

      const targetFaultWire = this.originalCircuit.wires.get(fault.wireId);
      if (!targetFaultWire) {
        console.error(
          `Error: Fault wire '${fault.wireId}' not found in circuit.`
        );
        continue;
      }

      // --- Case 1: Combinatorial Circuit (No Flip-Flops) ---
      if (this.originalCircuit.flipFlops.length === 0) {
        console.log("Circuit is combinatorial. Running D-Algorithm directly.");

        this.originalCircuit.resetCircuitToState(null); // Reset all wires to X/X
        targetFaultWire.applyFault("STUCK_AT", fault.stuckValue); // Apply the fault for this run

        const success = this.originalCircuit.dAlgorithm(
          fault.wireId,
          fault.stuckValue
        );

        if (success) {
          console.log(`Fault ${faultKey} detected!`);
          const inputVector = new Map();
          Array.from(this.originalCircuit.primaryInputs).forEach(pi => {
            inputVector.set(pi.id, pi.getGoodCircuitValue());
          });
          this.testSequences.set(faultKey, [inputVector]);
          foundTestForFault = true;
        } else {
          console.log(`Fault ${faultKey} could not be detected.`);
        }
        targetFaultWire.faultStatus = null;
      }
      // --- Case 2: Sequential Circuit (Has Flip-Flops) - Time-Frame Expansion ---
      else {
        console.log("Circuit is sequential. Running Time-Frame Expansion.");

        let currentFFQOutputs = new Map();
        this.originalCircuit.flipFlops.forEach(ff => {
          if (ff.outputWire) {
            currentFFQOutputs.set(ff.outputWire.id, NineValuedLogic["X/X"]);
          }
        });

        let maxTimeFrames = this.originalCircuit.isCyclic
          ? Math.min(50, Math.pow(9, this.originalCircuit.flipFlops.length))
          : this.originalCircuit.sequentialDepth === 0
          ? 1
          : this.originalCircuit.sequentialDepth + 1;

        if (
          this.originalCircuit.sequentialDepth === 0 &&
          this.originalCircuit.flipFlops.length > 0 &&
          !this.originalCircuit.isCyclic
        ) {
          maxTimeFrames = 1;
        }

        console.log(`Max time frames to attempt: ${maxTimeFrames}`);

        for (let k = 0; k < maxTimeFrames; k++) {
          console.log(`--- Trying time frame ${k} ---`);

          const frameInitialState = {
            inputVector: new Map(),
            ffStates: currentFFQOutputs,
          };

          this.originalCircuit.decisionStack = []; // Reset decision stack for each dAlgorithm call

          this.originalCircuit.resetCircuitToState(frameInitialState);
          targetFaultWire.applyFault("STUCK_AT", fault.stuckValue);

          const dAlgSuccess = this.originalCircuit.dAlgorithm(
            fault.wireId,
            fault.stuckValue
          );

          if (dAlgSuccess) {
            foundTestForFault = true;
            const piAssignmentForThisFrame = new Map();
            Array.from(this.actualPrimaryInputs).forEach(wire => {
              piAssignmentForThisFrame.set(wire.id, wire.getGoodCircuitValue());
            });
            currentSequence.push(piAssignmentForThisFrame);

            const detectedAtCurrentPO = Array.from(
              this.actualPrimaryOutputs
            ).some(
              poWire =>
                poWire.value === NineValuedLogic.D ||
                poWire.value === NineValuedLogic.D_BAR
            );

            if (detectedAtCurrentPO) {
              console.log(
                `Fault ${faultKey} detected at PO in time frame ${k}.`
              );
              this.testSequences.set(faultKey, currentSequence);
              break;
            } else {
              currentFFQOutputs = new Map();
              this.originalCircuit.flipFlops.forEach(ff => {
                if (ff.outputWire) {
                  currentFFQOutputs.set(ff.outputWire.id, ff.outputWire.value);
                }
              });
              console.log(
                `Fault ${faultKey} propagated to FF outputs (PPOs) in time frame ${k}. Continuing to next frame.`
              );
            }
          } else {
            console.log(
              `D-Algorithm failed for fault ${faultKey} in time frame ${k}.`
            );
            if (k === maxTimeFrames - 1) {
              console.log(
                `Fault ${faultKey} seems untestable after ${maxTimeFrames} frames.`
              );
            }
            break;
          }
          targetFaultWire.faultStatus = null;
        }
      }

      if (!foundTestForFault && !this.testSequences.has(faultKey)) {
        console.log(`Fault ${faultKey} could not be detected.`);
      }
    }

    console.log("\n--- Final Test Sequences ---");
    this.testSequences.forEach((vectors, faultId) => {
      console.log(`\nFault: ${faultId}`);
      vectors.forEach((vector, idx) => {
        const piString = Array.from(vector.entries())
          .map(([wireId, val]) => `${wireId}=${val}`)
          .join(", ");
        console.log(`@${idx + 1}: ${piString}`);
      });
    });
  }
}

// --- Node.js File Reading and Execution ---
const fs = require("fs");
const circuitFilePath = "test-seq-2.txt"; // Make sure circuit.txt is in the same directory

try {
  const fileContent = fs.readFileSync(circuitFilePath, "utf8");
  const generator = new TestGenerator(fileContent);
  generator.generateTestSequences(); // This single call handles both combinatorial and sequential
} catch (error) {
  console.error(`Error reading circuit file: ${error.message}`);
}
