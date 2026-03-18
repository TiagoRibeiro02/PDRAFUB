declare module 'snarkjs' {
  export const plonk: {
    fullProve: (
      input: Record<string, string>,
      wasmPath: string,
      zkeyPath: string,
    ) => Promise<{ proof: any; publicSignals: any[] }>;
    verify: (
      verificationKey: any,
      publicSignals: any[],
      proof: any,
    ) => Promise<boolean>;
  };
}

declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): any;
    F: { toString: (value: any) => string };
  }>;
}

declare module '*.css';
