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
      <thead>
        <tr>
          <th>No.</th>
          <th>Action</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <button type="button"
              onClick = { () =>
                dispatch({type:'WHITELIST', payload: 2})
              }
              > WHITELIST
            </button>
          </td>
          <td>
            <button type="button"
              onClick = { () =>
                dispatch({type:'LIST', payload: 2})
              }
            > LIST
            </button>
          </td>
          <td>
            <button type="button"
              onClick = { () =>
                dispatch({type:'BUY', payload: 2})
              }
            > BUY
            </button>
          </td>
        </tr>
      </tbody>
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
    case 'BUY':
      return buyNft();
    default:
      return punksInitialState;
  }
}
// +---------------+
// | Reducer - end | 
// +---------------+


// +-------------+
// | Buy - begin |
// +-------------+
function buyNft () : IPunksState {
  return {id: 2, text: 'Buy NFT'};
  //return punksInitialState;
}
// +-----------+
// | Buy - end |
// +-----------+


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


export default App;
