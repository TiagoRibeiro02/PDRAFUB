import * as snarkjs from "snarkjs";
import * as fs from "fs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateSolidityVerifier() {
  try {
    console.log("Generating Solidity verifier for PLONK...");
    
    // Load the PLONK verifier template from snarkjs package
    const templatePath = join(__dirname, 'node_modules', 'snarkjs', 'templates', 'verifier_plonk.sol.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    
    // For PLONK, export verifier using the zkey file path and template
    const verifierCode = await snarkjs.zKey.exportSolidityVerifier(
      "circuit_final.zkey",
      { plonk: template }
    );
    
    fs.writeFileSync("Verifier.sol", verifierCode);
    
    console.log("Solidity verifier generated successfully: Verifier.sol");
  } catch (error) {
    console.error("Error generating verifier:", error);
    process.exit(1);
  }
}

generateSolidityVerifier();
