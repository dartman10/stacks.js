// Punkers Testing

// Mapping of address to private keys for testing:
//   ST1VXGZWHHXJ501Q1EHCGWE9K8WWHWQN1NM62PCW0  e71682a2cc6e32ba4875011175c7e7aa8d64e0c699a40e08d2baa758214057b801  --> lister/owner of nft
//   ST2TQ281FV5Y2TTEWJQS5ZJXFKQVCEDEGZETC4Y10  c07637ffad47d9255adf59b8d14f0d07081f1ebec501abc3c6951bc70eb2a84d01  --> tx-sender; buyer
//   ST3VSVNG0FR8JDDD3WENJVX10P1VWTR7PP3EM0HA1  0492f0ee23d216679d537072159afb17fe33706f3de72c949ceb3b7257c00d0b01  --> deployer, marketplace

import { useReducer } from 'react';
import './App.css';

import { StacksMocknet } from '@stacks/network';

import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  uintCV,
  contractPrincipalCV,
  standardPrincipalCV,
  NonFungibleConditionCode,
  createAssetInfo,
  makeStandardNonFungiblePostCondition,
  makeContractNonFungiblePostCondition,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  makeContractDeploy,
} from '@stacks/transactions';

interface IPunksState { 
  id: number,
  text: string,
}

export type actionType = 'LIST' | 'BUY' | 'WHITELIST' | 'DEPLOYNFT' | 'DEPLOYMARKET' | 'MINT';

// action interface
interface IAction {
  type: actionType;
  payload: number;
}

// Initial state
const punksInitialState: IPunksState  = { id: 1, text: 'nothing' };

// +--------+
// | main() |
// +--------+
function App() {
  const [ state, dispatch ] = useReducer(punksReducer, punksInitialState);
  return (
    <>
      <p>Event : {state.text}</p>
      <hr></hr>
      <p>CAST OF CHARACTERS</p>
      <p>1. NFT Contract Deployer</p>
      <p>2. NFT Owner</p>
      <p>3. Marketplace Contract Deployer</p>
      <p>4. Whitelist Maintainer</p>
      <p>5. NFT Lister (also the NFT owner above)</p>
      <p>6. NFT Buyer</p>
      <hr></hr>
      Mapping of address to keys:
      <p>ST1VXGZWHHXJ501Q1EHCGWE9K8WWHWQN1NM62PCW0  e71682a2cc6e32ba4875011175c7e7aa8d64e0c699a40e08d2baa758214057b801</p>
      <p>ST2TQ281FV5Y2TTEWJQS5ZJXFKQVCEDEGZETC4Y10  c07637ffad47d9255adf59b8d14f0d07081f1ebec501abc3c6951bc70eb2a84d01</p>
      <p>ST3VSVNG0FR8JDDD3WENJVX10P1VWTR7PP3EM0HA1  0492f0ee23d216679d537072159afb17fe33706f3de72c949ceb3b7257c00d0b01</p>

      <hr></hr>
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Action</th>
            <th>Parameters</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <button type="button"
               onClick = { () =>
                  dispatch({type:'DEPLOYNFT', payload: 2})
                }
                > DEPLOY NFT
              </button>
            </td>
            <td>txSenderKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801'
            </td>
          </tr>
          <tr>
            <td>1</td>
            <td>
              <button type="button"
               onClick = { () =>
                  dispatch({type:'DEPLOYMARKET', payload: 2})
                }
                > DEPLOY MARKETPLACE
              </button>
            </td>
            <td>txSenderKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801'
            </td>
          </tr>

          <tr>
            <td>1</td>
            <td>
              <button type="button"
               onClick = { () =>
                  dispatch({type:'WHITELIST', payload: 2})
                }
                > WHITELIST
              </button>
            </td>
            <td>txSenderKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801'

            </td>
          </tr>

          <tr>
            <td>2</td>
            <td>
              <button type="button"
                onClick = { () =>
                  dispatch({type:'LIST', payload: 2})
                }
                > LIST
              </button>
            </td>
            <td>tell me</td>
          </tr>
          <tr>
            <td>3</td>
            <td>
              <button type="button"
                onClick = { () =>
                  dispatch({type:'BUY', payload: 2})
                }
              > BUY
              </button>
            </td>
            <td>tell me</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}


// +-----------------+
// | Reducer - begin | 
// +-----------------+
function punksReducer (state: IPunksState, action: IAction): IPunksState {
  switch (action.type) {
    case 'DEPLOYNFT':
      deployNft();
      return {id:10, text: 'DEPLOYNFT executed'};
    case 'DEPLOYMARKET':
        deployMarketplace();
        return {id:10, text: 'DEPLOYMARKET executed'};
    case 'WHITELIST':
      addWhitelist();
      return {id:10, text: 'WHITELIST executed'};
    case 'LIST':
      listNft();
      return {id:11, text: 'LIST executed'};
    case 'BUY':
      buyNft();
      return {id:12, text: 'BUY executed'};
    default:
      return punksInitialState;
  }
}
// +---------------+
// | Reducer - end | 
// +---------------+


// +-------------------+
// | Whitelist - begin |
// +-------------------+
async function addWhitelist() : Promise<IPunksState> {
  const network = new StacksMocknet();
  const txSenderKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801'; // marketplace owner
  const nftCollectionContractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const nftCollectionContractName = 'punker-nft';

  // Marketplace contract
  const marketplaceAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const marketplaceContractName = 'marketer-v14';
  const marketplaceFunctionName = 'add-whitelist-collection';
  const marketplaceRoyaltyRate = 10;
  const marketplaceRoyaltyAddress = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
  const marketplaceFunctionArgs = [
    // express arguments in Clarity value format
    contractPrincipalCV(nftCollectionContractAddress, nftCollectionContractName),
    uintCV(marketplaceRoyaltyRate),
    standardPrincipalCV(marketplaceRoyaltyAddress),
  ];
  const options = {
    contractAddress: marketplaceAddress,
    contractName: marketplaceContractName,
    functionName: marketplaceFunctionName,
    functionArgs: marketplaceFunctionArgs,
    network,
    senderKey: txSenderKey,
    appDetails: {
      name: 'Dartman',
      icon: 'https://static.vecteezy.com/system/resources/previews/000/649/115/original/user-icon-symbol-sign-vector.jpg',
    },
    anchorMode: AnchorMode.Any,
    //nonce: 36n, // skip nonce check
    fee: 500n, // skip fee estimator
  };
  const transaction =  await makeContractCall(options);
  const broadcastResponse =  await broadcastTransaction(transaction, network);
 
  let txId = '';
  await broadcastTransaction(transaction, network)
    .then (res => { txId = res.txid}) ;
  console.log('transaction_id:' + txId);
  return {id: 100, text: txId};
}
// +-----------------+
// | Whitelist - end |
// +-----------------+


// +--------------+
// | List - begin |
// +--------------+
async function listNft () : Promise<IPunksState> {
  
  const network = new StacksMocknet();
  const txSenderKey = '530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101';

  // NFT to be listed
  const nftToBeListedContractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const nftToBeListedContractName = 'punker-nft';
  const nftToBeListedNftName = 'punker-nft';
  const nftToBeListedId = 3;
  const nftToBeListedPrice = 1000000; //uintCV(10);
  const nftToBeListedOwner = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

  // nft will be transferred to marketplace escrow
  const marketplaceAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const marketplaceContractName = 'marketer-v14';
  const marketplaceFunctionName = 'list-nft';
  const marketplaceFunctionArgs = [
    // express arguments in Clarity value format
    contractPrincipalCV(nftToBeListedContractAddress, nftToBeListedContractName),
    uintCV(nftToBeListedId),
    uintCV(nftToBeListedPrice),
  ];

  const nftPostConditionCode = NonFungibleConditionCode.DoesNotOwn; //DoesNotOwn = owner sent NFT
  const nonFungibleAssetInfo = createAssetInfo(
    nftToBeListedContractAddress,
    nftToBeListedContractName,
    nftToBeListedNftName
  );

  const postConditions = [
    makeStandardNonFungiblePostCondition(
      nftToBeListedOwner,
      nftPostConditionCode,
      nonFungibleAssetInfo,
      uintCV(nftToBeListedId)
    ),
  ];

  const options = {
    contractAddress: marketplaceAddress,
    contractName: marketplaceContractName,
    functionName: marketplaceFunctionName,
    functionArgs: marketplaceFunctionArgs,
    network,
    senderKey: txSenderKey,
    postConditions,
    appDetails: {
      name: 'Dartman',
      icon: 'https://static.vecteezy.com/system/resources/previews/000/649/115/original/user-icon-symbol-sign-vector.jpg',
    },
    anchorMode: AnchorMode.Any,
    //nonce: 36n, // skip nonce check
    fee: 500n, // skip fee estimator
  };

  const transaction = await makeContractCall(options);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));

  return {id: 2, text: 'List NFT'};
}
// +------------+
// | List - end |
// +------------+


// +-------------+
// | Buy - begin |
// +-------------+
async function buyNft () : Promise<IPunksState> {
  const network = new StacksMocknet();

  // NFT Buyer/Sender
  const txSenderKey = 'd655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901';
  const buyerAddress = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';

  // NFT listed
  const nftListedContractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const nftListedContractName = 'punker-nft';
  const nftListedNftName = 'punker-nft';
  const nftListedId = 2;

  // nft transfer from marketplace escrow to buyer
  const marketplaceAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const marketplaceContractName = 'marketer-v14';
  const marketplaceFunctionName = 'buy-nft'; //(define-public (buy-nft (nft-contract <nft-trait>) (nft-id uint))
  const marketplaceFunctionArgs = [
    // express arguments in Clarity value format
    contractPrincipalCV(nftListedContractAddress, nftListedContractName),
    uintCV(nftListedId),
  ];

  // NFT
  const nftPostConditionCode = NonFungibleConditionCode.DoesNotOwn;
  const nonFungibleAssetInfo = createAssetInfo(
    nftListedContractAddress,
    nftListedContractName,
    nftListedNftName
  );

  const postConditions = [
    makeContractNonFungiblePostCondition(
      marketplaceAddress,
      marketplaceContractName,
      nftPostConditionCode,
      nonFungibleAssetInfo,
      uintCV(nftListedId)
    ),
    makeStandardSTXPostCondition(buyerAddress, FungibleConditionCode.GreaterEqual, 0), // Buyer sending STX to seller and to marketplace owner.
  ];

  const options = {
    contractAddress: marketplaceAddress,
    contractName: marketplaceContractName,
    functionName: marketplaceFunctionName,
    functionArgs: marketplaceFunctionArgs,
    network,
    senderKey: txSenderKey,
    postConditions,
    appDetails: {
      name: 'Dartman',
      icon: 'https://static.vecteezy.com/system/resources/previews/000/649/115/original/user-icon-symbol-sign-vector.jpg',
    },
    anchorMode: AnchorMode.Any,
    //nonce: 36n, // skip nonce check
    fee: 500n, // skip fee estimator
  };

  const transaction = await makeContractCall(options);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));
  return {id: 2, text: 'Buy NFT'};
}
// +-----------+
// | Buy - end |
// +-----------+


// +--------------------+
// | Deploy NFT - begin |
// +--------------------+
async function deployNft () : Promise<IPunksState> {
  const network = new StacksMocknet();
  const senderKey = '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601';
  const codeBody = nftContract;
  const contractName = 'punker-nft3';
  const anchorMode = AnchorMode.Any;
  const txOptions = {
    contractName,
    codeBody,
    senderKey,
    network,
    anchorMode,
  };
  const transaction = await makeContractDeploy(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));
  return {id: 2, text: 'Deploy NFT'};

}
// +------------------+
// | Deploy NFT - end |
// +------------------+


// +----------------------------+
// | Deploy Marketplace - begin |
// +----------------------------+
async function deployMarketplace () : Promise<IPunksState> {
  const network = new StacksMocknet();  
  const senderKey = '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601';
  const codeBody = marketplaceContract;
  const contractName = 'marketer-v14';
  const anchorMode = AnchorMode.Any;
  const txOptions = {
    contractName,
    codeBody,
    senderKey,
    network,
    anchorMode,
  };  
  const transaction = await makeContractDeploy(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network); 
  console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));
  return {id: 12, text: 'Deploy Marketplace'};
}
// +--------------------------+
// | Deploy Marketplace - end |
// +--------------------------+



// --- NFT contract ---
const nftContract =
`
;; -----------------------------------------------------------------------------
;;  PUNKER  NFT
;; -----------------------------------------------------------------------------

;; SIP-009 (NFT) interface
(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft-trait.nft-trait)  ;; testnet, devnet, Clarity console
;; (impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)  ;; mainnet, as suggested in SIP-009.

(define-constant MAX-TOKEN-LIMIT u1000) 

;; Store the last issues token ID
(define-data-var last-token-id uint u0)
(define-data-var nft-owner principal tx-sender)

;; The NFT
(define-non-fungible-token punker-nft uint) ;; Signature: (define-non-fungible-token asset-name asset-identifier-type)

;; SIP-009: Get last NFT token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; SIP-009: Get NFT URI
(define-read-only (get-token-uri (nft-id uint))
    (ok (some "Keep on walking, nothing to see here."))
)

;; SIP-009: Get the owner of the specified token ID
(define-read-only (get-owner (nft-id uint))
  (ok (nft-get-owner? punker-nft nft-id))
)

;; SIP-009: Transfer token to a specified principal.
(define-public (transfer (nft-id uint) (sender principal) (receiver principal))
    (begin
        (try! (nft-transfer? punker-nft nft-id sender receiver))  
        (ok true)
    )
)

;; Set variable nft-owner to the current owner of nft id.
(define-private (set-var-nft-owner (nft-id uint))
    (var-set nft-owner (unwrap-panic (nft-get-owner? punker-nft nft-id)))
)

;; Get next NFT token ID
(define-read-only (get-next-token-id)
    (+ (var-get last-token-id) u1)
)

;; Set last NFT token ID
(define-private (set-last-token-id (next-token-id uint))
    (var-set last-token-id next-token-id)
)

;; Claim a new NFT
(define-public (claim)
    (begin
        (asserts! (< (var-get last-token-id) MAX-TOKEN-LIMIT) (err u111) )
        (mint tx-sender) 
    )
)

;; Inner mint new NFT
(define-private (mint (new-owner principal))
    (let ((next-token-id (get-next-token-id)))
        (unwrap-panic (nft-mint? punker-nft next-token-id new-owner))
        (set-last-token-id next-token-id)
        (ok next-token-id)
    )
)

;; Convert uint to string
(define-constant LOOKUPS (list "0" "1" "2" "3" "4" "5" "6" "7" "8" "9"))
(define-read-only (lookup (uid uint))
    (unwrap-panic (element-at LOOKUPS uid))
)

;; ------------------------------
;; --- Mint NFT at deployment ---
;; ------------------------------
(claim)

;; ------------------------------------------------------------------
;;  For testing only
;; ------------------------------------------------------------------
(define-read-only (echo (shout-out (string-ascii 100))) (ok (concat "Right back at you - " shout-out)))  ;; echo
(define-read-only (get-contract-caller) (ok contract-caller ))           ;; returns contract-caller
(define-read-only (get-tx-sender) tx-sender)                       ;; returns tx-sender
(define-read-only (get-as-contract-sender) (ok (as-contract tx-sender)))                     

;;---------------------------------------------------------------------------------------------
;; nft-transfer?  https://docs.stacks.co/references/language-functions#nft-transfer
;;---------------------------------------------------------------------------------------------
;; Signature: (nft-transfer? asset-class asset-identifier sender recipient)
;; Input: AssetName, A, principal, principal
;; Output: (response bool uint)
;;
;; nft-transfer? is used to change the owner of an asset identified by asset-identifier 
;; from sender to recipient. The asset-class must have been defined by define-non-fungible-token
;; and asset-identifier must be of the type specified in that definition. In contrast to 
;; stx-transfer?, ANY USER CAN TRANSFER THE ASSET. When used, relevant guards need to be 
;; added.
;;
;; This function returns (ok true) if the transfer is successful. In the event of 
;; an unsuccessful transfer it returns one of the following error codes:
;;   (err u1) -- sender does not own the asset
;;   (err u2) -- sender and recipient are the same principal
;;   (err u3) -- asset identified by asset-identifier does not exist.
;;-----------------------------------------------------------------------------------------
`
; // end - NFT contract


// --- Marketplace contract ---
const marketplaceContract =
`
;; -----------------------------------------------------------------------------------------
;;  2022-06-08 : Error handling with expressive error messages.
;;  2022-06-07 : Added some contract-call error handling + getters/setters for testing.
;;  2022-06-05 : Adding map index.
;; -----------------------------------------------------------------------------------------

;; -----------------------------------------------------------------------------
;;  M A R K E T P L A C E  by <redacted>
;; -----------------------------------------------------------------------------

;;(use-trait nft-trait .nft-trait.nft-trait) ;; SIP-009 NFT trait
;;(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft-trait.nft-trait)  ;; testnet, devnet, Clarity console
;;(use-trait nft-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait) ;; mainnet
(use-trait nft-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft-trait.nft-trait)  ;; testnet, devnet, Clarity console

(define-constant MARKETPLACE_OWNER 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)  ;; <enter marketplace address here>
(define-constant CONTRACT_PRINCIPAL (as-contract tx-sender))  
(define-data-var marketplace-commission-rate uint u1)  ;; 1% initial marketplace commission rate

(define-map Listings
  { ;; listing-key
    list-nft-contract: principal,
    list-nft-id: uint 
  } 
  { ;;listing-value
    list-nft-owner: principal,
    list-price: uint,                 ;; unit price in STX token, to be refactored to accept any whitelisted SIP-010 token.
    list-commission-amount: uint,     ;; sales commission paid to marketplace owner.  pre-calculated during NFT listing creation.
    list-royalty-address: principal,  ;; creator of the NFT collection.
    list-royalty-amount: uint         ;; royalties paid to the creator. pre-calculated during NFT listing creation.
  
    ;; Amounts will be precalculated, meaning commissions and royalties will never change once NFT is listed.
    ;; If the NFT collection creator decided to change the royalty percentage, the existing
    ;; listing will not be affected.  This avoids customer confusion and possible support nightmare.
    ;; Same is applied to commission.

  }
)

(define-map ListingsIndex
  uint
  {
    list-nft-contract: principal,
    list-nft-id: uint 
  }
)
(define-data-var list-max-index uint u0)  ;; Holds the latest/maximum index value.

(define-map WhitelistNftCollection
  { whitelist-nft: principal }  ;; NFT contract
  {
    royalty-address: principal,   ;; address to receive royalty fees
    royalty-rate: uint,           ;; royalty percentage rate
    royalty-minimum: uint,        ;; placeholder for now, in case needed.
    royalty-maximum: uint,        ;; placeholder for now, in case needed.
    listing-minimum: uint,        ;; listing minimum price.  placeholder for now, in case needed.
    collection-owner: principal   ;; NFT collection owner, to enable self-maintain (e.g. change royalty amount). placeholder for now.
  }
)

;; ----------------------------------------------------------------------------
;; Add to map. Use map-set to override existing listing entry.
;; List an NFT into the marketplace:
;;  1. Check if tx-sender owns the NFT to be listed.
;;  2. Check if NFT is part of whitelisted NFT collection.
;;  3. Get/set corresponding royalty values from collection whitelist.
;;  4. Get/set marketplace commission rate.
;; ----------------------------------------------------------------------------
(define-public (list-nft (nft-contract <nft-trait>) (nft-id uint) (price uint))
    (let 
      ( 
        (nft-owner (unwrap! (get-owner nft-contract nft-id) ERR_UNWRAP_GET_OWNER))
        (list-nft-contract (contract-of nft-contract)) 

        ;; ---- get whitelist info ---
        (whitelist-key {
          whitelist-nft: (contract-of nft-contract)
        })
        (whitelist-value (unwrap! (map-get? WhitelistNftCollection whitelist-key) ERR_NFT_NOT_WHITELISTED))
        (royalty-address (get royalty-address whitelist-value))
        (royalty-rate (get royalty-rate whitelist-value))
        (royalty-amount (/ (* price royalty-rate) u100))
        (commission-amount (/ (* price (var-get marketplace-commission-rate)) u100))

        ;; include here sip-010 ft tokens for payment - logic is very similar to whitelisted nft

        ;; ---- set listing info ---
        (listing-key {
          list-nft-contract: list-nft-contract, 
          list-nft-id: nft-id
        })
        (listing-value {
          list-nft-owner: tx-sender, ;; succeeding asserts! fails if tx-sender not nft owner 
          list-price: price, 
          list-commission-amount: commission-amount, 
          list-royalty-address: royalty-address, ;; nft collection whitelisted address
          list-royalty-amount: royalty-amount
        })

        (list-next-index (+ u1 (var-get list-max-index)))
      )
      (asserts! (is-eq nft-owner tx-sender) ERR_UNAUTHORIZED)
      (map-set Listings listing-key listing-value)  ;; add NFT to Listings map, overwrite duplicate key.
      (add-listing-index-map list-next-index list-nft-contract nft-id)
      ;;(escrow-nft-to-marketplace nft-contract nft-id)
      (unwrap! (contract-call? nft-contract transfer nft-id tx-sender CONTRACT_PRINCIPAL) ERR_TRANSFER_TO_ESCROW)


      (print { 
        action: "list-nft",
        payload: {
        nft-contract: nft-contract,
        nft-id: nft-id,
        price: price
        }
      })

     (ok (merge listing-key listing-value))  ;; return to caller
    )
)

;; ----------------------------------------------------------------------------
;; Buy NFT
;;  1. Check if NFT is in the listings.
;;  2. Transfer FT from tx-sender/buyer to:
;;       - seller
;;       - royalty fees to NFT creator
;;       - marketplace commission 
;;  3. Transfer NFT from escrow (contract principal) to buyer
;;  4. Delete NFT from map Listings.
;;  5. Congrats and enjoy your NFT!  :)
;; ----------------------------------------------------------------------------
(define-public (buy-nft (nft-contract <nft-trait>) (nft-id uint))
    (let 
      ( 
        (listing-key {
          list-nft-contract: (contract-of nft-contract), 
          list-nft-id: nft-id
        })
        (listing-value (unwrap! (map-get? Listings listing-key) ERR_NFT_NOT_FOR_SALE))
        (list-nft-owner (get list-nft-owner listing-value))
        (list-price (get list-price listing-value))
        (list-commission-amount (get list-commission-amount listing-value))
        (list-royalty-address (get list-royalty-address listing-value))
        (list-royalty-amount (get list-royalty-amount listing-value))
        (pay-to-seller-amount (- (- list-price list-commission-amount) list-royalty-amount))
      )

    (unwrap! (stx-transfer? pay-to-seller-amount tx-sender list-nft-owner) ERR_PAY_SELLER)  
    ;;(unwrap! (stx-transfer? list-commission-amount tx-sender MARKETPLACE_OWNER) ERR_PAY_COMMISSION)
    (stx-transfer-commission list-commission-amount)
    (unwrap! (stx-transfer? list-royalty-amount tx-sender list-royalty-address) ERR_PAY_ROYALTY)
    (transfer-nft-to-buyer nft-contract nft-id)
    (map-delete Listings listing-key)

      (print { 
        action: "buy-nft",
        payload: {
          nft-contract: nft-contract,
          nft-id: nft-id
        },
        info: {
          price: list-price,
          list-commission-amount: list-commission-amount,
          list-royalty-amount: list-royalty-amount,
          pay-to-seller-amount: pay-to-seller-amount
        }
      })

     (ok listing-key)
    )
)

(define-private (stx-transfer-commission (list-commission-amount uint))
  (let
    (
      (ok-or-err (stx-transfer? list-commission-amount tx-sender MARKETPLACE_OWNER))
    )
    (asserts! (is-err ok-or-err) {return-code: ok-or-err, return-message: "stx-transfer-commission"}) ;; if err, exit flow. if ok, move on to next line.
                                 {return-code: (ok true), return-message: "all good in the hood. ignore me."}
  )
)

(define-private (get-owner (nft <nft-trait>) (nft-id uint))
  (unwrap-panic (contract-call? nft get-owner nft-id)) ;; need to test this unwrap-panic scenario
)

(define-private (escrow-nft-to-marketplace (nft-contract <nft-trait>) (nft-id uint))
  (let
    (
      (ok-or-err (contract-call? nft-contract transfer nft-id tx-sender CONTRACT_PRINCIPAL))
    )
    (asserts! (is-err ok-or-err) {return-code: ok-or-err, return-message: "escrow-nft-to-marketplace"}) ;; if err, exit flow. if ok, move on to next line.
                                 {return-code: (ok true), return-message: "all good in the hood. ignore me."}
  )
)

(define-private (transfer-nft-to-buyer (nft-contract <nft-trait>) (nft-id uint))
  (let 
    (
      (buyer tx-sender)
      (ok-or-err (as-contract (contract-call? nft-contract transfer nft-id CONTRACT_PRINCIPAL buyer)))
    )
    (asserts! (is-err ok-or-err) {return-code: ok-or-err, return-message: "transfer-nft-to-buyer"}) ;; if err, exit flow. if ok, move on to next line.
                                 {return-code: (ok true), return-message: "all good in the hood. ignore me."}
  )
)

;; ------------------------------------------------------------------
;;  NFT Collection Whitelist functions 
;; ------------------------------------------------------------------
(define-public (add-whitelist-collection (nft-contract principal) (royalty-rate uint) (royalty-address principal))
  (begin
    (asserts! (is-eq tx-sender MARKETPLACE_OWNER) ERR_UNAUTHORIZED)  ;; guard rail
    (map-set WhitelistNftCollection
      { whitelist-nft: nft-contract }
      {
        royalty-address: royalty-address,
        royalty-rate: royalty-rate,
        royalty-minimum: u0,
        royalty-maximum: u0,
        listing-minimum: u0,
        collection-owner: MARKETPLACE_OWNER
      }
    )
    (ok true)
  )
)

;; ------------------------------------------------------------------
;;  Listing Index functions 
;; ------------------------------------------------------------------

(define-read-only (get-list-max-index)
  (var-get list-max-index)
)

(define-private (add-listing-index-map (index uint) (nft-contract principal) (nft-id uint))
  (map-set ListingsIndex
    index
    {
      list-nft-contract: nft-contract,
      list-nft-id: nft-id
    }
  )
)

;; ------------------------------------------------------------------
;;  Error codes.
;; ------------------------------------------------------------------
(define-constant NO_ERROR                (err u000))
(define-constant ERR_UNAUTHORIZED        (err u401))
(define-constant ERR_UNWRAP_GET_OWNER    (err u402))
(define-constant ERR_TRANSFER_TO_ESCROW  (err u403))
(define-constant ERR_TRANSFER_TO_BUYER   (err u404))
(define-constant ERR_NFT_NOT_FOR_SALE    (err u405))
(define-constant ERR_PAY_SELLER          (err u406))
(define-constant ERR_PAY_COMMISSION      (err u407))
(define-constant ERR_PAY_ROYALTY         (err u408))
(define-constant ERR_NFT_NOT_WHITELISTED (err u409))

;; ------------------------------------------------------------------
;;  Following lines executed at deployment time.
;; ------------------------------------------------------------------
(var-set marketplace-commission-rate u5)  ;; initial commission rate, can be updated by marketplace owner
;;(try! (add-whitelist-collection 'SP32AEEF6WW5Y0NMJ1S8SBSZDAY8R5J32NBZFPKKZ.free-punks-v0 u10))
;;(try! (add-whitelist-collection  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.nft-cat-in-the-hat  u50  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM))
;;(try! (add-whitelist-collection  'ST1S06MKADCKV8B18PZYC3F64CHQR2G9YPJ83BGB2.kids-nft  u50  'ST1XBS03PFDTV1HSD7BY02V6VG16VTNRDP8GEN2VK))

(print { 
  action: "At deployment!",
  marketplace-commission-rate: (var-get marketplace-commission-rate)
})

;; ------------------------------------------------------------------
;;  For testing only. Delete before deploying to mainnet.
;; ------------------------------------------------------------------
(define-read-only (echo (shout-out (string-ascii 100))) (ok (concat "Right back at you - " shout-out)))  ;; echo
(define-read-only (get-contract-caller) (ok contract-caller ))           ;; returns contract-caller
(define-read-only (get-tx-sender) (ok tx-sender ))                       ;; returns tx-sender
(define-read-only (get-marketplace-commission-rate) (ok (var-get marketplace-commission-rate)))                       
(define-public (set-marketplace-commission-rate (new-rate uint)) (ok (var-set marketplace-commission-rate new-rate )))
(define-read-only (get-listing-index-map (index uint)) (ok (map-get? ListingsIndex index)))
(define-read-only (get-listings-entry (list-nft-contract principal) (list-nft-id uint))
  (ok (map-get? Listings { list-nft-contract: list-nft-contract, list-nft-id: list-nft-id } )))
(define-read-only (get-whitelist-entry (whitelist-nft principal))
  (ok (map-get? WhitelistNftCollection { whitelist-nft: whitelist-nft} )))

`
;  // end - marketplace contract


export default App;
