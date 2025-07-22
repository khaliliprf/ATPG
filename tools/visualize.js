// visualize.js
const  { Base91, Graphviz, Zstd } = require("@hpcc-js/wasm");
const sharp = require('sharp');
async function drawCircuitSchematic(circuitData, outputFile = 'circuit_schematic.jpg') {
    let graphvizInstance;
    try {
        graphvizInstance = await Graphviz.load();
    } catch (error) {
        console.error("Error initializing Graphviz WASM. Make sure Graphviz is installed and accessible, or check @hpcc-systems/wasm installation.", error);
        return;
    }

    const { gates, fanouts, dffs, stuckFaults, primaryInputs, primaryOutputs, allWires } = circuitData;

    let dotString = 'digraph Circuit {\n';
    dotString += '  rankdir=LR;\n'; // Layout from Left to Right
    dotString += '  splines=ortho;\n'; // Make connections orthogonal (L-shaped) - often looks better for circuits
    dotString += '  nodesep=0.5;\n'; // Separation between nodes in the same rank
    dotString += '  ranksep=0.75;\n'; // Separation between ranks

    // Define general styles for different node types
    dotString += '  node [style=filled];\n';

    // Primary Inputs
    primaryInputs.forEach(input => {
        dotString += `  "${input}" [shape=triangle, fillcolor=lightgreen, label="IN: ${input}"];\n`;
    });

    // Primary Outputs
    primaryOutputs.forEach(output => {
        dotString += `  "${output}" [shape=triangle, fillcolor=lightcoral, label="OUT: ${output}"];\n`;
    });

    // Wires (Intermediate connections) - Represent them as invisible or point nodes
    // This is crucial for precise routing and fanouts.
    allWires.forEach(wire => {
        // Exclude primary inputs and outputs, as they have specific shapes
        if (!primaryInputs.includes(wire) && !primaryOutputs.includes(wire)) {
            // Also exclude gate outputs, as they will be represented by the gate itself
            const isGateOutput = gates.some(g => g.output === wire);
            const isDFFOutput = dffs.some(d => d.output === wire);

            if (!isGateOutput && !isDFFOutput) {
                // For actual wires that are not defined as outputs, make them a small point node
                // This helps Graphviz route edges cleanly, especially for fanouts.
                dotString += `  "${wire}" [label="", shape=point, width=0.01, height=0.01, fillcolor=gray, fixedsize=true];\n`;
            }
        }
    });

    // Gates - Create a unique ID for each gate instance, using its output as part of the ID
    // and connecting to the actual output wire ID
    gates.forEach((gate, index) => {
        const gateId = `${gate.type}_${gate.output}_${index}`; // Unique ID for the gate node itself
        let gateShape;
        let gateFillcolor = "white";

        switch (gate.type.toLowerCase()) {
            case 'and':
                gateShape = 'and'; // Specific Graphviz shape for AND gate
                break;
            case 'or':
                gateShape = 'or'; // Specific Graphviz shape for OR gate
                break;
            case 'not':
                gateShape = 'inv'; // Specific Graphviz shape for NOT gate (inverter)
                break;
            // Add other gate types as needed (NAND, NOR, XOR, XNOR)
            // default:
            //     gateShape = 'rect'; // Fallback to rectangle
        }

        // Define the gate node with its specific shape
        dotString += `  "${gateId}" [label="${gate.type}", shape=${gateShape}, fillcolor=${gateFillcolor}];\n`;

        // Connect inputs to the gate node
        gate.inputs.forEach(inputWire => {
            dotString += `  "${inputWire}" -> "${gateId}";\n`;
        });

        // Connect the gate node to its output wire
        // (Assuming gate.output is the name of the wire coming out of the gate)
        dotString += `  "${gateId}" -> "${gate.output}";\n`;
    });

    // D-Flip-Flops
    dffs.forEach((dff, index) => {
        const dffId = `DFF_${dff.output}_${index}`; // Unique ID for DFF node
        dotString += `  "${dffId}" [label="DFF", shape=invhouse, fillcolor=lightgray];\n`; // A typical DFF shape (or custom)

        dff.inputs.forEach(inputWire => {
            dotString += `  "${inputWire}" -> "${dffId}";\n`;
        });
        dotString += `  "${dffId}" -> "${dff.output}";\n`;
    });

    // Primary Outputs (connect from their source wires)
    // This is implicitly handled if the wires leading to POs are outputs of gates/PIs.
    // Ensure that POs are destinations in the graph:
    // (This part is often implicitly done by Graphviz if the PO is the target of an edge)
    // For clarity, we can add a dummy edge if a PO doesn't have an explicit source in data:
    // primaryOutputs.forEach(po => {
    //     // Find if any gate/dff outputs to this PO, or if it's directly fed by a PI
    //     const hasSource = gates.some(g => g.output === po) || dffs.some(d => d.output === po) || primaryInputs.includes(po);
    //     if (!hasSource) {
    //         // This is a complex case: a PO without a defined source.
    //         // For a real circuit, it should always have a source.
    //         // For now, we'll rely on the existing connections.
    //     }
    // });


    // Highlight stuck-at faults
    stuckFaults.forEach(fault => {
        const faultNodeId = `fault_${fault.wire}_s${fault.value}`;
        dotString += `  "${faultNodeId}" [label="S@${fault.value}", shape=circle, style=filled, fillcolor=red, fixedsize=true, width=0.3, height=0.3];\n`;

        // The logic for inserting fault: find all edges where `fault.wire` is the source,
        // break them, and insert `faultNodeId`.
        // This requires dynamically modifying the connections.

        // First, create a list of all connections that use `fault.wire` as their source.
        let outgoingConnectionsToBreak = [];

        // Connections from Primary Inputs
        if (primaryInputs.includes(fault.wire)) {
            gates.forEach((gate, index) => {
                if (gate.inputs.includes(fault.wire)) {
                    outgoingConnectionsToBreak.push({ from: fault.wire, to: `${gate.type}_${gate.output}_${index}` });
                }
            });
            dffs.forEach((dff, index) => {
                if (dff.inputs.includes(fault.wire)) {
                    outgoingConnectionsToBreak.push({ from: fault.wire, to: `DFF_${dff.output}_${index}` });
                }
            });
            if (primaryOutputs.includes(fault.wire)) {
                 outgoingConnectionsToBreak.push({ from: fault.wire, to: fault.wire + "_PO_node" }); // Special handling for POs
            }
        }

        // Connections from Gate Outputs
        gates.forEach((gate, idx) => {
            if (gate.output === fault.wire) {
                const gateSourceId = `${gate.type}_${gate.output}_${idx}`;
                // Now find where this gate's output (fault.wire) connects to:
                gates.forEach((destGate, destIdx) => {
                    if (destGate.inputs.includes(fault.wire)) {
                        outgoingConnectionsToBreak.push({ from: gateSourceId, to: `${destGate.type}_${destGate.output}_${destIdx}` });
                    }
                });
                dffs.forEach((destDff, destIdx) => {
                    if (destDff.inputs.includes(fault.wire)) {
                        outgoingConnectionsToBreak.push({ from: gateSourceId, to: `DFF_${destDff.output}_${destIdx}` });
                    }
                });
                 if (primaryOutputs.includes(fault.wire)) {
                    outgoingConnectionsToBreak.push({ from: gateSourceId, to: fault.wire + "_PO_node" });
                }
            }
        });

        // Connections from DFF Outputs (similar to gates)
        dffs.forEach((dff, idx) => {
            if (dff.output === fault.wire) {
                const dffSourceId = `DFF_${dff.output}_${idx}`;
                gates.forEach((destGate, destIdx) => {
                    if (destGate.inputs.includes(fault.wire)) {
                        outgoingConnectionsToBreak.push({ from: dffSourceId, to: `${destGate.type}_${destGate.output}_${destIdx}` });
                    }
                });
                dffs.forEach((destDff, destIdx) => {
                    if (destDff.inputs.includes(fault.wire)) {
                        outgoingConnectionsToBreak.push({ from: dffSourceId, to: `DFF_${destDff.output}_${destIdx}` });
                    }
                });
                 if (primaryOutputs.includes(fault.wire)) {
                    outgoingConnectionsToBreak.push({ from: dffSourceId, to: fault.wire + "_PO_node" });
                }
            }
        });

        // Create the new edges: from original source to fault node, and from fault node to original destinations.
        // We'll add new connections and let Graphviz handle unique paths.
        // The original connections (e.g., "input" -> "gateId") already define the path.
        // We need to insert the fault node *on* the wire that has the fault.

        // This is a more robust way to insert the fault node:
        // Instead of connecting (source -> gateId), we connect (source -> faultNodeId -> gateId)
        // This requires going back and modifying the existing `dotString` or building it in a smarter way.
        // For simplicity, let's just make the fault node connect from the wire itself
        // and connect it to all its destinations. This is what you see in the provided image (image_146c32.png).

        // Connect the wire *before* the fault point to the fault node
        // Then connect the fault node to all consumers of that wire.
        dotString += `  "${fault.wire}" -> "${faultNodeId}" [color=red, style=dashed, label="fault"];\n`;

        // Connect fault node to all destinations that originally received this wire
        gates.forEach((gate, index) => {
            if (gate.inputs.includes(fault.wire)) {
                dotString += `  "${faultNodeId}" -> "${gate.type}_${gate.output}_${index}" [color=red];\n`;
            }
        });
        dffs.forEach((dff, index) => {
            if (dff.inputs.includes(fault.wire)) {
                dotString += `  "${faultNodeId}" -> "DFF_${dff.output}_${index}" [color=red];\n`;
            }
        });
        // If the fault wire is a primary output, connect fault node to it directly
        if (primaryOutputs.includes(fault.wire)) {
            dotString += `  "${faultNodeId}" -> "${fault.wire}" [color=red];\n`;
        }
    });

    dotString += '}\n';

    console.log("Generated DOT string:\n", dotString);

    try {
        const svgString = graphvizInstance.dot(dotString, 'svg');
        console.log("SVG generated successfully. Converting to JPG...");

        await sharp(Buffer.from(svgString))
            .jpeg({ quality: 90 })
            .toFile(outputFile);

        console.log(`Circuit schematic saved to ${outputFile}`);
    } catch (error) {
        console.error("Error during SVG generation or conversion to JPG:", error);
    }
}

module.exports = { drawCircuitSchematic };