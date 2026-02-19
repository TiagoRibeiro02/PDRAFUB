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
}

function App() {
  const [account, setAccount] = useState<string>('')
  const [nfts, setNfts] = useState<NFTData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    checkWalletConnection()
  }, [])

  useEffect(() => {
    if (account && contractAddress) {
      loadNFTs()
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
        <h1>NFTs</h1>
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

      {loading && <div className="loading">Loading NFTs...</div>}

      {!loading && account && (
        <NFTGallery nfts={nfts} />
      )}

      {!account && !loading && (
        <div className="empty-state">
          <h2>Welcome to the NFT Gallery</h2>
          <p>Connect your wallet to view your NFT collection</p>
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
