# Declarative Firebase Functions Integration Tests

A declarative approach to Firebase Functions integration testing using templates and YAML configuration.

## Overview

This system generates Firebase Functions test suites from YAML configurations and Handlebars templates. Each test run gets a unique `TEST_RUN_ID` baked into the function names at generation time, avoiding runtime discovery issues.

## Structure

```
.
├── config/suites/        # YAML suite configurations
├── templates/            # Handlebars templates
├── scripts/              # Generation and deployment scripts
├── generated/            # Generated code (gitignored)
└── package.json          # Node ESM configuration
```

## Usage

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Functions

Generate functions for a specific suite:

```bash
TEST_RUN_ID=t_$(date +%s)_$(uuidgen | head -c 6) \
PROJECT_ID=your-test-project \
npm run generate v1_firestore
```

### 3. Deploy

Deploy the generated functions:

```bash
PROJECT_ID=your-test-project ./scripts/deploy.sh
```

### 4. Run Tests

Execute the test suite:

```bash
./scripts/test.sh v1_firestore
```

### 5. Cleanup

Remove deployed functions and test data:

```bash
./scripts/cleanup.sh
```

### All-in-One

Run the complete flow:

```bash
TEST_RUN_ID=t_$(date +%s)_$(uuidgen | head -c 6) \
PROJECT_ID=your-test-project \
npm run test:firestore
```

## How It Works

1. **Configuration**: Each suite is defined in a YAML file (`config/suites/v1_firestore.yaml`)
2. **Generation**: The Node script reads the YAML and applies Handlebars templates
3. **Unique IDs**: TEST_RUN_ID is baked into function names at generation time
4. **Deployment**: Standard Firebase deployment of the generated functions
5. **Testing**: Triggers the functions and verifies their behavior
6. **Cleanup**: Removes all functions and data with the TEST_RUN_ID

## Key Benefits

- **Declarative**: YAML defines what you want
- **Template-based**: Consistent function generation
- **Isolated**: Each test run is completely independent
- **No discovery issues**: Function names are static after generation
- **Simple**: Plain Node.js, no complex tooling

## Adding New Suites

1. Create a new YAML config in `config/suites/`
2. Create corresponding templates if needed
3. Run the generator with the new suite name

## Environment Variables

- `TEST_RUN_ID`: Unique identifier for this test run (auto-generated if not set)
- `PROJECT_ID`: Firebase project to deploy to
- `REGION`: Deployment region (default: us-central1)
- `SDK_TARBALL`: Path to Firebase Functions SDK tarball

## Requirements

- Node.js 18+
- Firebase CLI
- A Firebase project for testing

## Notes

⚠️ **WARNING**: This will deploy real functions to your Firebase project. Use a dedicated test project.

The generated code is placed in the `generated/` directory which should be gitignored.