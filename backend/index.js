//https://github.com/meabhisingh/mernProjectEcommerce
//https://github.com/shamahoque/mern-social
import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrintFolders } from '../architecture-analyser/mern-stack/scan.js'
const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyse', async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes('github.com')) {
    return res.status(400).json({ error: 'Valid GitHub URL is required.' });
  }
  try {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
    
    let tempFolderName = cleanUrl.split('/').pop();
    if (tempFolderName.endsWith('.git')) tempFolderName = tempFolderName.slice(0, -4);
    
    const tempFolderPath = path.join(__dirname, 'temp', tempFolderName);

    // Ensure temp directory exists
    const tempBase = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempBase)) {
      fs.mkdirSync(tempBase);
    }

    // Remove if already exists so git clone doesn't fail
    if (fs.existsSync(tempFolderPath)) {
      console.log(`Removing existing folder ${tempFolderPath}`);
      fs.rmSync(tempFolderPath, { recursive: true, force: true });
    }

    console.log(`git clone "${cleanUrl}" "${tempFolderPath}"`);

    // Run git clone in terminal without hanging on prompts
    const temp = await execAsync(`git clone "${cleanUrl}" "${tempFolderPath}"`, {
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
    console.log(temp);

    // Call PrintFolders AFTER the repository has been cloned
    await PrintFolders(cleanUrl);

    console.log(`Successfully cloned repository.`);

    res.status(200).json({
      success: true,
      message: 'Repository successfully cloned and ready for analysis.',
      folder: tempFolderPath
    });
  } catch (error) {
    console.error('Error cloning repository:', error);
    res.status(500).json({ success: false, error: 'Failed to clone the repository.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
