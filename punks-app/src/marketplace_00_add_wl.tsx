/*
  Add NFT collection into whitelist.
*/

import { StacksMocknet } from '@stacks/network';

import {
  //makeContractCall,
  //broadcastTransaction,
  AnchorMode,
  uintCV,
  contractPrincipalCV,
  standardPrincipalCV,
} from '@stacks/transactions';


interface IPunksState { // is context same as state? is this an interface for context or state?
  id: number,
  text: string,
}

function marketplace_00_add_wl() : IPunksState {
  return {id: 123, text: '123'};
/*
  const network = new StacksMocknet();

  const txSenderKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801'; // marketplace owner

  // NFT Collection for Whitelist add
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
    //fee: 500n, // skip fee estimator
  };

  console.log(options);

  /*
const transaction = await makeContractCall(options);
const broadcastResponse = await broadcastTransaction(transaction, network);
console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));
*/
}

export default marketplace_00_add_wl;
