// کلاس برای نمایش یک خط (Wire) در مدار
class Wire {
  constructor(id) {
    this.id = id;
    this.sourceNode = null; // گره منبع (خروجی گیت/فلیپ فلاپ)
    this.destinationNodes = new Set(); // لیست گره‌های مقصد (ورودی گیت‌ها/فلیپ فلاپ‌ها). استفاده از Set برای جلوگیری از تکرار
    this.value = NineValuedLogic["X/X"]; // مقدار فعلی خط، پیش‌فرض X/X
    this.faultStatus = null; // null, 'STUCK_AT_0', 'STUCK_AT_1'
    this.isPrimaryInput = false; // ورودی اصلی مدار
    this.isPrimaryOutput = false; // خروجی اصلی مدار
    this.isPseudoPrimaryInput = false; // PPI - ورودی دیتا DFF
    this.isPseudoPrimaryOutput = false; // PPO - خروجی Q/Q_bar DFF
  }

  // متد برای تنظیم مقدار خط
  setValue(val) {
    if (Object.values(NineValuedLogic).includes(val)) {
      this.value = val;
    } else {
      console.warn(`Invalid logic value: ${val} for wire ${this.id}`);
    }
  }

  // متد برای اعمال خطا روی خط
  applyFault(type, value) {
    if (type === "STUCK_AT") {
      this.faultStatus = `STUCK_AT_${value}`;
    }
  }

  // بازگرداندن مقدار حقیقی خط (بدون خطا)
  getGoodCircuitValue() {
    if (this.faultStatus === "STUCK_AT_0") return "0"; // اگر خط دارای خطای Stuck-At باشد
    if (this.faultStatus === "STUCK_AT_1") return "1"; // مقدارش در مدار "بدون خطا" باید مقدار صحیح باشد.
    // این تابع باید مقدار "بدون خطا"ی یک NineValuedLogic را برگرداند.
    // این نیاز به بازنگری دارد بسته به نحوه استفاده از faultStatus
    // در حال حاضر فرض می کنیم NineValuedLogic فقط حالت "مشاهده شده" را نشان می دهد

    if (this.value === NineValuedLogic.D) return "1";
    if (this.value === NineValuedLogic.D_BAR) return "0";
    if (this.value === NineValuedLogic["0/X"]) return "0";
    if (this.value === NineValuedLogic["1/X"]) return "1";
    // if (this.value === NineValuedLogic['X/0']) return 'X'; // These are tricky, depends on how X is handled in good circuit
    // if (this.value === NineValuedLogic['X/1']) return 'X';
    if (
      this.value === NineValuedLogic["X/0"] ||
      this.value === NineValuedLogic["X/1"]
    )
      return "X"; // For good circuit, X/0 or X/1 means X
    return this.value.split("/")[0]; // برای 0/0, 1/1, X/X
  }

  // بازگرداندن مقدار خطا دار خط (اگر خطا اعمال شده باشد)
  getFaultyCircuitValue() {
    if (this.faultStatus === "STUCK_AT_0") return "0";
    if (this.faultStatus === "STUCK_AT_1") return "1";

    if (this.value === NineValuedLogic.D) return "0";
    if (this.value === NineValuedLogic.D_BAR) return "1";
    if (this.value === NineValuedLogic["0/X"]) return "X";
    if (this.value === NineValuedLogic["1/X"]) return "X";
    if (this.value === NineValuedLogic["X/0"]) return "0";
    if (this.value === NineValuedLogic["X/1"]) return "1";
    return this.value.split("/")[1]; // برای 0/0, 1/1, X/X
  }
}

// کلاس برای نمایش یک گیت (Gate) یا فلیپ فلاپ (DFF)
class Gate {
  constructor(id, type) {
    this.id = id;
    this.type = type; // AND, OR, NOT, NAND, NOR, XOR, BUFF, FANOUT, DFF
    this.inputWires = []; // لیست Wireهای ورودی
    this.outputWire = null; // Wire خروجی (برای گیت های معمولی). FANOUTs به طور متفاوت مدیریت می شوند
    this.outputWires = []; // برای FANOUT ها
    this.clockWire = null; // برای DFF
    this.presetWire = null; // برای DFF (اختیاری)
    this.resetWire = null; // برای DFF (اختیاری)
    this.sGraphInputs = new Set(); // شناسه FFهای ورودی در s-graph
    this.sGraphOutputs = new Set(); // شناسه FFهای خروجی در s-graph
    this.sequentialLevel = -1; // سطح در s-graph برای مدارهای بدون سیکل
    this.lastState = NineValuedLogic["X/X"]; // برای DFF ها، حالت قبلی (Q output)
  }

  // متد برای اضافه کردن ورودی
  addInput(wire) {
    this.inputWires.push(wire);
    wire.destinationNodes.add(this); // اضافه کردن این گیت به لیست مقصد سیم
  }

  // متد برای اضافه کردن خروجی
  addOutput(wire) {
    if (this.type === "FANOUT") {
      this.outputWires.push(wire);
    } else {
      this.outputWire = wire;
    }
    wire.sourceNode = this; // تنظیم گیت فعلی به عنوان منبع سیم
  }

  // متد برای اضافه کردن ورودی کلاک (فقط برای DFF)
  addClock(wire) {
    if (this.type === "DFF") {
      this.clockWire = wire;
      wire.destinationNodes.add(this);
    }
  }

  // متد برای اضافه کردن preset (فقط برای DFF)
  addPreset(wire) {
    if (this.type === "DFF") {
      this.presetWire = wire;
      wire.destinationNodes.add(this);
    }
  }

  // متد برای اضافه کردن reset (فقط برای DFF)
  addReset(wire) {
    if (this.type === "DFF") {
      this.resetWire = wire;
      wire.destinationNodes.add(this);
    }
  }

  // پیاده سازی منطق گیت برای هر نوع
  // این یک ساده سازی است و برای منطق 9-مقدار باید پیچیده تر شود
  // این متد در فاز ATPG ترکیباتی استفاده خواهد شد.
  evaluate() {
    const inputWireValues = this.inputWires.map(wire => wire.value);
    let outputNineVal = NineValuedLogic["X/X"];

    switch (this.type) {
      case "AND":
        outputNineVal = evaluateAND(this.inputWires);
        break;
      case "OR":
        outputNineVal = evaluateOR(this.inputWires);
        break;
      case "NOT":
        outputNineVal = evaluateNOT(this.inputWires[0]);
        break;
      case "NAND":
        outputNineVal = evaluateNAND(this.inputWires);
        break;
      case "NOR":
        outputNineVal = evaluateNOR(this.inputWires);
        break;
      case "XOR":
        outputNineVal = evaluateXOR(this.inputWires);
        break;
      case "BUFF":
        outputNineVal = evaluateBUFF(this.inputWires[0]);
        break;
      case "FANOUT":
        // FANOUT فقط مقدار ورودی را به تمام خروجی‌ها منتقل می‌کند.
        // در مدل ما، این به طور خودکار انجام می‌شود زیرا outputWire/outputWires
        // مستقیماً به inputWire متصل هستند. اینجا کاری لازم نیست.
        if (this.inputWires[0] && this.outputWires.length > 0) {
          this.outputWires.forEach(outWire =>
            outWire.setValue(this.inputWires[0].value)
          );
        }
        return; // FANOUTs do not have a single outputWire like other gates
      case "DFF":
        // DFF evaluation is more complex and typically happens during simulation step
        // rather than a simple combinatorial evaluate.
        // For combinatorial ATPG (like D-Algorithm on a single time-frame),
        // DFF's Q output is treated as a PPO, and D input as PPI.
        // The actual state update happens between time-frames.
        // This `evaluate` method for DFFs should be used cautiously,
        // perhaps only for initial implication within a time-frame if DFF is part of combinatorial loop.
        // For now, let's just make it pass the D input value through, simplified.
        if (this.inputWires[0]) {
          // Assuming D input is first inputWire
          outputNineVal = this.input.Wires[0].value;
        }
        break;
      default:
        console.warn(`Evaluation not implemented for gate type: ${this.type}`);
    }
    if (this.outputWire) {
      this.outputWire.setValue(outputNineVal);
    } else if (this.outputWires.length > 0 && this.type !== "FANOUT") {
      // Should not happen for non-FANOUT gates
      console.error(
        `Gate ${this.id} of type ${this.type} has multiple outputs but is not a FANOUT.`
      );
    }
  }

  // متد برای گرفتن مقدار کنترل‌کننده (مثلاً 0 برای AND/NAND، 1 برای OR/NOR)
  getControllingValue() {
    switch (this.type) {
      case "AND":
      case "NAND":
        return "0";
      case "OR":
      case "NOR":
        return "1";
      default:
        return null; // برای BUFF, XOR, DFF و FANOUT مقدار کنترلی معنی ندارد
    }
  }

  // متد برای گرفتن وارونگی (true برای NOT, NAND, NOR, XOR؛ false برای AND, OR, BUFF)
  getInversion() {
    switch (this.type) {
      case "NOT":
      case "NAND":
      case "NOR":
      case "XOR":
        return true;
      case "AND":
      case "OR":
      case "BUFF":
        return false;
      default:
        return false; // DFF, FANOUT
    }
  }
}

// کلاس اصلی مدار که شامل گیت‌ها، خطوط و منطق پردازش است
class Circuit {
  constructor() {
    this.wires = new Map(); // Map<string, Wire>
    this.gates = new Map(); // Map<string, Gate>
    this.primaryInputs = new Set(); // Set<Wire> برای جلوگیری از تکرار
    this.primaryOutputs = new Set(); // Set<Wire>
    this.flipFlops = []; // لیست Gate های DFF
    this.sGraph = new Map(); // Map<FF_id, Set<FF_id>> برای نگهداری گراف ترتیبی
    this.isCyclic = false;
    this.sequentialDepth = 0;
    this.faults = []; // لیست خطاها
    this.dffCounter = 0; // برای تولید ID منحصر به فرد DFF ها
  }

  // متد کمکی برای دریافت یا ایجاد یک خط
  getOrCreateWire(id) {
    if (!this.wires.has(id)) {
      const wire = new Wire(id);
      this.wires.set(id, wire);
    }
    return this.wires.get(id);
  }

  // پردازش فایل ورودی
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
        const wire = this.getOrCreateWire(wireId);
        wire.applyFault("STUCK_AT", stuckValue);
        this.faults.push({ wireId: wire.id, stuckValue });
        continue;
      }

      // مثال: AND out(C), in(A), in(B)
      // FANOUT in(s), out(a), out(b), out(c)
      // DFF d(E), clock(ck), Q(A), q_bar(C), preset(P), reset(R)
      const parts = line.split(/[(), ]+/).filter(p => p.length > 0);
      const type = parts[0].toUpperCase();

      let gateInstanceId;
      let gate;

      if (type === "DFF") {
        gateInstanceId = `DFF_${this.dffCounter++}`; // ایجاد ID منحصر به فرد برای DFF
        gate = new Gate(gateInstanceId, type);
        this.gates.set(gateInstanceId, gate);
        this.flipFlops.push(gate);
      } else {
        gateInstanceId = parts[1]; // برای گیت‌های معمولی و FANOUT، نام گیت/فن‌آوت
        gate = this.gates.get(gateInstanceId);
        if (!gate) {
          gate = new Gate(gateInstanceId, type);
          this.gates.set(gateInstanceId, gate);
        }
      }

      // پارس کردن ورودی‌ها و خروجی‌های گیت/فلیپ‌فلاپ
      for (let i = 1; i < parts.length; i += 2) {
        const portType = parts[i]; // 'out', 'in', 'd', 'q', 'q_bar', 'clock', 'preset', 'reset'
        const wireId = parts[i + 1];
        const wire = this.getOrCreateWire(wireId);

        if (portType === "out") {
          gate.addOutput(wire);
          this.primaryOutputs.add(wire); // ابتدا همه خروجی‌های گیت‌ها را PO فرض می‌کنیم
        } else if (portType === "in") {
          gate.addInput(wire);
          this.primaryInputs.add(wire); // ابتدا همه ورودی‌های گیت‌ها را PI فرض می‌کنیم
        } else if (type === "DFF") {
          // مدیریت پورت‌های خاص DFF
          switch (portType) {
            case "d":
              gate.addInput(wire);
              wire.isPseudoPrimaryInput = true;
              this.primaryInputs.add(wire); // DFF's D input acts as PI for combinational block
              break;
            case "q":
              gate.addOutput(wire);
              wire.isPseudoPrimaryOutput = true;
              this.primaryOutputs.add(wire); // DFF's Q output acts as PO for combinational block
              break;
            case "q_bar":
              // For q_bar, we can either treat it as another output or ignore it based on requirements
              // For now, adding it as an output and making it a PPO
              gate.addOutput(wire); // Treat q_bar as another output
              wire.isPseudoPrimaryOutput = true;
              this.primaryOutputs.add(wire);
              break;
            case "clock":
              gate.addClock(wire);
              this.primaryInputs.add(wire); // Clock is a primary input
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
    }

    // اصلاح نهایی Primary Inputs و Primary Outputs
    // یک Wire ورودی اصلی است اگر منبعی نداشته باشد (sourceNode == null)
    // یک Wire خروجی اصلی است اگر مقصدی نداشته باشد (destinationNodes.size == 0)
    this.primaryInputs = new Set(
      Array.from(this.primaryInputs).filter(wire => wire.sourceNode === null)
    );
    this.primaryOutputs = new Set(
      Array.from(this.primaryOutputs).filter(
        wire => wire.destinationNodes.size === 0
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

    // فراخوانی متدهای تحلیل S-Graph فقط یک بار
    this.buildSGraph(); // ساخت s-graph
    this.detectCyclesAndLevelize(); // تشخیص سیکل و تراز‌بندی
  }

  // ساخت S-Graph
  buildSGraph() {
    this.sGraph = new Map(); // Reset sGraph for re-building if parseCircuit is called multiple times
    this.flipFlops.forEach(ff => {
      this.sGraph.set(ff.id, new Set());

      // Find the D-input wire for the current flip-flop
      const dInputWire = ff.inputWires.find(
        w => w.isPseudoPrimaryInput && w.destinationNodes.has(ff)
      );

      if (dInputWire) {
        const q = [dInputWire.sourceNode]; // Start BFS from the gate driving the D-input
        const visited = new Set();

        while (q.length > 0) {
          const currentNode = q.shift();
          if (!currentNode || visited.has(currentNode.id)) continue;
          visited.add(currentNode.id);

          // Check if this node is an output of another flip-flop
          if (currentNode.type === "DFF" && currentNode.id !== ff.id) {
            this.sGraph.get(ff.id).add(currentNode.id); // Current FF depends on this other FF
          }

          // Traverse backward through input wires to find other influencing FFs or PIs
          currentNode.inputWires.forEach(inputWire => {
            if (inputWire.sourceNode) {
              // If the input wire is driven by another gate/FF
              q.push(inputWire.sourceNode);
            }
          });

          // For FANOUTs, need to ensure all fanout branches are explored
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

  // تشخیص سیکل و تراز‌بندی (Levelization) S-Graph
  detectCyclesAndLevelize() {
    const numFFs = this.flipFlops.length;
    if (numFFs === 0) {
      this.isCyclic = false;
      this.sequentialDepth = 0;
      return;
    }

    const visited = new Set();
    const recursionStack = new Set();
    const levels = new Map(); // Map<FF_id, level>
    let maxLevel = 0;

    // DFS برای تشخیص سیکل و تراز‌بندی
    const dfs = ffId => {
      visited.add(ffId);
      recursionStack.add(ffId);

      let currentLevel = 1; // شروع از سطح 1
      if (this.sGraph.has(ffId)) {
        for (const neighborFFId of this.sGraph.get(ffId)) {
          if (!visited.has(neighborFFId)) {
            if (dfs(neighborFFId)) {
              this.isCyclic = true;
              return true; // Cycle detected
            }
          } else if (recursionStack.has(neighborFFId)) {
            this.isCyclic = true;
            return true; // Cycle detected (back edge)
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

    // اجرای DFS برای تمام FF ها
    for (const ff of this.flipFlops) {
      if (!visited.has(ff.id)) {
        if (dfs(ff.id)) {
          // سیکل پیدا شد، نیازی به ادامه DFS نیست
          break;
        }
      }
    }

    if (this.isCyclic) {
      console.log("Circuit is Cyclic.");
      // طبق اسلایدها، برای مدارهای سیکلی sequential depth می تواند تا 9^Nff باشد. [cite: 344, 345]
      this.sequentialDepth = Math.pow(9, numFFs);
    } else {
      console.log("Circuit is Cycle-Free.");
      this.sequentialDepth = maxLevel;
      console.log("Sequential Depth (d_seq):", this.sequentialDepth);
      // FF levels can be stored in the FF objects themselves if needed later
      this.flipFlops.forEach(ff => {
        if (levels.has(ff.id)) {
          ff.sequentialLevel = levels.get(ff.id);
        }
      });
    }
  }

  // تابع برای اعمال یک مقدار به یک سیم و انتشار آن
  // returns true if successful, false if contradiction
  propagateValue(wire, value) {
    // console.log(`Propagating ${value} to wire ${wire.id}`);
    // Check for contradiction
    if (wire.value !== NineValuedLogic["X/X"] && wire.value !== value) {
      // If current value is X/X, no contradiction
      // If current value is D and new value is D_BAR, or vice versa
      // Or if current value is 0/0 and new value is 1/1, etc.
      // This is a simplified check. A full Nine-Valued contradiction check is more complex.
      const currentGood = wire.getGoodCircuitValue();
      const currentFaulty = wire.getFaultyCircuitValue();
      const newGood = NineValuedLogic[value].split("/")[0];
      const newFaulty = NineValuedLogic[value].split("/")[1];

      if (
        (currentGood !== "X" && newGood !== "X" && currentGood !== newGood) ||
        (currentFaulty !== "X" &&
          newFaulty !== "X" &&
          currentFaulty !== newFaulty)
      ) {
        // console.log(`Contradiction on wire ${wire.id}: current=${wire.value}, new=${value}`);
        return false; // Contradiction
      }
    }
    wire.setValue(value);
    return true;
  }

  // Imply_and_check - انتشار مقادیر و بررسی تناقضات
  // این تابع به صورت ضمنی کار می‌کند. تمام گیت‌هایی که ورودی‌هایشان مشخص شده‌اند را ارزیابی می‌کند.
  // و تناقضات را گزارش می‌دهد.
  implyAndCheck() {
    let changed = true;
    while (changed) {
      changed = false;
      // یک صف از گیت‌هایی که ممکن است خروجی‌شان تغییر کند
      const evaluationQueue = [];

      // ابتدا تمام گیت‌هایی که ورودی‌هایشان مشخص شده‌اند را اضافه کن
      this.gates.forEach(gate => {
        const allInputsKnown = gate.inputWires.every(
          w => w.value !== NineValuedLogic["X/X"]
        );
        if (allInputsKnown) {
          // اگر همه ورودی‌ها مشخص شدند، گیت را ارزیابی کن
          evaluationQueue.push(gate);
        }
      });

      // انتشار مقادیر
      while (evaluationQueue.length > 0) {
        const currentGate = evaluationQueue.shift();

        // مقداردهی قبلی خروجی را ذخیره کن برای بررسی تغییر
        let prevOutputValue = currentGate.outputWire
          ? currentGate.outputWire.value
          : currentGate.outputWires.length > 0
          ? currentGate.outputWires[0].value
          : null;

        currentGate.evaluate(); // ارزیابی گیت

        let newOutputValue = currentGate.outputWire
          ? currentGate.outputWire.value
          : currentGate.outputWires.length > 0
          ? currentGate.outputWires[0].value
          : null;

        if (prevOutputValue !== newOutputValue && newOutputValue !== null) {
          changed = true;
          // اگر خروجی تغییر کرد و دارای مقصد است، گیت‌های مقصد را به صف اضافه کن
          if (currentGate.outputWire) {
            currentGate.outputWire.destinationNodes.forEach(destGate => {
              evaluationQueue.push(destGate);
            });
          } else if (currentGate.outputWires.length > 0) {
            // For FANOUT
            currentGate.outputWires.forEach(outWire => {
              outWire.destinationNodes.forEach(destGate => {
                evaluationQueue.push(destGate);
              });
            });
          }
        }

        // بررسی تناقضات (ساده شده)
        if (newOutputValue === null) {
          // اگر evaluateNull برگرداند، به معنی تناقض است
          return "FAILURE";
        }
      }
    }
    return "SUCCESS";
  }

  // D-Algorithm - الگوریتم تولید تست ترکیبی
  // این یک پیاده سازی ساده است و نیاز به مدیریت کامل D-frontier و J-frontier دارد
  // و همچنین بک‌ترکینگ را باید به صورت دقیق‌تر مدیریت کند.
  // این تابع برای یک قاب زمانی (Combinational logic) کار می‌کند.
  dAlgorithm(faultWireId, faultValue, currentFrameState) {
    // وضعیت اولیه مدار را تنظیم کنید (از currentFrameState استفاده کنید)
    this.resetCircuitToState(currentFrameState);

    const targetFaultWire = this.wires.get(faultWireId);
    if (!targetFaultWire) {
      console.error(`Fault wire ${faultWireId} not found.`);
      return false;
    }

    // Apply the fault for this execution. For TFE, fault exists in all frames.
    // But for *this* combinatorial D-alg run, we only activate it once.
    const originalFaultStatus = targetFaultWire.faultStatus;
    targetFaultWire.applyFault("STUCK_AT", faultValue);

    // 1. فعال‌سازی خطا (Activate the fault)
    let activationValue = faultValue === 0 ? "1" : "0"; // برای s-a-0، به 1 نیاز داریم
    if (
      !this.propagateValue(
        targetFaultWire,
        getNineValuedResult(activationValue, faultValue.toString())
      )
    ) {
      // good/faulty
      targetFaultWire.faultStatus = originalFaultStatus; // Revert fault
      return false; // Cannot activate
    }

    // Imply and check after activation
    if (this.implyAndCheck() === "FAILURE") {
      targetFaultWire.faultStatus = originalFaultStatus; // Revert fault
      return false; // Contradiction during activation
    }

    // 2. انتشار خطا به خروجی اصلی (Propagate fault effect to PO)
    let dFrontier = this.getDFrontier();
    let jFrontier = this.getJFrontier();

    // Recursively try to propagate and justify
    const recursiveDAlg = () => {
      if (this.isFaultDetectedAtPO()) {
        // اگر خطا به PO رسید
        // console.log("Fault propagated to PO.");
        targetFaultWire.faultStatus = originalFaultStatus; // Revert fault
        return true; // Success
      }

      if (dFrontier.size === 0 && !this.isFaultDetectedAtPO()) {
        // اگر D-frontier خالی بود و خطا به PO نرسیده بود [cite: 12]
        return false; // Cannot propagate further (need to backtrack)
      }

      // D-Drive: انتخاب یک گیت از D-frontier و تلاش برای انتشار
      if (dFrontier.size > 0) {
        for (const gate of dFrontier) {
          // Try each gate in D-frontier
          // Make a decision here (assign non-controlling value to other inputs of D-frontier gate)
          const inputsToSet = gate.inputWires.filter(
            w => w.value === NineValuedLogic["X/X"]
          );
          const nonControlling = gate.getControllingValue() === "0" ? "1" : "0"; // مخالف مقدار کنترلی

          // Try to set all X inputs to non-controlling value
          // This is a decision point, needs backtracking
          const savedValues = this.saveCircuitState(); // Save state before decision
          let success = true;
          for (const inputWire of inputsToSet) {
            if (
              !this.propagateValue(
                inputWire,
                NineValuedLogic[nonControlling + "/" + nonControlling]
              )
            ) {
              success = false;
              break;
            }
          }

          if (success && this.implyAndCheck() === "SUCCESS") {
            // Recalculate frontiers
            dFrontier = this.getDFrontier();
            jFrontier = this.getJFrontier();
            if (recursiveDAlg()) return true; // Recursive call
          }
          this.restoreCircuitState(savedValues); // Backtrack
        }
      }

      // J-Drive (Line Justification): توجیه مقادیر در J-frontier
      if (jFrontier.size > 0) {
        for (const gate of jFrontier) {
          // Similar to D-Drive, try to justify inputs
          const inputsToSet = gate.inputWires.filter(
            w => w.value === NineValuedLogic["X/X"]
          );
          const controlling = gate.getControllingValue();

          // This part needs more sophisticated justification logic (e.g., choosing one input to set to controlling, others to non-controlling)
          // For simplicity, we try to set one input to controlling value and others to non-controlling.
          for (const inputWire of inputsToSet) {
            const savedValues = this.saveCircuitState();
            if (
              this.propagateValue(
                inputWire,
                NineValuedLogic[controlling + "/" + controlling]
              )
            ) {
              if (this.implyAndCheck() === "SUCCESS") {
                // Recalculate frontiers
                dFrontier = this.getDFrontier();
                jFrontier = this.getJFrontier();
                if (recursiveDAlg()) return true;
              }
            }
            this.restoreCircuitState(savedValues); // Backtrack
          }
        }
      }

      return false; // No path found
    };

    const result = recursiveDAlg();
    targetFaultWire.faultStatus = originalFaultStatus; // Restore original fault status for next fault
    return result;
  }

  // متدهای کمکی برای D-Algorithm
  getDFrontier() {
    const dFrontier = new Set();
    this.gates.forEach(gate => {
      if (gate.outputWire && gate.outputWire.value === NineValuedLogic["X/X"]) {
        const hasD = gate.inputWires.some(
          w =>
            w.value === NineValuedLogic.D || w.value === NineValuedLogic.D_BAR
        );
        if (hasD) {
          dFrontier.add(gate);
        }
      }
      // For FANOUTs, if its input is D/D_BAR and any output is X/X
      if (
        gate.type === "FANOUT" &&
        gate.inputWires[0] &&
        (gate.inputWires[0].value === NineValuedLogic.D ||
          gate.inputWires[0].value === NineValuedLogic.D_BAR)
      ) {
        if (gate.outputWires.some(w => w.value === NineValuedLogic["X/X"])) {
          dFrontier.add(gate);
        }
      }
    });
    return dFrontier;
  }

  getJFrontier() {
    const jFrontier = new Set();
    this.gates.forEach(gate => {
      // Check if gate output is known but not implied by inputs
      // This is a simplified check for J-Frontier. Needs full evaluation.
      if (gate.outputWire && gate.outputWire.value !== NineValuedLogic["X/X"]) {
        const prevOutputValue = gate.outputWire.value;
        gate.evaluate(); // Evaluate to get implied value
        if (gate.outputWire.value !== prevOutputValue) {
          // If evaluation changed output (meaning it was not justified)
          jFrontier.add(gate);
        }
        gate.outputWire.setValue(prevOutputValue); // Restore original value
      } else if (
        gate.type === "FANOUT" &&
        gate.inputWires[0] &&
        gate.inputWires[0].value !== NineValuedLogic["X/X"]
      ) {
        // For FANOUT, if input is known but outputs are X, need to justify outputs
        if (gate.outputWires.some(w => w.value === NineValuedLogic["X/X"])) {
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

  // برای بک‌ترکینگ: ذخیره و بازیابی حالت مدار
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
        wire.setValue(NineValuedLogic["X/X"]); // Reset if not in saved state
      }
    });
  }

  // متد برای ریست کردن مدار به حالت اولیه (همه X)
  resetCircuitState() {
    this.wires.forEach(wire => {
      wire.setValue(NineValuedLogic["X/X"]);
      wire.faultStatus = null; // Clear fault status applied for a specific run
    });
    this.gates.forEach(gate => {
      if (gate.type === "DFF") {
        gate.lastState = NineValuedLogic["X/X"];
      }
    });
  }

  // متد برای تنظیم وضعیت مدار از یک حالت مشخص (برای Time-Frame Expansion)
  resetCircuitToState(state) {
    this.resetCircuitState(); // Clear all current values first
    if (state) {
      for (const wireId in state.wires) {
        const wire = this.wires.get(wireId);
        if (wire) wire.setValue(state.wires[wireId]);
      }
      for (const ffId in state.ffStates) {
        const ff = this.gates.get(ffId); // Assuming FF IDs are in this.gates map
        if (ff && ff.type === "DFF") {
          ff.lastState = state.ffStates[ffId];
        }
      }
      // Reapply original faults from this.faults list
      this.faults.forEach(f => {
        const wire = this.wires.get(f.wireId);
        if (wire) wire.applyFault("STUCK_AT", f.stuckValue);
      });
    }
  }
}

// ... (کدهای NineValuedLogic, Wire, Gate و Circuit بالا) ...

class TestGenerator {
  constructor(circuitContent) {
    this.originalCircuit = new Circuit();
    this.originalCircuit.parseCircuit(circuitContent);
    this.testVectors = new Map(); // Map<faultId, Array<Map<wireId, value>>>
  }

  // تابع اصلی برای اجرای Time-Frame Expansion و تولید تست
  generateTestSequences() {
    console.log("\nStarting Test Generation...");

    // Iterate through each fault
    for (const fault of this.originalCircuit.faults) {
      console.log(`\nTargeting fault: ${fault.wireId} s-a-${fault.stuckValue}`);
      let foundTest = false;
      const currentTestSequence = [];
      let currentFFStates = new Map(); // Map<FF_id, NineValuedLogicValue> representing Q outputs of DFFs

      // Initialize FF states to X/X for the first time-frame
      this.originalCircuit.flipFlops.forEach(ff => {
        currentFFStates.set(ff.id, NineValuedLogic["X/X"]);
      });

      // Maximum number of time frames to try
      // For cycle-free: d_seq + 1. For cyclic: 9^N_ff or a pragmatic limit.
      let maxTimeFrames = this.originalCircuit.isCyclic
        ? Math.min(20, this.originalCircuit.sequentialDepth)
        : this.originalCircuit.sequentialDepth + 1;
      if (maxTimeFrames === 0) maxTimeFrames = 1; // At least one frame for combinatorial circuits without FFs

      for (let k = 0; k < maxTimeFrames; k++) {
        // Iterate through time frames
        console(
          `Trying time frame ${k} (from original: 0, previous: -1, etc.)`
        );
        const combinationalCircuitForFrame = new Circuit();
        // Create a deep copy of the original circuit structure but without values
        // This is where a more sophisticated "unrolling" or "snapshot" model is needed.
        // For simplicity, we will manipulate the single circuit object and manage its state.

        // Set initial state for this time frame (PPO from prev frame becomes PPI for this frame)
        const frameInitialState = {
          wires: {}, // PI states for this frame
          ffStates: {}, // PPI states (from previous frame's PPO)
        };

        this.originalCircuit.flipFlops.forEach(ff => {
          frameInitialState.ffStates[ff.id] = currentFFStates.get(ff.id);
        });

        // Run D-Algorithm for this combinatorial snapshot
        // D-Algorithm takes the target fault and tries to find PIs and PPIs.
        // It returns true if test found, and the PI assignment and resulting PPO/PO states.
        const testResult = this.runDAlgorithmForTimeFrame(
          fault,
          frameInitialState
        );

        if (testResult.success) {
          foundTest = true;
          currentTestSequence.push(testResult.inputVector);
          // If fault detected at PO, we are done
          if (testResult.detectedAtPO) {
            console.log(
              `Fault ${fault.wireId} s-a-${fault.stuckValue} detected at clock ${k} (frame 0).`
            );
            this.testVectors.set(
              `${fault.wireId}_s_a_${fault.stuckValue}`,
              currentTestSequence
            );
            break; // Found test sequence for this fault
          } else {
            // Fault propagated to FF output (PPO), update currentFFStates for next frame
            // The PPO of this frame becomes the PPI of the next frame
            currentFFStates = testResult.nextFFStates;
            console.log(
              `Fault propagated to FF outputs at clock ${k}. Continuing to next frame.`
            );
          }
        } else {
          // D-Algorithm failed for this frame.
          // If it was a deep search (k > 0) and failed, it implies backtracking in time is needed
          // which is implicitly handled by trying more time frames (longer sequence).
          // If k=0 and failed, this single frame is not enough.
          console.log(
            `D-Algorithm failed for fault ${fault.wireId} s-a-${fault.stuckValue} in time frame ${k}.`
          );
          // If no success after all maxTimeFrames, then untestable.
          if (k === maxTimeFrames - 1) {
            console.log(
              `Fault ${fault.wireId} s-a-${fault.stuckValue} seems untestable.`
            );
          }
          break; // Move to next fault or declare untestable if no more frames to try
        }
      }
    }
    console.log("\nTest Generation Complete. Generated Vectors:");
    this.testVectors.forEach((vectors, faultId) => {
      console.log(`Fault ${faultId}:`);
      vectors.forEach((vec, idx) => {
        const piAssignment = Array.from(this.originalCircuit.primaryInputs)
          .map(w => `${w.id}=${vec.get(w.id)}`)
          .join(", ");
        console(`@${idx + 1} ${piAssignment}`);
      });
    });
  }

  // Helper to run D-Algorithm for a specific time frame
  runDAlgorithmForTimeFrame(fault, frameInitialState) {
    // Create a temporary circuit instance for the combinatorial block of this time frame
    // This is a simplification: in a real TFE, you'd have distinct objects for each frame.
    // Here, we just reset the originalCircuit and use it as the "current frame".

    // Reset and apply the fault to the circuit for this frame's D-Alg run
    this.originalCircuit.resetCircuitToState(frameInitialState);
    const targetFaultWire = this.originalCircuit.wires.get(fault.wireId);
    targetFaultWire.applyFault("STUCK_AT", fault.stuckValue);

    // State before D-Alg, useful for backtracking
    const savedInitialState = this.originalCircuit.saveCircuitState();

    const success = this.originalCircuit.dAlgorithm(
      fault.wireId,
      fault.stuckValue,
      frameInitialState
    );

    if (success) {
      const inputVector = new Map();
      Array.from(this.originalCircuit.primaryInputs).forEach(pi => {
        inputVector.set(pi.id, pi.value); // Capture the PI values determined by D-Alg
      });

      const nextFFStates = new Map();
      this.originalCircuit.flipFlops.forEach(ff => {
        if (ff.outputWire) {
          // Q output
          nextFFStates.set(ff.id, ff.outputWire.value); // Capture next state (PPO)
        }
      });

      const detectedAtPO = this.originalCircuit.isFaultDetectedAtPO();

      return {
        success: true,
        inputVector: inputVector, // The PI assignment for this time frame
        nextFFStates: nextFFStates, // The PPO states, which become PPI for next frame
        detectedAtPO: detectedAtPO,
      };
    } else {
      // If D-Algorithm failed, restore circuit state to before this attempt
      this.originalCircuit.restoreCircuitState(savedInitialState);
      return { success: false };
    }
  }
}

/*
  // برای تست: مدار سیکلی (یک FF که به خودش وصل است)
  const cyclicFileContent = `
  DFF d(Q), clock(ck), Q(Q)
  STUCK_AT Q, 0
  `;
  const cyclicCircuit = new Circuit();
  cyclicCircuit.parseCircuit(cyclicFileContent);
  */

// حالا آبجکت circuit (یا cyclicCircuit) حاوی ساختار داده پردازش شده مدار است.
// این شامل گیت‌ها، سیم‌ها، ورودی‌ها/خروجی‌های اصلی، فلیپ‌فلاپ‌ها و اطلاعات S-Graph است.
// این ساختار برای قدم‌های بعدی Time-Frame Expansion و ATPG ترکیبی آماده است.

export { TestGenerator };
