"use strict";
/*
  Add NFT collection into whitelist.
*/
exports.__esModule = true;
var network_1 = require("@stacks/network");
var transactions_1 = require("@stacks/transactions");
var network = new network_1.StacksMocknet();
var txSenderKey = '7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801'; // marketplace owner
// NFT Collection for Whitelist add
var nftCollectionContractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
var nftCollectionContractName = 'punker-nft';
// Marketplace contract
var marketplaceAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
var marketplaceContractName = 'marketer-v14';
var marketplaceFunctionName = 'add-whitelist-collection';
var marketplaceRoyaltyRate = 10;
var marketplaceRoyaltyAddress = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
var marketplaceFunctionArgs = [
    // express arguments in Clarity value format
    (0, transactions_1.contractPrincipalCV)(nftCollectionContractAddress, nftCollectionContractName),
    (0, transactions_1.uintCV)(marketplaceRoyaltyRate),
    (0, transactions_1.standardPrincipalCV)(marketplaceRoyaltyAddress),
];
var options = {
    contractAddress: marketplaceAddress,
    contractName: marketplaceContractName,
    functionName: marketplaceFunctionName,
    functionArgs: marketplaceFunctionArgs,
    network: network,
    senderKey: txSenderKey,
    appDetails: {
        name: 'Dartman',
        icon: 'https://static.vecteezy.com/system/resources/previews/000/649/115/original/user-icon-symbol-sign-vector.jpg'
    },
    anchorMode: transactions_1.AnchorMode.Any,
    //nonce: 36n, // skip nonce check
    fee: 500n
};
console.log(options);
var transaction = await (0, transactions_1.makeContractCall)(options);
var broadcastResponse = await (0, transactions_1.broadcastTransaction)(transaction, network);
console.log('\nbroadcastResponse=' + JSON.stringify(broadcastResponse));
