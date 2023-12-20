import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DIR = process.cwd();

/**
 * Build SDK, and Functions
 */
export default function setup(testRunId: string, nodeVersion: string, firebaseAdmin: string) {
  buildSdk(testRunId);
  createPackageJson(testRunId, nodeVersion, firebaseAdmin);
  installDependencies();
  buildFunctions();
}

function buildSdk(testRunId: string) {
  console.log("Building SDK...");
  process.chdir(path.join(DIR, "..")); // go up to root

  // remove existing firebase-functions-*.tgz files
  const files = fs.readdirSync(".");
  files.forEach((file) => {
    if (file.match(/^firebase-functions-.*\.tgz$/)) {
      fs.rmSync(file);
    }
  });
  // build the package
  execSync("npm run build:pack", { stdio: "inherit" });

  // move the generated tarball package to functions
  const generatedFile = fs
    .readdirSync(".")
    .find((file) => file.match(/^firebase-functions-.*\.tgz$/));

  if (generatedFile) {
    const targetPath = path.join(
      "integration_test",
      "functions",
      `firebase-functions-${testRunId}.tgz`
    );
    fs.renameSync(generatedFile, targetPath);
    console.log("SDK moved to", targetPath);
  }

  process.chdir(DIR); // go back to integration_test
}

function createPackageJson(testRunId: string, nodeVersion: string, firebaseAdmin: string) {
  console.log("Creating package.json...");
  const packageJsonTemplatePath = `${DIR}/package.json.template`;
  const packageJsonPath = `${DIR}/functions/package.json`;

  fs.copyFileSync(packageJsonTemplatePath, packageJsonPath);

  let packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
  packageJsonContent = packageJsonContent.replace(
    /__SDK_TARBALL__/g,
    `firebase-functions-${testRunId}.tgz`
  );
  packageJsonContent = packageJsonContent.replace(/__NODE_VERSION__/g, nodeVersion);
  packageJsonContent = packageJsonContent.replace(/__FIREBASE_ADMIN__/g, firebaseAdmin);

  fs.writeFileSync(packageJsonPath, packageJsonContent);
}

function installDependencies() {
  console.log("Installing dependencies...");
  const functionsDir = "functions";
  process.chdir(functionsDir); // go to functions

  const modulePath = path.join("node_modules", "firebase-functions");
  if (fs.existsSync(modulePath)) {
    execSync(`rm -rf ${modulePath}`, { stdio: "inherit" });
  }

  execSync("npm install", { stdio: "inherit" });
  process.chdir("../"); // go back to integration_test
}

function buildFunctions() {
  console.log("Building functions...");
  process.chdir(path.join(DIR, "functions")); // go to functions

  execSync("npm run build", { stdio: "inherit" });
  process.chdir(DIR); // go back to integration_test
}
