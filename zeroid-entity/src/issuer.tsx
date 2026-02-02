let issuerKeys: CryptoKeyPair | null = null;

async function getIssuerKeys() {
  if (!issuerKeys) {
    issuerKeys = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
  }
  return issuerKeys;
}

export async function issueTestKycVC(userDid: string) {
  const issuerDid = "did:zeroid:entity";

  const keys = await getIssuerKeys();

  const payload = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ["VerifiableCredential", "KYCAML"],
    issuer: issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: userDid,
      kyc: true,
      aml: true
    }
  };

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keys.privateKey,
    data
  );

  return {
    ...payload,
    proof: {
      type: "EcdsaSecp256r1Signature2019",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: `${issuerDid}#key-1`,
      jws: btoa(String.fromCharCode(...new Uint8Array(sig)))
    }
  };
}