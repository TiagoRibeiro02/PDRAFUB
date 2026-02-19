import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import NFTGallery from './components/NFTGallery'
import './App.css'

// Import contract address and ABI (these will be generated after deployment)
let contractAddress: string | undefined
let MyNFTABI: any

try {
  const addressData = await import('./contracts/contract-address.json')
  const abiData = await import('./contracts/MyNFT.json')
  contractAddress = addressData.MyNFT
  MyNFTABI = abiData.abi
} catch (error) {
  console.warn('Contract files not found. Please deploy the contract first.')
}

interface NFTData {
  tokenId: number
  name: string
  description: string
  image: string
  owner: string
  price?: string
  forSale?: boolean
}

function App() {
  const [account, setAccount] = useState<string>('')
  const [bankNfts, setBankNfts] = useState<NFTData[]>([])
  const [availableNfts, setAvailableNfts] = useState<NFTData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    checkWalletConnection()
  }, [])

  useEffect(() => {
    if (account && contractAddress) {
      checkIfOwner()
      loadBankNFTs()
    }
  }, [account])

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        })
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask to use this app!')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      setAccount(accounts[0])

      // Switch to localhost network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }], // 1337 in hex
        })
      } catch (switchError: any) {
        // Chain hasn't been added yet
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x539',
              chainName: 'Localhost 8545',
              rpcUrls: ['http://127.0.0.1:8545'],
            }],
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

    }
  }

  const checkIfOwner = async () => {
    if (!contractAddress || !MyNFTABI) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, MyNFTABI, provider)
      const owner = await contract.owner()
      setIsOwner(owner.toLowerCase() === account.toLowerCase())
    } catch (err) {
      console.error('Error checking owner:', err)
    }
  }

  const loadBankNFTs = async () => {
    if (!contractAddress || !MyNFTABI) {
      setError('Contract not deployed yet. Please run: npm run deploy && npm run mint')
      return
    }

    try {
      setLoading(true)
      setError('')

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, MyNFTABI, provider)

      // Get all NFTs in the bank (owned by contract owner)
      const owner = await contract.owner()
      const tokenIds = await contract.tokensOfOwner(owner)

      // Get available NFTs (for sale)
      const [availableIds, prices] = await contract.getAvailableNFTs()

      // Fetch metadata for bank NFTs
      const bankData: NFTData[] = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          const tokenURI = await contract.tokenURI(tokenId)
          const price = await contract.getPrice(tokenId)
          
          let metadata
          if (tokenURI.startsWith('data:application/json;base64,')) {
            const base64Data = tokenURI.replace('data:application/json;base64,', '')
            const jsonString = atob(base64Data)
            metadata = JSON.parse(jsonString)
          } else {
            metadata = { name: `NFT #${tokenId}`, description: '', image: '' }
          }

          return {
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            owner: owner,
            price: ethers.formatEther(price),
            forSale: price > 0n
          }
        })
      )

      setBankNfts(bankData)

      // Fetch metadata for available NFTs
      const availableData: NFTData[] = await Promise.all(
        availableIds.map(async (tokenId: bigint, index: number) => {
          const tokenURI = await contract.tokenURI(tokenId)
          
          let metadata
          if (tokenURI.startsWith('data:application/json;base64,')) {
            const base64Data = tokenURI.replace('data:application/json;base64,', '')
            const jsonString = atob(base64Data)
            metadata = JSON.parse(jsonString)
          } else {
            metadata = { name: `NFT #${tokenId}`, description: '', image: '' }
          }

          return {
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            owner: owner,
            price: ethers.formatEther(prices[index]),
            forSale: true
          }
        })
      )

      setAvailableNfts(availableData)
    } catch (err: any) {
      console.error('Error loading NFTs:', err)
      setError(err.message || 'Failed to load NFTs')
    } finally {
      setLoading(false)
    }
  }

  const setNFTPrice = async (tokenId: number) => {
    if (!contractAddress || !MyNFTABI) return

    const priceInEth = prompt(`Enter price in ETH for NFT #${tokenId}:`)
    if (!priceInEth) return

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(contractAddress, MyNFTABI, signer)

      const tx = await contract.setPrice(tokenId, ethers.parseEther(priceInEth))
      await tx.wait()

      alert(`Price updated for NFT #${tokenId}!`)
      await loadBankNFTs()
    } catch (err: any) {
      alert(`Failed to set price: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadNFTs = async () => {
    if (!contractAddress || !MyNFTABI) {
      setError('Contract not deployed yet. Please run: npm run deploy && npm run mint')
      return
    }

    try {
      setLoading(true)
      setError('')

      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, MyNFTABI, provider)

      // Get all token IDs owned by the current account
      const tokenIds = await contract.tokensOfOwner(account)

      // Fetch metadata for each token
      const nftData: NFTData[] = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          const tokenURI = await contract.tokenURI(tokenId)
          
          let metadata
          if (tokenURI.startsWith('data:application/json;base64,')) {
            // Decode base64 metadata
            const base64Data = tokenURI.replace('data:application/json;base64,', '')
            const jsonString = atob(base64Data)
            metadata = JSON.parse(jsonString)
          } else if (tokenURI.startsWith('http')) {
            // Fetch from HTTP
            const response = await fetch(tokenURI)
            metadata = await response.json()
          } else {
            metadata = { name: `NFT #${tokenId}`, description: '', image: '' }
          }

          return {
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            owner: account
          }
        })
      )

      setNfts(nftData)
    } catch (err: any) {
      console.error('Error loading NFTs:', err)
      setError(err.message || 'Failed to load NFTs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <header className="header">
        <h1>🏦 NFT Bank - Management Interface</h1>
        {isOwner && <p style={{ margin: '0.5rem 0', color: '#4CAF50' }}>✓ You are the bank owner</p>}
      </header>

      <div className="wallet-section">
        <div className="wallet-info">
          {account ? (
            <div className="wallet-address">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <div>Not connected</div>
          )}
          <button 
            className="connect-button"
            onClick={connectWallet}
            disabled={loading || !!account}
          >
            {account ? '✓ Connected' : 'Connect Wallet'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      {!loading && account && isOwner && (
        <>
          <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ 
              background: '#e3f2fd', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '2rem',
              color: '#1565c0'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Bank Inventory</h3>
              <p style={{ margin: 0 }}>
                Total NFTs in bank: {bankNfts.length} | For sale: {availableNfts.length}
              </p>
            </div>

            {/* Available NFTs (For Sale) */}
            <section style={{ marginBottom: '3rem' }}>
              <h2>📢 Available for Purchase ({availableNfts.length})</h2>
              <p style={{ color: '#888', marginBottom: '1rem' }}>
                These NFTs are listed in the marketplace and can be purchased by users with their DIDs.
              </p>
              {availableNfts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No NFTs currently for sale. Set prices on your inventory below.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {availableNfts.map(nft => (
                    <div key={nft.tokenId} style={{
                      background: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '2px solid #4CAF50'
                    }}>
                      {nft.image && <img src={nft.image} alt={nft.name} style={{ width: '100%', borderRadius: '8px' }} />}
                      <h4>{nft.name}</h4>
                      <p style={{ color: '#888', fontSize: '0.9rem' }}>{nft.description}</p>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                        {nft.price} ETH
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                        Token #{nft.tokenId}
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => setNFTPrice(nft.tokenId)}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            width: '100%',
                            background: '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Update Price
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* All Bank NFTs */}
            <section>
              <h2>🏦 Bank Inventory ({bankNfts.length})</h2>
              <p style={{ color: '#888', marginBottom: '1rem' }}>
                All NFTs owned by the bank. Set prices to list them in the marketplace.
              </p>
              {bankNfts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No NFTs in bank. Run: npm run mint
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {bankNfts.map(nft => (
                    <div key={nft.tokenId} style={{
                      background: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: `1px solid ${nft.forSale ? '#4CAF50' : '#333'}`
                    }}>
                      {nft.image && <img src={nft.image} alt={nft.name} style={{ width: '100%', borderRadius: '8px' }} />}
                      <h4>{nft.name}</h4>
                      <p style={{ color: '#888', fontSize: '0.9rem' }}>{nft.description}</p>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        Token #{nft.tokenId}
                      </div>
                      {nft.forSale ? (
                        <div style={{ 
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          background: '#4CAF5020',
                          borderRadius: '6px',
                          color: '#4CAF50'
                        }}>
                          For sale: {nft.price} ETH
                        </div>
                      ) : (
                        <div style={{ 
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          background: '#ff980020',
                          borderRadius: '6px',
                          color: '#ff9800'
                        }}>
                          Not for sale
                        </div>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => setNFTPrice(nft.tokenId)}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            width: '100%',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {nft.forSale ? 'Update Price' : 'Set Price'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {!loading && account && !isOwner && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p style={{ color: '#888' }}>
            This is the bank management interface. Only the contract owner can access it.
          </p>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            To purchase NFTs, please use the ZeroID Wallet marketplace.
          </p>
        </div>
      )}

      {!account && !loading && (
        <div className="empty-state">
          <h2>NFT Bank Management</h2>
          <p>Connect your wallet to manage the NFT bank</p>
          <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '1rem' }}>
            This interface is for the bank owner to mint NFTs and set prices.
          </p>
        </div>
      )}
    </div>
  )
}

// Add types for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

export default App
