import { StacksMocknet } from '@stacks/network';

import {
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  AnchorMode,
  makeContractCall,
  broadcastTransaction,
  noneCV,
  //noneCV,
  //someCV,
} from '@stacks/transactions';

const network = new StacksMocknet();

const deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

const minterAddress = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
const txSenderKey = '530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101';

const assetAddress = deployer;
const assetContractName = 'punker-nft'; // This is the contract name, not the NFT name.

const functionArgs = []; // claim() has no parameters

const postConditions = [
  makeStandardSTXPostCondition(minterAddress, FungibleConditionCode.GreaterEqual, 0),
];

const options = {
  contractAddress: assetAddress,
  contractName: assetContractName,
  functionName: 'claim', // claim/mint an NFT
  functionArgs,
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

/*
A Non-fungible token post-condition body is encoded as follows:
A variable-length principal, containing the address of the standard account or contract account
A variable-length asset info structure that identifies the token type
A variable-length asset name, which is the Clarity value that names the token instance, serialized according to the Clarity value serialization format.
A 1-byte non-fungible condition code
*/

/*
export declare function makeStandardNonFungiblePostCondition(
  address: string,  
    -> Either current NFT owner (sender) or futue NFT owner (receiver)
  conditionCode: NonFungibleConditionCode, 
    -> Owns=receiver receives NFT while DoesNotOwn=sender gives up NFT `
  assetInfo: string | AssetInfo,
  assetName: ClarityValue  
    -> NFT ID/Token ID/Asset ID; not asset name.
): NonFungiblePostCondition;
*/
