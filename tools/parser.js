const fs = require("fs").promises;

async function readCircuitDescription(filePath) {
  const circuit = {
    gates: [],
    fanouts: [],
    dffs: [],
    stuckFaults: [],
    primaryInputs: [],
    primaryOutputs: [],
    allWires: new Set(),
  };

  let lines;
  try {
    const data = await fs.readFile(filePath, "utf8");
    lines = data.split("\n");
  } catch (error) {
    console.error(
      `Error: File not found or could not be read at ${filePath}.`,
      error
    );
    return null;
  }

  if (!lines.length) {
    console.warn("Warning: The circuit description file is empty.");
    return circuit;
  }

  const gatePatternGeneral =
    /^(AND|OR|NOT|NAND|NOR|XOR|BUFF)\s+out\((\w+)\),(.*)$/i;
  const notGatePattern = /^NOT\s+in\((\w+)\),\s*out\((\w+)\)$/i;

  const fanoutPatternGeneral = /^FANOUT\s+in\((\w+)\),(.*)$/i;

  const dffPattern =
    /^DFF\s+d\((\w+)\),\s*clock\((\w+)\),\s*q\((\w+)\)(?:,\s*q_bar\((\w+)\))?(?:,\s*preset\((\w+)\))?(?:,\s*reset\((\w+)\))?$/i;

  const stuckAtPattern = /^STUCK_AT\s+(\w+),\s+([01])$/i;

  const allSourceWires = new Set();
  const allSinkWires = new Set();

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    let match;

    match = line.match(stuckAtPattern);
    if (match) {
      const faultWire = match[1];
      const faultValue = parseInt(match[2], 10);
      circuit.stuckFaults.push({ wire: faultWire, value: faultValue });
      circuit.allWires.add(faultWire);
      continue;
    }

    match = line.match(dffPattern);
    if (match) {
      const dInput = match[1];
      const clockWire = match[2];
      const qOutput = match[3];
      const qBarOutput = match[4] || null;
      const presetInput = match[5] || null;
      const resetInput = match[6] || null;

      const dffInfo = { d: dInput, clock: clockWire, q: qOutput };
      if (qBarOutput) dffInfo.qBar = qBarOutput;
      if (presetInput) dffInfo.preset = presetInput;
      if (resetInput) dffInfo.reset = resetInput;
      circuit.dffs.push(dffInfo);

      circuit.allWires.add(dInput).add(clockWire).add(qOutput);
      if (qBarOutput) circuit.allWires.add(qBarOutput);
      if (presetInput) circuit.allWires.add(presetInput);
      if (resetInput) circuit.allWires.add(resetInput);

      allSinkWires.add(dInput);
      allSinkWires.add(clockWire);
      if (presetInput) allSinkWires.add(presetInput);
      if (resetInput) allSinkWires.add(resetInput);

      allSourceWires.add(qOutput);
      if (qBarOutput) allSourceWires.add(qBarOutput);
      continue;
    }

    match = line.match(notGatePattern);
    if (match) {
      const gateInput = match[1];
      const gateOutput = match[2];
      circuit.gates.push({
        type: "NOT",
        output: gateOutput,
        inputs: [gateInput],
      });
      circuit.allWires.add(gateInput).add(gateOutput);
      allSinkWires.add(gateInput);
      allSourceWires.add(gateOutput);
      continue;
    }

    match = line.match(fanoutPatternGeneral);
    if (match) {
      const fanIn = match[1];
      const outputsStr = match[2];
      const outputMatches = outputsStr.matchAll(/out\((\w+)\)/gi); // Case-insensitive for wire names too
      const fanOuts = Array.from(outputMatches, m => m[1]);

      if (fanOuts.length > 0) {
        circuit.fanouts.push({ input: fanIn, outputs: fanOuts });
        circuit.allWires.add(fanIn);
        allSinkWires.add(fanIn);
        fanOuts.forEach(out => {
          circuit.allWires.add(out);
          allSourceWires.add(out);
        });
      } else {
        console.warn(
          `Warning: FANOUT line has no outputs at line ${lineNum + 1}: ${line}`
        );
      }
      continue;
    }

    match = line.match(gatePatternGeneral);
    if (match) {
      const gateType = match[1].toUpperCase();
      const gateOutput = match[2];
      const inputsStr = match[3];
      const inputMatches = inputsStr.matchAll(/in\((\w+)\)/gi);
      const gateInputs = Array.from(inputMatches, m => m[1]);

      if (gateInputs.length > 0) {
        circuit.gates.push({
          type: gateType,
          output: gateOutput,
          inputs: gateInputs,
        });
        circuit.allWires.add(gateOutput);
        allSourceWires.add(gateOutput);
        gateInputs.forEach(input => {
          circuit.allWires.add(input);
          allSinkWires.add(input);
        });
      } else {
        console.warn(
          `Warning: GATE line has no inputs at line ${lineNum + 1}: ${line}`
        );
      }
      continue;
    }

    console.warn(
      `Warning: Unrecognized line format at line ${lineNum + 1}: ${line}`
    );
  }

  circuit.primaryInputs = Array.from(allSinkWires)
    .filter(wire => !allSourceWires.has(wire))
    .sort();

  circuit.primaryOutputs = Array.from(allSourceWires)
    .filter(wire => !allSinkWires.has(wire))
    .sort();

  return circuit;
}

module.exports = { readCircuitDescription };
