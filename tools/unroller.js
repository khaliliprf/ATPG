/**
 * Final, corrected version: Creates a fully explicit netlist by detecting and generating
 * fanout objects for any wire driving more than one load. Correctly models qBar
 * for all time-frames and treats the clock implicitly.
 * @param {object} circuit - The original circuit object.
 * @param {number} numTimeFrames - The number of time-frames for unrolling.
 * @returns {object} A new object describing the explicit unrolled circuit.
 */
function unrollCircuit(circuit, numTimeFrames) {
  if (numTimeFrames < 1) {
    return JSON.parse(JSON.stringify(circuit));
  }

  const implicitCircuit = {
    gates: [],
    fanouts: [],
    dffs: [],
    stuckFaults: [],
    primaryInputs: [],
    primaryOutputs: [],
    initialStatePIs: [],
  };

  const getWireName = (originalName, frameIndex) => {
    if (frameIndex === 0) return originalName;
    return `${originalName}-${Math.abs(frameIndex)}`;
  };

  const clockSignals = new Set(circuit.dffs.map(dff => dff.clock));
  const firstFrameIndex = -(numTimeFrames - 1);

  // --- Step 1: Create a logically correct but IMPLICIT unrolled circuit ---
  for (let frame = 0; frame >= firstFrameIndex; frame--) {
    circuit.gates.forEach(g =>
      implicitCircuit.gates.push({
        type: g.type,
        output: getWireName(g.output, frame),
        inputs: g.inputs.map(i => getWireName(i, frame)),
      })
    );
    circuit.fanouts.forEach(f =>
      implicitCircuit.fanouts.push({
        input: getWireName(f.input, frame),
        outputs: f.outputs.map(o => getWireName(o, frame)),
      })
    );
    circuit.stuckFaults.forEach(s =>
      implicitCircuit.stuckFaults.push({
        wire: getWireName(s.wire, frame),
        value: s.value,
      })
    );
    circuit.primaryInputs.forEach(
      pi =>
        !clockSignals.has(pi) &&
        implicitCircuit.primaryInputs.push(getWireName(pi, frame))
    );
    circuit.primaryOutputs.forEach(po =>
      implicitCircuit.primaryOutputs.push(getWireName(po, frame))
    );
  }

  circuit.dffs.forEach(dff => {
    for (let frame = 0; frame > firstFrameIndex; frame--) {
      implicitCircuit.gates.push({
        type: "BUFF",
        output: getWireName(dff.q, frame),
        inputs: [getWireName(dff.d, frame - 1)],
      });
    }
    // CORRECTED: Use 'qBar' and ensure NOT gate is created for ALL frames
    if (dff.qBar) {
      for (let frame = 0; frame >= firstFrameIndex; frame--) {
        implicitCircuit.gates.push({
          type: "NOT",
          output: getWireName(dff.qBar, frame),
          inputs: [getWireName(dff.q, frame)],
        });
      }
    }
  });

  circuit.dffs.forEach(dff => {
    const q_initial = getWireName(dff.q, firstFrameIndex);
    implicitCircuit.primaryInputs.push(q_initial);
    implicitCircuit.initialStatePIs.push(q_initial);
    // CORRECTED: Do NOT add qBar as a primary input
    implicitCircuit.primaryOutputs.push(getWireName(dff.d, 0));
  });

  // --- Step 2: Transform the implicit circuit into an EXPLICIT one ---
  const explicitCircuit = { ...implicitCircuit, gates: [], fanouts: [] };
  const wireDestinations = new Map();

  // Pass 1: Find all destinations for every wire from both gates AND fanouts
  implicitCircuit.gates.forEach(gate => {
    gate.inputs.forEach((inputWire, index) => {
      if (!wireDestinations.has(inputWire)) wireDestinations.set(inputWire, []);
      wireDestinations
        .get(inputWire)
        .push({ component: gate, type: "gate", index });
    });
  });
  // CORRECTED: Also count fanouts as destinations
  implicitCircuit.fanouts.forEach(fanout => {
    const inputWire = fanout.input;
    if (!wireDestinations.has(inputWire)) wireDestinations.set(inputWire, []);
    wireDestinations.get(inputWire).push({ component: fanout, type: "fanout" });
  });

  const processedStems = new Set();
  const finalGates = [];
  const finalFanouts = [];

  // Pass 2: Re-write the netlist, inserting explicit fanouts
  implicitCircuit.gates.forEach(gate => {
    const newGate = { ...gate, inputs: [...gate.inputs] };
    gate.inputs.forEach((inputWire, index) => {
      const destinations = wireDestinations.get(inputWire);
      if (destinations && destinations.length > 1) {
        const destInfo = destinations.find(
          d => d.component === gate && d.index === index
        );
        const branchIndex = destinations.indexOf(destInfo);
        const newBranchName = `${inputWire}_branch_${branchIndex + 1}`;
        newGate.inputs[index] = newBranchName;
        if (!processedStems.has(inputWire)) {
          const branchNames = destinations.map(
            (d, i) => `${inputWire}_branch_${i + 1}`
          );
          finalFanouts.push({ input: inputWire, outputs: branchNames });
          processedStems.add(inputWire);
        }
      }
    });
    finalGates.push(newGate);
  });

  implicitCircuit.fanouts.forEach(fanout => {
    const inputWire = fanout.input;
    const destinations = wireDestinations.get(inputWire);
    if (destinations && destinations.length > 1) {
      const destInfo = destinations.find(d => d.component === fanout);
      const branchIndex = destinations.indexOf(destInfo);
      const newBranchName = `${inputWire}_branch_${branchIndex + 1}`;
      finalFanouts.push({ ...fanout, input: newBranchName });
    } else {
      finalFanouts.push(fanout);
    }
  });

  explicitCircuit.gates = finalGates;
  explicitCircuit.fanouts = finalFanouts;

  // Final Step: Collect ALL wires from the final, explicit netlist.
  explicitCircuit.allWires = new Set();
  explicitCircuit.gates.forEach(g => {
    explicitCircuit.allWires.add(g.output);
    g.inputs.forEach(i => explicitCircuit.allWires.add(i));
  });
  explicitCircuit.fanouts.forEach(f => {
    explicitCircuit.allWires.add(f.input);
    f.outputs.forEach(o => explicitCircuit.allWires.add(o));
  });
  explicitCircuit.primaryInputs.forEach(pi => explicitCircuit.allWires.add(pi));
  explicitCircuit.primaryOutputs.forEach(po =>
    explicitCircuit.allWires.add(po)
  );

  return explicitCircuit;
}

module.exports = { unrollCircuit };
