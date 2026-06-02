import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findMainFile(folderPath) {
    const packageJsonPath = path.join(folderPath, "package.json");

    const packageData = await fs.promises.readFile(
        packageJsonPath,
        "utf8"
    );

    const packageJson = JSON.parse(packageData);

    const mainFile = packageJson.main;

    console.log("Main file:", mainFile);

    const mainFilePath = path.join(folderPath, mainFile);

    console.log("Full path:", mainFilePath);

    return mainFilePath;
}


import { analyzeRepo } from "./graph.js";

export const PrintFolders = async (url) => {
    const fileName = url.split('/').pop();
    const folderPath = path.join(__dirname, "../..", "backend", "temp", `${fileName}`);
    try {
        console.log(`\nContents of cloned repo (${fileName}):`);
        await analyzeRepo(folderPath);
        console.log(""); // Empty line for better formatting
    } catch (err) {
        console.error("Error reading folder:", err);
    }
}
