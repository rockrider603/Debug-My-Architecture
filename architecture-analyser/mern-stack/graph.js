import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { builtinModules } from "module";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const KEYWORDS = new Set([
    "if", "for", "while", "catch", "switch", "function", "return",
    "require", "import", "export", "catch", "const", "let", "var",
    "await", "async", "typeof", "instanceof", "new", "delete", "throw",
    "yield", "default"
]);

const IGNORED_METHODS = new Set([
    "map", "filter", "reduce", "forEach", "push", "pop", "shift", "unshift", "splice", "slice", "find", "findIndex", "some", "every", "includes", "indexOf", "lastIndexOf", "join", "flat", "flatMap", "sort", "reverse", "concat", "fill", "copyWithin", "entries", "keys", "values", "reduceRight",
    "split", "replace", "replaceAll", "toUpperCase", "toLowerCase", "trim", "trimStart", "trimEnd", "match", "matchAll", "search", "substring", "substr", "charAt", "charCodeAt", "startsWith", "endsWith", "padStart", "padEnd", "localeCompare", "toLocaleLowerCase", "toLocaleUpperCase",
    "assign", "create", "defineProperties", "defineProperty", "freeze", "fromEntries", "getOwnPropertyDescriptor", "getOwnPropertyDescriptors", "getOwnPropertyNames", "getOwnPropertySymbols", "getPrototypeOf", "hasOwn", "hasOwnProperty", "is", "isExtensible", "isFrozen", "isPrototypeOf", "isSealed", "preventExtensions", "propertyIsEnumerable", "seal", "setPrototypeOf",
    "abs", "acos", "acosh", "asin", "asinh", "atan", "atan2", "atanh", "cbrt", "ceil", "clz32", "cos", "cosh", "exp", "expm1", "floor", "fround", "hypot", "imul", "log", "log10", "log1p", "log2", "max", "min", "pow", "random", "round", "sign", "sin", "sinh", "sqrt", "tan", "tanh", "trunc",
    "now", "parse", "UTC", "getDate", "getDay", "getFullYear", "getHours", "getMilliseconds", "getMinutes", "getMonth", "getSeconds", "getTime", "getTimezoneOffset", "getUTCDate", "getUTCDay", "getUTCFullYear", "getUTCHours", "getUTCMilliseconds", "getUTCMinutes", "getUTCMonth", "getUTCSeconds", "setDate", "setFullYear", "setHours", "setMilliseconds", "setMinutes", "setMonth", "setSeconds", "setTime", "setUTCDate", "setUTCFullYear", "setUTCHours", "setUTCMilliseconds", "setUTCMinutes", "setUTCMonth", "setUTCSeconds", "toDateString", "toISOString", "toJSON", "toLocaleDateString", "toLocaleString", "toLocaleTimeString", "toString", "toTimeString", "toUTCString", "valueOf",
    "stringify", "log",
    "error", "warn", "info", "debug", "trace", "dir", "dirxml", "table", "assert", "count", "countReset", "group", "groupCollapsed", "groupEnd", "time", "timeLog", "timeEnd", "clear", "profile", "profileEnd", "timeStamp"
]);

const PACKAGE_DB_PATH = path.join(__dirname, "package-db.json");
let packageDB = {};
if (fs.existsSync(PACKAGE_DB_PATH)) {
    packageDB = JSON.parse(fs.readFileSync(PACKAGE_DB_PATH, "utf8"));
}

function savePackageDB() {
    fs.writeFileSync(PACKAGE_DB_PATH, JSON.stringify(packageDB, null, 2), "utf8");
}

let cachedModelName = null;
let quotaExceeded = false;

async function getAvailableModel(apiKey) {
    if (cachedModelName) return cachedModelName;
    
    // Hardcode to the absolute most basic, lowest-token Gemini model to save quota
    cachedModelName = "gemini-1.5-flash-8b";
    console.log(`\n[INFO] Selected lowest-tier model to save quota: ${cachedModelName}`);
    return cachedModelName;
}

async function classifyPackageWithLLM(packageName) {
    if (quotaExceeded) {
        return {
            package_name: packageName,
            purpose: "-",
            architecture_role: "-",
            category: "other",
            resource: null
        };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn(`\n[WARN] No GEMINI_API_KEY found in environment variables. Cannot classify unknown package: ${packageName}`);
        return null;
    }

    const modelName = await getAvailableModel(apiKey);
    const prompt = `You are an npm package classifier.

For each npm package, determine:

1. purpose
2. architecture_role
3. category
4. resource (if applicable)

Allowed categories:
[
  "database",
  "cache",
  "queue",
  "auth",
  "storage",
  "payment",
  "email",
  "analytics",
  "api-framework",
  "orm",
  "realtime",
  "monitoring",
  "search",
  "utility",
  "testing",
  "logging",
  "other"
]

The architecture_role must be summed up in maximum 3 words and minimum 2 words.
The purpose also must be summed up in a maximum of 10 words and should only contain important information about the package.

Return ONLY valid JSON.

Packages:
[
  "${packageName}"
]`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            if (response.status === 429) {
                console.warn(`\n[WARNING] Gemini API Quota Exceeded (429)! Canceling LLM for remaining packages.`);
                quotaExceeded = true; // Stop all future LLM requests
                return {
                    package_name: packageName,
                    purpose: "-",
                    architecture_role: "-",
                    category: "other",
                    resource: null
                };
            }
            throw new Error(`Gemini API error ${response.status} ${response.statusText}: ${errBody}`);
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No candidates returned from Gemini.");
        }

        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(text);
        return parsed[packageName] || Object.values(parsed)[0];
    } catch (error) {
        console.error(`\n[ERROR] Failed to classify package ${packageName}:`, error.message);
        // Fallback to avoid breaking graph if it fails
        return {
            package_name: packageName,
            purpose: "-",
            architecture_role: "-",
            category: "other",
            resource: null
        };
    }
}


function getRequiresAndImports(code) {
    const dependencies = [];

    // Match require('...') or require("...")
    const requireRegex = /require\(['"](.*?)['"]\)/g;
    let match;
    while ((match = requireRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
    }

    // Match import ... from '...' or import '...'
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g;
    while ((match = importRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
    }
    return dependencies;
}

function getFunctionCalls(code) {
    const calls = new Set();

    // Match word() or obj.word()
    const callRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;
    while ((match = callRegex.exec(code)) !== null) {
        const funcName = match[1];
        if (!KEYWORDS.has(funcName) && !IGNORED_METHODS.has(funcName)) {
            calls.add(funcName);
        }
    }

    // Match object property function calls like console.log()
    const objCallRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    while ((match = objCallRegex.exec(code)) !== null) {
        const objName = match[1];
        const methodName = match[2];
        if (!IGNORED_METHODS.has(methodName) && !["console", "Math", "JSON", "Date", "Object", "Array", "String"].includes(objName)) {
            calls.add(`${objName}.${methodName}`);
        }
    }

    return Array.from(calls);
}

function resolveLocalPath(baseDir, depPath) {
    let resolvedPath = path.resolve(baseDir, depPath);

    // If it's a directory, assume index.js
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        resolvedPath = path.join(resolvedPath, "index.js");
    }

    // Append .js if it doesn't have an extension and the file without extension doesn't exist
    if (!fs.existsSync(resolvedPath) && !resolvedPath.endsWith(".js")) {
        resolvedPath += ".js";
    }

    return resolvedPath;
}
let count = 0;
export async function buildGraph(filePath, visited = new Set(), indent = "") {
    if (!fs.existsSync(filePath)) {
        return `${indent}${path.basename(filePath)} (File not found)\n`;
    }

    const resolvedPath = fs.realpathSync(filePath);
    if (visited.has(resolvedPath)) {
        return `${indent}${path.basename(filePath)} (Already visited)\n`;
    }

    visited.add(resolvedPath);

    const code = fs.readFileSync(resolvedPath, "utf8");
    const dependencies = getRequiresAndImports(code);
    const functionCalls = getFunctionCalls(code);

    let output = `${indent}${path.basename(filePath)} {\n`;

    const childIndent = indent + "  ";

    // Process local dependencies recursively
    for (const dep of dependencies) {
        if (dep.startsWith(".") || dep.startsWith("/")) {
            // Local file
            const dir = path.dirname(resolvedPath);
            const nextFilePath = resolveLocalPath(dir, dep);
            output += await buildGraph(nextFilePath, visited, childIndent);
        } else {
            // Node module or built-in
            if (builtinModules.includes(dep) || dep.startsWith("node:")) {
                output += `${childIndent}${dep} (Built-in),\n`;
            } else {
                let pkgName = dep.split('/')[0];
                if (pkgName.startsWith('@') && dep.includes('/')) {
                    pkgName = dep.split('/').slice(0, 2).join('/');
                }

                if (!packageDB[pkgName]) {
                    console.log(`${childIndent}Classifying unknown package: ${pkgName}...`);
                    const info = await classifyPackageWithLLM(pkgName);
                    if (info) {
                        packageDB[pkgName] = info;
                        savePackageDB();
                    }
                }

                if (packageDB[pkgName]) {
                    const info = packageDB[pkgName];
                    output += `${childIndent}PACKAGE: ${pkgName} - Role: ${info.architecture_role}, Purpose: ${info.purpose},\n`;
                } else {
                    output += `${childIndent}${pkgName},\n`;
                }
            }
        }
    }

    if (functionCalls.length > 0) {
        output += `${childIndent}function calls: "${functionCalls.join(", ")}",\n`;
    }

    output += `${indent}}\n`;
    return output;
}

export async function findAndExtractRoutes(filePath, visited = new Set(), results = []) {
    if (!fs.existsSync(filePath)) return results;
    const resolvedPath = fs.realpathSync(filePath);
    if (visited.has(resolvedPath)) return results;
    visited.add(resolvedPath);

    const code = fs.readFileSync(resolvedPath, "utf8");

    if (code.includes('react-router-dom') && (code.includes('Route') || code.includes('ProtectedRoute'))) {
        const routes = [];

        const tagRegex = /<(?:Protected)?Route\s+([^>]+)>/g;
        let match;
        while ((match = tagRegex.exec(code)) !== null) {
            const propsStr = match[1];

            const pathMatch = propsStr.match(/path=["']([^"']+)["']/);
            const pathMatchVar = propsStr.match(/path=\{["']([^"']+)["']\}/);
            const pathVar = propsStr.match(/path=\{([a-zA-Z0-9_$]+)\}/);

            let routePath = "Unknown";
            if (pathMatch) routePath = pathMatch[1];
            else if (pathMatchVar) routePath = pathMatchVar[1];
            else if (pathVar) routePath = `{${pathVar[1]}}`;

            const compMatch = propsStr.match(/component=\{([a-zA-Z0-9_$]+)\}/);
            const elemMatch = propsStr.match(/element=\{<([a-zA-Z0-9_$]+)[^>]*>\}/);

            let component = "Unknown";
            if (compMatch) component = compMatch[1];
            else if (elemMatch) component = elemMatch[1];

            if (routePath !== "Unknown" || component !== "Unknown") {
                routes.push({ path: routePath, component });
            }
        }

        const tagWithChildrenRegex = /<(?:Protected)?Route[^>]*path=["']([^"']+)["'][^>]*>[\s\S]*?<([a-zA-Z0-9_$]+)[^>]*\/>[\s\S]*?<\/(?:Protected)?Route>/g;
        let childMatch;
        while ((childMatch = tagWithChildrenRegex.exec(code)) !== null) {
            routes.push({ path: childMatch[1], component: childMatch[2] });
        }

        if (routes.length > 0) {
            results.push({ file: path.basename(resolvedPath), routes });
        }
    }

    const dependencies = getRequiresAndImports(code);
    for (const dep of dependencies) {
        if (dep.startsWith(".") || dep.startsWith("/")) {
            const dir = path.dirname(resolvedPath);
            const nextFilePath = resolveLocalPath(dir, dep);
            await findAndExtractRoutes(nextFilePath, visited, results);
        }
    }

    return results;
}

export const analyzeRepo = async (folderPath) => {
    try {
        const findEntryPoints = (dir, entries = []) => {
            const pkgPath = path.join(dir, "package.json");
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
                let potentialFiles = [];
                
                if (pkg.main) potentialFiles.push(path.join(dir, pkg.main));
                
                // Common fallbacks
                potentialFiles.push(path.join(dir, "src/index.js"));
                potentialFiles.push(path.join(dir, "index.js"));
                potentialFiles.push(path.join(dir, "server.js"));
                potentialFiles.push(path.join(dir, "app.js"));
                potentialFiles.push(path.join(dir, "server/server.js"));
                potentialFiles.push(path.join(dir, "client/main.js"));

                // Check scripts for any file names ending in .js
                if (pkg.scripts) {
                    for (const scriptValue of Object.values(pkg.scripts)) {
                        const jsFiles = scriptValue.match(/([a-zA-Z0-9_./-]+\.js)/g);
                        if (jsFiles) {
                            for (const f of jsFiles) {
                                const resolved = path.join(dir, f);
                                potentialFiles.push(resolved);
                                
                                // Deeper check: if the script points to a config (like webpack), 
                                // read that config to find further .js entry points!
                                if (fs.existsSync(resolved)) {
                                    const code = fs.readFileSync(resolved, "utf8");
                                    const deeperJsFiles = code.match(/([a-zA-Z0-9_./-]+\.js)/g);
                                    if (deeperJsFiles) {
                                        for (const deepF of deeperJsFiles) {
                                            potentialFiles.push(path.join(dir, deepF));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Verify existence and add unique entry points
                for (const f of potentialFiles) {
                    if (fs.existsSync(f) && !entries.includes(f)) {
                        entries.push(f);
                    }
                }
            }
            
            // Recurse into subdirectories
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory() && file !== "node_modules" && !file.startsWith(".")) {
                    findEntryPoints(fullPath, entries);
                }
            }
            return entries;
        };

        const entryPoints = findEntryPoints(folderPath);

        if (entryPoints.length === 0) {
            console.log(`No entry points found in ${folderPath}`);
            return;
        }

        let allRoutes = [];

        for (const mainFilePath of entryPoints) {
            console.log(`\n==================================================`);
            console.log(`Analyzing file: ${mainFilePath}`);
            console.log(`==================================================\n`);

            // Build dependency graph
            const graph = await buildGraph(mainFilePath);
            console.log("Dependency Graph:\n");
            console.log(graph);

            // Extract routes
            const fileRoutes = await findAndExtractRoutes(mainFilePath);
            allRoutes = allRoutes.concat(fileRoutes);
        }

        if (allRoutes.length > 0) {
            // Deduplicate across all entry point analysis
            const uniqueRoutesMap = new Map();
            allRoutes.forEach(routeFile => {
                uniqueRoutesMap.set(routeFile.file, routeFile);
            });
            const finalRoutes = Array.from(uniqueRoutesMap.values());

            console.log("\n--- React Routes Found ---");
            finalRoutes.forEach(routeFile => {
                console.log(`\nFile: ${routeFile.file}`);
                routeFile.routes.forEach(r => {
                    console.log(`  Path: ${r.path.padEnd(30)} -> Component: ${r.component}`);
                });
            });
            console.log("--------------------------\n");

            const ROUTES_DB_PATH = path.join(__dirname, "routes-db.json");
            fs.writeFileSync(ROUTES_DB_PATH, JSON.stringify(finalRoutes, null, 2), "utf8");
            console.log(`[SUCCESS] Extracted routes saved to: ${ROUTES_DB_PATH}\n`);
        }

    } catch (err) {
        console.error("Error analyzing repo:", err);
    }
};

// If run directly
if (process.argv[1] === __filename) {
    const targetFolder = path.join(__dirname, "../..", "backend", "temp", "mernProjectEcommerce");
    analyzeRepo(targetFolder);
}
