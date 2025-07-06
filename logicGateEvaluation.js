// LogicGateEvaluation.js

const NineValuedLogic = {
  "0/0": "0",
  "1/1": "1",
  "X/X": "X",
  D: "D", // 1/0
  D_BAR: "D_BAR", // 0/1
  "0/X": "0/X",
  "1/X": "1/X",
  "X/0": "X/0",
  "X/1": "X/1",
};

// تابع کمکی برای ارزیابی گیت AND با منطق 9-مقدار
function evaluateAND(inputValues) {
  let goodVal = inputValues[0].getGoodCircuitValue();
  let faultyVal = inputValues[0].getFaultyCircuitValue();

  for (let i = 1; i < inputValues.length; i++) {
    const nextGood = inputValues[i].getGoodCircuitValue();
    const nextFaulty = inputValues[i].getFaultyCircuitValue();

    // Good Circuit AND logic
    if (goodVal === "0" || nextGood === "0") {
      goodVal = "0";
    } else if (goodVal === "X" || nextGood === "X") {
      goodVal = "X";
    } else {
      goodVal = "1";
    }

    // Faulty Circuit AND logic
    if (faultyVal === "0" || nextFaulty === "0") {
      faultyVal = "0";
    } else if (faultyVal === "X" || nextFaulty === "X") {
      faultyVal = "X";
    } else {
      faultyVal = "1";
    }
  }
  return getNineValuedResult(goodVal, faultyVal);
}

// تابع کمکی برای ارزیابی گیت OR با منطق 9-مقدار
function evaluateOR(inputValues) {
  let goodVal = inputValues[0].getGoodCircuitValue();
  let faultyVal = inputValues[0].getFaultyCircuitValue();

  for (let i = 1; i < inputValues.length; i++) {
    const nextGood = inputValues[i].getGoodCircuitValue();
    const nextFaulty = inputValues[i].getFaultyCircuitValue();

    // Good Circuit OR logic
    if (goodVal === "1" || nextGood === "1") {
      goodVal = "1";
    } else if (goodVal === "X" || nextGood === "X") {
      goodVal = "X";
    } else {
      goodVal = "0";
    }

    // Faulty Circuit OR logic
    if (faultyVal === "1" || nextFaulty === "1") {
      faultyVal = "1";
    } else if (faultyVal === "X" || nextFaulty === "X") {
      faultyVal = "X";
    } else {
      faultyVal = "0";
    }
  }
  return getNineValuedResult(goodVal, faultyVal);
}

// تابع کمکی برای ارزیابی گیت NOT با منطق 9-مقدار
function evaluateNOT(inputValue) {
  const goodVal = inputValue.getGoodCircuitValue();
  const faultyVal = inputValue.getFaultyCircuitValue();

  let newGood = "X",
    newFaulty = "X";

  if (goodVal === "0") newGood = "1";
  else if (goodVal === "1") newGood = "0";

  if (faultyVal === "0") newFaulty = "1";
  else if (faultyVal === "1") newFaulty = "0";

  return getNineValuedResult(newGood, newFaulty);
}

// تابع کمکی برای ارزیابی گیت NAND با منطق 9-مقدار
function evaluateNAND(inputValues) {
  const andResult = evaluateAND(inputValues);
  return evaluateNOT({
    value: andResult,
    getGoodCircuitValue: () => andResult.split("/")[0],
    getFaultyCircuitValue: () => andResult.split("/")[1],
  });
}

// تابع کمکی برای ارزیابی گیت NOR با منطق 9-مقدار
function evaluateNOR(inputValues) {
  const orResult = evaluateOR(inputValues);
  return evaluateNOT({
    value: orResult,
    getGoodCircuitValue: () => orResult.split("/")[0],
    getFaultyCircuitValue: () => orResult.split("/")[1],
  });
}

// تابع کمکی برای ارزیابی گیت XOR با منطق 9-مقدار
// XOR پیچیده‌تر است. برای سادگی، فعلاً فرض می‌کنیم فقط برای 0/1/X کار می‌کند.
function evaluateXOR(inputValues) {
  let goodVal = inputValues[0].getGoodCircuitValue();
  let faultyVal = inputValues[0].getFaultyCircuitValue();

  for (let i = 1; i < inputValues.length; i++) {
    const nextGood = inputValues[i].getGoodCircuitValue();
    const nextFaulty = inputValues[i].getFaultyCircuitValue();

    // Good Circuit XOR logic
    if (goodVal === "X" || nextGood === "X") {
      goodVal = "X";
    } else {
      goodVal = goodVal === nextGood ? "0" : "1";
    }

    // Faulty Circuit XOR logic
    if (faultyVal === "X" || nextFaulty === "X") {
      faultyVal = "X";
    } else {
      faultyVal = faultyVal === nextFaulty ? "0" : "1";
    }
  }
  return getNineValuedResult(goodVal, faultyVal);
}

// تابع کمکی برای ارزیابی گیت BUFF با منطق 9-مقدار
function evaluateBUFF(inputValue) {
  return inputValue.value; // Buffers pass the value directly
}

// تابع کمکی برای تبدیل مقادیر good/faulty به Nine-Valued Logic
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
  // اگر هیچ کدام از موارد بالا نبود، یعنی تناقض یا حالت نامعتبر است
  // این نباید در طول الگوریتم D در حالت ایده آل اتفاق بیفتد مگر برای تشخیص تناقض
  return null; // نشان دهنده تناقض یا حالت نامعتبر
}

// تابع برای ارزیابی گیت DFF (یک فلیپ فلاپ ایده‌آل)
// این تابع برای شبیه‌سازی به کار می‌رود و در ATPG ترکیبی متفاوت خواهد بود
function evaluateDFF(dWire, clockWire, presetWire, resetWire, lastQState) {
  const dVal_G = dWire.getGoodCircuitValue();
  const dVal_F = dWire.getFaultyCircuitValue();
  const clockVal = clockWire ? clockWire.getGoodCircuitValue() : "1"; // فرض کلاک فعال اگر مشخص نشده باشد
  const presetVal = presetWire ? presetWire.getGoodCircuitValue() : "0";
  const resetVal = resetWire ? resetWire.getGoodCircuitValue() : "0";

  let nextQ_G = lastQState.split("/")[0]; // مقدار قبلی Q
  let nextQ_F = lastQState.split("/")[1];

  // پیاده‌سازی منطق DFF (همگام با لبه بالارونده کلاک)
  // اولویت: Reset > Preset > Clock
  if (resetVal === "1") {
    // Async Reset
    nextQ_G = "0";
    nextQ_F = "0";
  } else if (presetVal === "1") {
    // Async Preset
    nextQ_G = "1";
    nextQ_F = "1";
  } else if (clockVal === "1") {
    // Rising edge (simplistic for now)
    nextQ_G = dVal_G;
    nextQ_F = dVal_F;
  }
  // اگر کلاک 0 باشد یا فعال نباشد، حالت حفظ می‌شود (nextQ_G, nextQ_F همان lastQState می‌مانند)

  // مدیریت X ها
  if (
    dVal_G === "X" ||
    clockVal === "X" ||
    presetVal === "X" ||
    resetVal === "X"
  ) {
    nextQ_G = "X"; // اگر هر ورودی نامشخص باشد، خروجی نیز ممکن است نامشخص شود.
  }
  if (
    dVal_F === "X" ||
    clockVal === "X" ||
    presetVal === "X" ||
    resetVal === "X"
  ) {
    nextQ_F = "X"; // این قسمت نیاز به دقت بیشتر در شبیه‌سازی Faulty Circuit دارد.
  }

  return getNineValuedResult(nextQ_G, nextQ_F);
}

export {
  NineValuedLogic,
  evaluateAND,
  evaluateOR,
  evaluateNOT,
  evaluateNAND,
  evaluateNOR,
  evaluateXOR,
  evaluateBUFF,
  evaluateDFF,
  getNineValuedResult,
};
