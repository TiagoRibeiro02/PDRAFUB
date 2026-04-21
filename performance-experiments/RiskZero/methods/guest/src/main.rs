#![no_main]
#![no_std]

use risc0_zkvm::guest::env;

risc0_zkvm::guest::entry!(main);

fn main() {
    // Read the private host input.
    let input: u32 = env::read();

    // Keep the benchmark deterministic and commit a small public value.
    let output = input.saturating_mul(2).saturating_add(1);

    // Write public output to the journal.
    env::commit(&output);
}
