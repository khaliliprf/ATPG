/**
 * این تابع یک مدار ترتیبی را به یک مدار ترکیبی بزرگتر با استفاده از روش بسط چارچوب زمانی تبدیل می‌کند.
 * @param {object} circuit - شیء ورودی که شامل مشخصات مدار است.
 * @param {number} numTimeFrames - تعداد چارچوب‌های زمانی برای باز کردن مدار (باید >= 1 باشد).
 * @returns {object} - یک شیء جدید که مدار باز شده را توصیف می‌کند.
 */
/**
 * نسخه اصلاح شده: کلاک به عنوان ورودی اصلی در نظر گرفته نمی‌شود.
 * @param {object} circuit - شیء ورودی که شامل مشخصات مدار است.
 * @param {number} numTimeFrames - تعداد چارچوب‌های زمانی برای باز کردن مدار (باید >= 1 باشد).
 * @returns {object} - یک شیء جدید که مدار باز شده را توصیف می‌کند.
 */
function unrollCircuit(circuit, numTimeFrames) {
  if (numTimeFrames < 1) {
    return JSON.parse(JSON.stringify(circuit));
  }

  const unrolledCircuit = {
    gates: [],
    fanouts: [],
    dffs: [],
    stuckFaults: [],
    primaryInputs: [],
    primaryOutputs: [],
    allWires: new Set(),
    initialStatePIs: [],
  };

  const getWireName = (originalName, frameIndex) => {
    if (frameIndex === 0) return originalName;
    return `${originalName}-${Math.abs(frameIndex)}`;
  };

  // --- تغییر جدید: شناسایی سیگنال‌های کلاک ---
  const clockSignals = new Set(circuit.dffs.map(dff => dff.clock));

  const firstFrameIndex = -(numTimeFrames - 1);

  // مرحله 1: باز کردن مدار برای هر چارچوب زمانی
  for (let frame = 0; frame >= firstFrameIndex; frame--) {
    circuit.gates.forEach(gate => {
      unrolledCircuit.gates.push({
        type: gate.type,
        output: getWireName(gate.output, frame),
        inputs: gate.inputs.map(input => getWireName(input, frame)),
      });
    });

    circuit.fanouts.forEach(fanout => {
      unrolledCircuit.fanouts.push({
        input: getWireName(fanout.input, frame),
        outputs: fanout.outputs.map(out => getWireName(out, frame)),
      });
    });

    circuit.stuckFaults.forEach(fault => {
      unrolledCircuit.stuckFaults.push({
        wire: getWireName(fault.wire, frame),
        value: fault.value,
      });
    });

    // --- تغییر جدید: اضافه کردن ورودی‌های اصلی به جز کلاک ---
    circuit.primaryInputs.forEach(pi => {
      if (!clockSignals.has(pi)) {
        unrolledCircuit.primaryInputs.push(getWireName(pi, frame));
      }
    });

    circuit.primaryOutputs.forEach(po => {
      unrolledCircuit.primaryOutputs.push(getWireName(po, frame));
    });
  }

  // مرحله 2: اتصال چارچوب‌ها
  circuit.dffs.forEach(dff => {
    for (let frame = 0; frame > firstFrameIndex; frame--) {
      const q_current = getWireName(dff.q, frame);
      const d_previous = getWireName(dff.d, frame - 1);
      unrolledCircuit.gates.push({
        type: "BUFF",
        output: q_current,
        inputs: [d_previous],
      });
      if (dff.q_bar) {
        unrolledCircuit.gates.push({
          type: "NOT",
          output: getWireName(dff.q_bar, frame),
          inputs: [q_current],
        });
      }
    }
  });

  // مرحله 3: تعریف نهایی ورودی‌ها و خروجی‌های حالت
  circuit.dffs.forEach(dff => {
    const q_initial_wire = getWireName(dff.q, firstFrameIndex);
    unrolledCircuit.primaryInputs.push(q_initial_wire);
    unrolledCircuit.initialStatePIs.push(q_initial_wire);

    if (dff.q_bar) {
      const q_bar_initial_wire = getWireName(dff.q_bar, firstFrameIndex);
      unrolledCircuit.primaryInputs.push(q_bar_initial_wire);
      unrolledCircuit.initialStatePIs.push(q_bar_initial_wire);
    }
    unrolledCircuit.primaryOutputs.push(getWireName(dff.d, 0));
  });

  // --- CORRECTION IS HERE --------
  // Final Step: Collect ALL wires used in the unrolled circuit.
  // This must include wires from gates, PIs, and POs to be complete.

  // 1. Add all wires from gate connections
  unrolledCircuit.gates.forEach(gate => {
    unrolledCircuit.allWires.add(gate.output);
    gate.inputs.forEach(input => unrolledCircuit.allWires.add(input));
  });

  // 2. Add all primary inputs
  unrolledCircuit.primaryInputs.forEach(pi => {
    unrolledCircuit.allWires.add(pi);
  });

  // 3. Add all primary outputs
  unrolledCircuit.primaryOutputs.forEach(po => {
    unrolledCircuit.allWires.add(po);
  });
  // --- END OF CORRECTION ---

  return unrolledCircuit;
}

module.exports = { unrollCircuit };
