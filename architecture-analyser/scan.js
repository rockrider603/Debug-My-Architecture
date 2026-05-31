import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




export const PrintFolders = async (url) => {
    const fileName = url.split('/').pop();
    const folderPath = path.join(__dirname, "..", "backend", "temp", `${fileName}`);
    try {
        const files = await fs.promises.readdir(folderPath);
        console.log(`\nContents of cloned repo (${fileName}):`);
        files.forEach(file => {
            console.log(` - ${file}`);
        });
        console.log(""); // Empty line for better formatting
    } catch (err) {
        console.error("Error reading folder:", err);
    }
}
