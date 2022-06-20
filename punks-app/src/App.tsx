// Using useContext and useReducer:
//  1. Set initial state values.
//  2. Create a context, with React.createContext()
//      - to make `state` and `dispatch` available for child components
//  3. Create reducer function.
//  4. Create context provider flow.
//  5. Create components.

import { type } from '@testing-library/user-event/dist/type';
import React, { Reducer, useReducer } from 'react';
import './App.css';
//import { abiFunctionToString } from '@stacks/transactions';
//import Read_Only from './contract_call_read_only';
//import marketplace_00_add_wl from './marketplace_00_add_wl';


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
} from '@stacks/transactions';

interface IPunksState { 
  id: number,
  text: string,
}

export type actionType = 'LIST' | 'BUY' | 'WHITELIST' | 'DEPLOY';

// action interface
interface IAction {
  type: actionType;
  payload: number;
}

// Initial state
const punksInitialState: IPunksState  = { id: 1, text: 'something' };

// +--------+
// | main() |
// +--------+
function App() {
  const [ state, dispatch ] = useReducer(punksReducer, punksInitialState);
  return (
    <>
      <p>state.id = {state.id}</p>
      <p>state.text = {state.text}</p>
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
    case 'WHITELIST':
      const x = marketplace_00_add_wl();
      return {id:91, text: 'x'};
    case 'LIST':
        return listNft();  
    case 'BUY':
      return buyNft();
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
async function marketplace_00_add_wl() : Promise<IPunksState> {
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

  console.log(options);

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

  // Mapping:
  //   ST1VXGZWHHXJ501Q1EHCGWE9K8WWHWQN1NM62PCW0  e71682a2cc6e32ba4875011175c7e7aa8d64e0c699a40e08d2baa758214057b801  --> lister/owner of nft
  //   ST2TQ281FV5Y2TTEWJQS5ZJXFKQVCEDEGZETC4Y10  c07637ffad47d9255adf59b8d14f0d07081f1ebec501abc3c6951bc70eb2a84d01  --> tx-sender; buyer
  //   ST3VSVNG0FR8JDDD3WENJVX10P1VWTR7PP3EM0HA1  0492f0ee23d216679d537072159afb17fe33706f3de72c949ceb3b7257c00d0b01  --> deployer, marketplace

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

  //NFT from Escrow to Standard Principal, use DoesNotOwn
  //FT condition checks for - see actual below. :)
  const postConditions = [
    makeContractNonFungiblePostCondition(
      marketplaceAddress,
      marketplaceContractName,
      nftPostConditionCode,
      nonFungibleAssetInfo,
      uintCV(nftListedId)
    ),
    makeStandardSTXPostCondition(buyerAddress, FungibleConditionCode.GreaterEqual, 0), // Buyer sending STX to seller and to marketplace owner. How do I calculate the actual cost?
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

  console.log(options);

  const transaction = await makeContractCall(options);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));

  return {id: 2, text: 'Buy NFT'};
}
// +-----------+
// | Buy - end |
// +-----------+


export default App;
