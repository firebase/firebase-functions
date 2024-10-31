import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const DIR = process.cwd();

/**
 * Build SDK, and Functions
 */
export default function setup(
  testRuntime: "node" | "python",
  testRunId: string,
  nodeVersion: string,
  firebaseAdmin: string
) {
  if (testRuntime === "node") {
    buildNodeSdk(testRunId);
    createPackageJson(testRunId, nodeVersion, firebaseAdmin);
    installNodeDependencies();
    buildNodeFunctions();
  }

  if (testRuntime === "python") {
    buildPythonSdk();
    createRequirementsTxt(firebaseAdmin);
    installPythonDependencies();
  }
}

function buildNodeSdk(testRunId: string) {
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

function buildPythonSdk() {
  console.log("Building SDK...");

  process.chdir(path.join(DIR, "..")); // go up to root

  // remove existing build

  fs.rmSync("dist", { recursive: true, force: true });

  // remove existing venv

  fs.rmSync("venv", { recursive: true, force: true });

  // make virtual environment for building

  execSync("python3 -m venv venv", { stdio: "inherit" });

  // build the package

  execSync(
    "source venv/bin/activate && python -m pip install --upgrade build",

    { stdio: "inherit", shell: "bash" }
  );

  execSync("source venv/bin/activate && python -m build -s", {
    stdio: "inherit",
    shell: "bash",
  });

  // move the generated tarball package to functions

  const generatedFile = fs

    .readdirSync("dist")

    .find((file) => file.match(/^firebase_functions-.*\.tar\.gz$/));

  if (generatedFile) {
    const targetPath = path.join("integration_test", "functions", `firebase_functions.tar.gz`);

    fs.renameSync(path.join("dist", generatedFile), targetPath);

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

function createRequirementsTxt(firebaseAdmin: string) {
  console.log("Creating requirements.txt...");

  const requirementsTemplatePath = `${DIR}/requirements.txt.template`;

  const requirementsPath = `${DIR}/functions/requirements.txt`;

  fs.copyFileSync(requirementsTemplatePath, requirementsPath);

  let requirementsContent = fs.readFileSync(requirementsPath, "utf8");

  requirementsContent = requirementsContent.replace(
    /__LOCAL_FIREBASE_FUNCTIONS__/g,

    `firebase_functions.tar.gz`
  );

  requirementsContent = requirementsContent.replace(
    /__FIREBASE_ADMIN__/g,

    firebaseAdmin
  );

  fs.writeFileSync(requirementsPath, requirementsContent);
}

function installNodeDependencies() {
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

function installPythonDependencies() {
  console.log("Installing dependencies...");

  const functionsDir = "functions";

  process.chdir(functionsDir); // go to functions

  const venvPath = path.join("venv");

  if (fs.existsSync(venvPath)) {
    execSync(`rm -rf ${venvPath}`, { stdio: "inherit" });
  }

  execSync("python3 -m venv venv", { stdio: "inherit" });

  execSync("source venv/bin/activate && python3 -m pip install -r requirements.txt", {
    stdio: "inherit",
  });

  process.chdir("../"); // go back to integration_test
}

function buildNodeFunctions() {
  console.log("Building functions...");
  process.chdir(path.join(DIR, "functions")); // go to functions

  execSync("npm run build", { stdio: "inherit" });
  process.chdir(DIR); // go back to integration_test
}
