export async function issueTestKycVC(userDid: string) {
  const issuerDid = "did:zeroid:entity";

  const credential = {
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

  return credential;
}