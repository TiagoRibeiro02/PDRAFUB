import { useState } from "react";
import { issueTestKycVC } from "./issuer";

export default function EntityApp() {
  const [did, setDid] = useState("");
  const [vc, setVc] = useState<any>(null);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Entity – KYC Issuer</h1>

      <input
        placeholder="User DID"
        value={did}
        onChange={e => setDid(e.target.value)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />

      <button
        onClick={async () => {
          const issued = await issueTestKycVC(did);
          setVc(issued);
        }}
      >
        Issue KYC VC
      </button>

      {vc && (
        <>
          <h3>Issued Verifiable Credential</h3>
          <pre>{JSON.stringify(vc, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
