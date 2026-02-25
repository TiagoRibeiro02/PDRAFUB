export interface NFTData {
  id: string;
  tokenId: number;
  did: string;
  owner: string;
  name: string;
  dateIssued: string;
  expirationDate: string;
  nationality: string;
  documentType: string;
  documentNumber: string;
  issuer: string;
  isActive: boolean;
  metadata?: {
    [key: string]: any;
  };
}
