import { useState, useEffect, useRef } from "react"
import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { convertCircuitJsonToInputNetlist } from "../lib/circuit-json/convertCircuitJsonToInputNetlist"
import { CircuitBuilder } from "../lib/builder"
import { applyCircuitLayoutToCircuitJson } from "../lib/circuit-json/applyCircuitLayoutToCircuitJson"
import {
  getBase64PoundSnippetString,
  getUncompressedSnippetString,
} from "@tscircuit/create-snippet-url"

const defaultCode = `import { sel } from "tscircuit"

export default () => (
  <board routingDisabled>
    <chip
      name="U1"
      footprint="soic4"
      connections={{ pin1: sel.R1.pin1, pin3: sel.net.GND1 }}
    />
    <resistor
      name="R1"
      schX={-3}
      resistance="1k"
      footprint="0402"
      connections={{ pin2: sel.net.GND2 }}
    />
  </board>
)`

export default function App() {
  const [code, setCode] = useState("")
  const [originalSvg, setOriginalSvg] = useState("")
  const [layoutSvg, setLayoutSvg] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"optimized" | "original">(
    "optimized",
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Check if there's code in the URL
    if (typeof window !== "undefined" && window.location.hash) {
      try {
        const parsedCode = getUncompressedSnippetString(window.location.hash)
        if (parsedCode) {
          setCode(parsedCode)
          return
        }
      } catch (e) {
        console.warn("Failed to parse code from URL:", e)
      }
    }
    // Use default code if no URL code
    setCode(defaultCode)
  }, [])

  const updateUrl = (newCode: string) => {
    if (typeof window === "undefined") return
    try {
      const encoded = getBase64PoundSnippetString(newCode)
      window.history.replaceState({}, "", encoded)
    } catch (e) {
      console.warn("Failed to encode URL:", e)
    }
  }

  const runCode = async () => {
    if (!code.trim()) return

    setIsLoading(true)
    setError("")

    try {
      // Update URL with current code
      updateUrl(code)

      // Run tscircuit code
      const circuitJson: any[] = await runTscircuitCode(code)

      // Add schematic_net_label_id hack (from test file)
      let schLabelIdCounter = 0
      for (const schLabel of cju(circuitJson).schematic_net_label.list()) {
        // @ts-expect-error until circuit-json adds schematic_net_label_id
        schLabel.schematic_net_label_id ??= `schematic_net_label_${schLabelIdCounter++}`
      }

      // Generate original SVG
      const originalSvgString = convertCircuitJsonToSchematicSvg(circuitJson, {
        grid: { cellSize: 1, labelCells: true },
      })
      setOriginalSvg(originalSvgString)

      // Apply layout pipeline
      const inputNetlist = convertCircuitJsonToInputNetlist(circuitJson)

      // Create a simple circuit builder for layout (similar to test)
      const C = new CircuitBuilder()
      C.defaultChipWidth = 2
      C.defaultPinSpacing = 0.2

      // Basic layout - this could be enhanced later
      const U1 = C.chip().leftpins(2).rightpins(2)
      U1.pin(1).line(-1, 0).passive().line(-1, 0).line(0, -1).label()
      U1.pin(3).line(1, 0).label()

      const newCircuitJson = applyCircuitLayoutToCircuitJson(
        circuitJson,
        inputNetlist,
        C,
      )

      // Generate layout SVG
      const layoutSvgString = convertCircuitJsonToSchematicSvg(newCircuitJson, {
        grid: { cellSize: 1, labelCells: true },
      })
      setLayoutSvg(layoutSvgString)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newValue = `${code.substring(0, start)}  ${code.substring(end)}`
        setCode(newValue)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        }, 0)
      }
    }
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <h1>TSCircuit Layout Pipeline Demo</h1>

      <div style={{ marginBottom: "20px" }}>
        <h3>TSCircuit Code:</h3>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            height: "300px",
            fontFamily: "monospace",
            fontSize: "14px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          placeholder="Enter your TSCircuit code here..."
        />

        <button
          type="button"
          onClick={runCode}
          disabled={isLoading}
          style={{
            marginTop: "10px",
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {isLoading ? "Running..." : "Run Code"}
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #f5c6cb",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {(originalSvg || layoutSvg) && (
        <div style={{ width: "100%" }}>
          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              borderBottom: "2px solid #e0e0e0",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("optimized")}
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: "transparent",
                borderBottom:
                  activeTab === "optimized"
                    ? "3px solid #007bff"
                    : "3px solid transparent",
                color: activeTab === "optimized" ? "#007bff" : "#666",
                fontWeight: activeTab === "optimized" ? "bold" : "normal",
                cursor: "pointer",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "optimized") {
                  e.currentTarget.style.color = "#007bff"
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "optimized") {
                  e.currentTarget.style.color = "#666"
                }
              }}
            >
              Optimized Layout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("original")}
              style={{
                padding: "12px 24px",
                border: "none",
                backgroundColor: "transparent",
                borderBottom:
                  activeTab === "original"
                    ? "3px solid #007bff"
                    : "3px solid transparent",
                color: activeTab === "original" ? "#007bff" : "#666",
                fontWeight: activeTab === "original" ? "bold" : "normal",
                cursor: "pointer",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "original") {
                  e.currentTarget.style.color = "#007bff"
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "original") {
                  e.currentTarget.style.color = "#666"
                }
              }}
            >
              Original Layout
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ width: "100%" }}>
            {activeTab === "optimized" && layoutSvg && (
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "#f9f9f9",
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{ width: "100%" }}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: layoutSvg.replace(
                        /<svg([^>]*)>/,
                        '<svg$1 style="width: 100%; height: auto; max-width: 100%;">',
                      ),
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === "original" && originalSvg && (
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  backgroundColor: "#f9f9f9",
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{ width: "100%", maxWidth: "800px" }}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: originalSvg.replace(
                        /<svg([^>]*)>/,
                        '<svg$1 style="width: 100%; height: auto; max-width: 100%;">',
                      ),
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
