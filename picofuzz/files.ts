import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function getBinFiles(directory: string, ignore: string[] = []): Promise<string[]> {
  const files = await fs.readdir(directory);
  const binFiles: string[] = [];
  const ignoreSet = new Set(ignore);

  for (const file of files) {
    if (file.endsWith(".bin") && !ignoreSet.has(file)) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        binFiles.push(filePath);
      }
    }
  }

  // Sort by filename using deterministic lexical comparison
  binFiles.sort((a, b) => {
    const nameA = path.basename(a);
    const nameB = path.basename(b);
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  return binFiles;
}

export async function processFile(
  filePath: string,
  doProcess: (filePath: string, fileData: Buffer) => Promise<boolean>,
): Promise<boolean> {
  try {
    const fileData = await fs.readFile(filePath);

    const v = await doProcess(filePath, fileData);
    if (v) {
      console.log(`Successfully processed: ${filePath}`);
    }
    return v;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}
