import path from "path";
import fs from "fs";

export function loadEnv(): void {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    console.log("Loading .env file from", envPath);
    const envFileContent = fs.readFileSync(envPath, "utf-8");
    envFileContent.split("\n").forEach((variable) => {
      const [key, value] = variable.split("=");
      if (key && value) process.env[key.trim()] = value.trim();
    });
  } catch (error: any) {
    console.error("Error loading .env file:", error.message);
  }
}

