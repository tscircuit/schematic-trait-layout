#! /usr/bin/env bun

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

// Helper to get project root assuming script is in project_root/scripts/
function getProjectRoot(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

async function main() {
  const projectRoot = getProjectRoot();
  const sampleDir = path.resolve(projectRoot, "samples");
  const sampleFiles = await glob("*.ts", { cwd: sampleDir, absolute: true });

  for (const filePath of sampleFiles) {
    const fileName = path.basename(filePath);
    console.log(`Processing ${fileName}...`);

    try {
      // Dynamically import the sample module.
      // The import path must be a file URL or an absolute path for Bun.
      const modulePath = path.isAbsolute(filePath) ? `file://${filePath}` : filePath;
      const module = await import(modulePath);

      if (typeof module.default !== "function") {
        console.warn(`Skipping ${fileName}: No default export or default export is not a function.`);
        continue;
      }

      const chipBuilderInstance = module.default();
      if (
        !chipBuilderInstance ||
        typeof chipBuilderInstance.toString !== "function"
      ) {
        console.warn(
          `Skipping ${fileName}: Default export function did not return an object with a toString method.`,
        );
        continue;
      }

      const asciiArt = chipBuilderInstance.toString();
      let newCommentBlock = "";
      if (asciiArt && asciiArt.length > 0) {
        newCommentBlock = asciiArt
          .split("\n")
          .map((line) => `// ${line}`.trimEnd())
          .join("\n");
      }

      const fileContent = await fs.readFile(filePath, "utf-8");
      const lines = fileContent.split("\n");

      let firstCodeLineIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        if (trimmedLine.startsWith("//") || trimmedLine === "") {
          // Line is a comment or empty, continue scanning
        } else {
          firstCodeLineIndex = i; // Found the first line of actual code
          break;
        }
        // If loop finishes and all lines were comments or empty
        if (i === lines.length - 1) {
          firstCodeLineIndex = lines.length; // Mark that all content is to be replaced or codePart is empty
        }
      }

      const codePart = lines.slice(firstCodeLineIndex).join("\n");

      let newFileContent = "";
      if (newCommentBlock.length > 0 && codePart.length > 0) {
        newFileContent = `${newCommentBlock}\n${codePart}`;
      } else if (newCommentBlock.length > 0) {
        newFileContent = newCommentBlock;
      } else {
        newFileContent = codePart; // Only codePart, or both empty
      }

      await fs.writeFile(filePath, newFileContent, "utf-8");
      console.log(`Updated comment in ${fileName}.`);
    } catch (error) {
      console.error(`Failed to process ${fileName}:`, error);
    }
  }
}

main().catch(console.error);
