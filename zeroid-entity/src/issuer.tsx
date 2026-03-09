export async function issueTestKycVC(userDid: string) {
  const entityUser = JSON.parse(localStorage.getItem('entity_user') || 'null');
  const issuerName = entityUser?.entity_did || entityUser?.entity_name || "did:zeroid:entity";

  const credential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ["VerifiableCredential", "KYCAML"],
    issuer: issuerName,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: userDid,
      kyc: true,
      aml: true
    }
  };

  return credential;
}