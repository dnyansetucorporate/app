Frontend typings

This project consumes TypeScript types that are generated from backend Zod schemas.

How to regenerate and update frontend types:

1. Generate backend types:

   ```powershell
   cd backend
   npm install   # if not already installed
   npm run gen:types
   ```

2. Copy the generated file into the frontend types folder (this repo keeps a small copied file for simplicity):

   ```powershell
   copy ..\backend\src\types\generated-schema-types.ts src\types\generated-schema-types.ts
   ```

3. Rebuild frontend:

   ```powershell
   cd frontend
   npm install
   npm run build
   ```

Notes:
- For a cleaner long-term setup consider exposing `backend/src/types` as a local package or using path mappings in `tsconfig.json` to avoid cross-folder relative imports.
