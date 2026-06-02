import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const RESOURCE_MAP = {
  mongoose: "MongoDB",
  redis: "Redis",
  stripe: "Stripe",
  cloudinary: "Cloudinary",
  nodemailer: "Email Service",
  axios: "External API",
  kafka: "Kafka",
  bull: "Queue",
  amqplib: "RabbitMQ"
};

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
export function buildGraph(filePath, visited = new Set(), indent = "") {
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
            output += buildGraph(nextFilePath, visited, childIndent);
        } else {
            // Node module or built-in
            if (RESOURCE_MAP[dep]) {
                output += `${childIndent}RESOURCE: ${RESOURCE_MAP[dep]},\n`;
            } else {
                output += `${childIndent}${dep},\n`;
            }
        }
    }

    if (functionCalls.length > 0) {
        output += `${childIndent}function calls: "${functionCalls.join(", ")}",\n`;
    }

    output += `${indent}}\n`;
    return output;
}

export const analyzeRepo = async (folderPath) => {
    try {
        const packageJsonPath = path.join(folderPath, "package.json");
        let mainFile = "index.js";

        if (fs.existsSync(packageJsonPath)) {
            const packageData = await fs.promises.readFile(packageJsonPath, "utf8");
            const packageJson = JSON.parse(packageData);
            if (packageJson.main) {
                mainFile = packageJson.main;
            }
        }

        const mainFilePath = path.join(folderPath, mainFile);
        console.log(`Starting analysis from main file: ${mainFilePath}\n`);

        const graph = buildGraph(mainFilePath);
        console.log("Dependency Graph:\n");
        console.log(graph);

    } catch (err) {
        console.error("Error analyzing repo:", err);
    }
};

// If run directly
if (process.argv[1] === __filename) {
    const targetFolder = path.join(__dirname, "../..", "backend", "temp", "mernProjectEcommerce");
    analyzeRepo(targetFolder);
}
