#! /usr/bin/env bun

import fs from "node:fs/promises"
import path from "node:path"
import { glob } from "glob"

// Helper to get project root assuming script is in project_root/scripts/
function getProjectRoot(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
}

async function main() {
  const projectRoot = getProjectRoot()
  const sampleDir = path.resolve(projectRoot, "samples")
  const sampleFiles = await glob("*.ts", { cwd: sampleDir, absolute: true })

  for (const filePath of sampleFiles) {
    const fileName = path.basename(filePath)
    console.log(`Processing ${fileName}...`)

    try {
      // Dynamically import the sample module.
      // The import path must be a file URL or an absolute path for Bun.
      const modulePath = path.isAbsolute(filePath)
        ? `file://${filePath}`
        : filePath
      const module = await import(modulePath)

      if (typeof module.default !== "function") {
        console.warn(
          `Skipping ${fileName}: No default export or default export is not a function.`,
        )
        continue
      }

      const chipBuilderInstance = module.default()
      if (
        !chipBuilderInstance ||
        typeof chipBuilderInstance.toString !== "function"
      ) {
        console.warn(
          `Skipping ${fileName}: Default export function did not return an object with a toString method.`,
        )
        continue
      }

      const asciiArt = chipBuilderInstance.toString()
      let newDocstring = ""
      if (asciiArt && asciiArt.length > 0) {
        const commentLines = asciiArt
          .split("\n")
          .map((line: string) => ` * ${line}`.trimEnd())
        newDocstring = `/**\n * \`\`\`\n${commentLines.join("\n")}\n * \`\`\`\n */`
      }

      const fileContent = await fs.readFile(filePath, "utf-8")
      const lines = fileContent.split("\n")

      const exportDefaultLineIndex = lines.findIndex((line) =>
        line.trim().startsWith("export default"),
      )

      if (exportDefaultLineIndex === -1) {
        console.warn(`Skipping ${fileName}: 'export default' not found.`)
        continue
      }

      let commentBlockStartIndex = exportDefaultLineIndex

      for (let i = exportDefaultLineIndex - 1; i >= 0; i--) {
        const trimmedLine = lines[i]!.trim()
        if (trimmedLine === "") {
          continue
        }
        if (trimmedLine.endsWith("*/")) {
          let docstringActualStartIndex = -1
          for (let j = i; j >= 0; j--) {
            if (lines[j]!.trim().startsWith("/**")) {
              docstringActualStartIndex = j
              break
            }
            // If we hit the top of the file without finding '/**', it's not a valid docstring start for this '*/'
            if (j === 0 && !lines[j]!.trim().startsWith("/**")) {
              break
            }
          }
          if (docstringActualStartIndex !== -1) {
            commentBlockStartIndex = docstringActualStartIndex
          } else {
            commentBlockStartIndex = i + 1
          }
          break
        }
        if (trimmedLine.startsWith("//")) {
          commentBlockStartIndex = i
        } else {
          commentBlockStartIndex = i + 1
          break
        }
      }
      if (commentBlockStartIndex < 0) commentBlockStartIndex = 0

      const contentBeforeComment = lines.slice(0, commentBlockStartIndex)
      const contentFromExportDefault = lines.slice(exportDefaultLineIndex)

      let resultingLines = []
      if (contentBeforeComment.length > 0) {
        resultingLines.push(...contentBeforeComment)
      }

      if (newDocstring) {
        if (
          resultingLines.length > 0 &&
          resultingLines[resultingLines.length - 1]!.trim() !== ""
        ) {
          resultingLines.push("") // Add a blank line separator
        }
        resultingLines.push(...newDocstring.split("\n"))
      }

      // Ensure a blank line between the new docstring (if any) and the export default statement,
      // or between prior content and export default if no new docstring but old one was removed.
      if (
        resultingLines.length > 0 &&
        resultingLines[resultingLines.length - 1]!.trim() !== "" &&
        contentFromExportDefault.length > 0 &&
        contentFromExportDefault[0]!.trim() !== ""
      ) {
        // Only add a blank line if the current content does not end with a docstring comment
        if (!resultingLines[resultingLines.length - 1]!.trim().endsWith("*/")) {
          resultingLines.push("")
        }
      } else if (
        resultingLines.length === 0 &&
        newDocstring &&
        contentFromExportDefault.length > 0 &&
        contentFromExportDefault[0]!.trim() !== ""
      ) {
        // This case handles when newDocstring is the very first thing in the file.
        // The previous `if` won't catch it if `resultingLines` was empty before adding `newDocstring` lines.
        // If `newDocstring` was added, `resultingLines` now ends with " */".
        // We need a blank line if `contentFromExportDefault` starts with non-blank content.
        if (resultingLines[resultingLines.length - 1]!.trim().endsWith("*/")) {
          resultingLines.push("")
        }
      }

      resultingLines.push(...contentFromExportDefault)

      // Remove leading blank lines if the file now starts with multiple blank lines
      // (e.g. if contentBeforeComment was empty, and spacing logic added a blank line before newDocstring)
      let firstNonBlankLine = 0
      for (let i = 0; i < resultingLines.length; i++) {
        if (resultingLines[i]!.trim() !== "") {
          firstNonBlankLine = i
          break
        }
        if (i === resultingLines.length - 1) {
          // All lines are blank
          firstNonBlankLine = i
        }
      }
      if (
        firstNonBlankLine > 0 &&
        newDocstring &&
        resultingLines[firstNonBlankLine]!.trim().startsWith("/**")
      ) {
        // If the first content is the docstring, and there are leading blank lines, remove them.
        // This can happen if contentBeforeComment was empty.
        resultingLines = resultingLines.slice(firstNonBlankLine)
      }

      const newFileContent = resultingLines.join("\n")
      await fs.writeFile(filePath, newFileContent, "utf-8")
      console.log(`Updated comment in ${fileName}.`)
    } catch (error) {
      console.error(`Failed to process ${fileName}:`, error)
    }
  }
}

main().catch(console.error)
