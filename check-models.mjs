import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Đọc API Key từ .env.local
const envPath = path.resolve(
  process.cwd(),
  ".env.local",
);
let apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(
    envPath,
    "utf-8",
  );
  // Simple parsing for GEMINI_API_KEY
  const lines = envContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1].trim();
      break;
    }
    if (
      line.startsWith(
        "NEXT_PUBLIC_GEMINI_API_KEY=",
      )
    ) {
      apiKey = line.split("=")[1].trim();
      break;
    }
  }
}

if (!apiKey) {
  console.error(
    "No API Key found in process.env or .env.local!",
  );
  process.exit(1);
}

// Remove quotes if present
apiKey = apiKey.replace(/^["']|["']$/g, "");

console.log(
  "Using API Key:",
  apiKey.slice(0, 5) + "..." + apiKey.slice(-4),
);

async function listModels() {
  console.log("\nChecking available models...");

  // Check v1
  try {
    console.log("\n--- API Version: v1 ---");
    const genAI_v1 = new GoogleGenAI({
      apiKey,
      apiVersion: "v1",
    });
    const response =
      await genAI_v1.models.list();
    // Sửa lại logic log
    console.log(
      `Response type: ${typeof response}, Is Array: ${Array.isArray(response)}`,
    );
    if (response)
      console.log(
        `Keys: ${Object.keys(response).join(", ")}`,
      );

    // Ghi full response ra file để debug
    fs.writeFileSync(
      "models-v1.json",
      JSON.stringify(response, null, 2),
    );
    console.log(
      "Saved v1 response to models-v1.json",
    );

    // Thử truy cập models
    let modelList = [];
    if (Array.isArray(response)) {
      modelList = response;
    } else if (response && response.models) {
      modelList = response.models;
    }

    console.log(
      `Found ${modelList.length} models.`,
    );
  } catch (e) {
    console.error(
      "Error listing models with v1:",
      e.message,
    );
  }

  // Check v1beta
  try {
    console.log(
      "\n--- API Version: v1beta ---",
    );
    const genAI_v1beta = new GoogleGenAI({
      apiKey,
      apiVersion: "v1beta",
    });
    const response =
      await genAI_v1beta.models.list();

    fs.writeFileSync(
      "models-v1beta.json",
      JSON.stringify(response, null, 2),
    );
    console.log(
      "Saved v1beta response to models-v1beta.json",
    );

    let modelList = [];
    if (Array.isArray(response)) {
      modelList = response;
    } else if (response && response.models) {
      modelList = response.models;
    }

    console.log(
      `Found ${modelList.length} models.`,
    );
  } catch (e) {
    console.error(
      "Error listing models with v1beta:",
      e.message,
    );
    if (e.response)
      console.error(
        "Response:",
        JSON.stringify(e.response, null, 2),
      );
  }
}

listModels();
