import {
  createApiKeyMiddleware,
  createFetchFn,
  StacksMainnet,
  StacksTestnet,
} from '@stacks/network';
import * as fs from 'fs';
import fetchMock from 'jest-fetch-mock';
import {
  createSingleSigSpendingCondition,
  createSponsoredAuth,
  emptyMessageSignature,
  isSingleSig,
  MultiSigSpendingCondition,
  nextSignature,
  SingleSigSpendingCondition,
  SponsoredAuthorization,
  StandardAuthorization,
} from '../src/authorization';
import { BufferReader } from '../src/bufferReader';
import {
  broadcastTransaction,
  callReadOnlyFunction,
  estimateTransaction,
  getNonce,
  makeContractCall,
  makeContractDeploy,
  makeContractFungiblePostCondition,
  makeContractNonFungiblePostCondition,
  makeContractSTXPostCondition,
  makeStandardFungiblePostCondition,
  makeStandardNonFungiblePostCondition,
  makeStandardSTXPostCondition,
  makeSTXTokenTransfer,
  makeUnsignedContractCall,
  makeUnsignedContractDeploy,
  makeUnsignedSTXTokenTransfer,
  SignedTokenTransferOptions,
  sponsorTransaction,
  TxBroadcastResult,
  TxBroadcastResultOk,
  TxBroadcastResultRejected,
  estimateTransactionByteLength,
} from '../src/builders';
import { bufferCV, bufferCVFromString, serializeCV, standardPrincipalCV } from '../src/clarity';
import { createMessageSignature } from '../src/common';
import {
  AddressHashMode,
  AnchorMode,
  AuthType,
  DEFAULT_CORE_NODE_API_URL,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  PubKeyEncoding,
  TransactionVersion,
  TxRejectedReason,
} from '../src/constants';
import { ClarityAbi } from '../src/contract-abi';
import {
  createStacksPrivateKey,
  isCompressed,
  pubKeyfromPrivKey,
  publicKeyToString,
} from '../src/keys';
import { createTokenTransferPayload, serializePayload, TokenTransferPayload } from '../src/payload';
import { createAssetInfo } from '../src/postcondition-types';
import { createTransactionAuthField } from '../src/signature';
import { TransactionSigner } from '../src/signer';
import { deserializeTransaction, StacksTransaction } from '../src/transaction';
import { cloneDeep } from '../src/utils';

function setSignature(
  unsignedTransaction: StacksTransaction,
  signature: string | Buffer
): StacksTransaction {
  const parsedSig = typeof signature === 'string' ? signature : signature.toString('hex');
  const tx = cloneDeep(unsignedTransaction);
  if (!tx.auth.spendingCondition) {
    throw new Error('Cannot set signature on transaction without spending condition');
  }
  if (isSingleSig(tx.auth.spendingCondition)) {
    tx.auth.spendingCondition.signature = createMessageSignature(parsedSig);
    return tx;
  } else {
    throw new Error('Cannot set signature on multi-sig transaction');
  }
}

beforeEach(() => {
  fetchMock.resetMocks();
  jest.resetModules();
});

test('API key middleware - get nonce', async () => {
  const senderAddress = 'STB44HYPYAT2BB2QE513NSP81HTMYWBJP02HPGK6';

  const apiKey = '1234-my-api-key-example';
  const fetchFn = createFetchFn(createApiKeyMiddleware({ apiKey }));
  const network = new StacksMainnet({ fetchFn });

  fetchMock.mockOnce(`{"balance": "0", "nonce": "123"}`);

  const fetchNonce = await getNonce(senderAddress, network);
  expect(fetchNonce).toBe(123n);
  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(
    'https://stacks-node-api.mainnet.stacks.co/v2/accounts/STB44HYPYAT2BB2QE513NSP81HTMYWBJP02HPGK6?proof=0'
  );
  const callHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
  expect(callHeaders.has('x-api-key')).toBeTruthy();
  expect(callHeaders.get('x-api-key')).toBe(apiKey);
});

test('Make STX token transfer with set tx fee', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00008b316d56e35b3b8d03ab3b9dbe05eb44d64c53e7ba3c468f9a78c82a13f2174c32facb0f29faeb2107' +
    '5ec933db935ebc28a8793cc60e14b8ee4ef05f52c94016030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(serialized).toBe(tx);
});

test('Make STX token transfer with fee estimate', async () => {
  const apiUrl = `${DEFAULT_CORE_NODE_API_URL}/v2/fees/transaction`;
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const mockedResponse = JSON.stringify({
    cost_scalar_change_by_byte: 0.00476837158203125,
    estimated_cost: {
      read_count: 19,
      read_length: 4814,
      runtime: 7175000,
      write_count: 2,
      write_length: 1020,
    },
    estimated_cost_scalar: 14,
    estimations: [
      {
        fee: 200,
        fee_rate: 10,
      },
      {
        fee: 180,
        fee_rate: 1.2410714285714286,
      },
      {
        fee: 160,
        fee_rate: 8.958333333333332,
      },
    ],
  });

  fetchMock.mockOnce(mockedResponse);

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    nonce,
    senderKey,
    memo,
    anchorMode: AnchorMode.Any,
  });

  expect(transaction.auth.spendingCondition?.fee?.toString()).toEqual('180');

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c775000000000000000000000000000000b4' +
    '0001e5ac1152f6018fbfded102268b22086666150823d0ae57f4023bde058a7ff0b279076db25b358b8833' +
    '2efba7a8a75e7ccd08207af62d799e6eb8b0357ad55558030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(serialized).toBe(tx);
});

test('Make STX token transfer with testnet', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    network: new StacksTestnet(),
    memo: memo,
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '8080000000040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00014199f63f7e010141a36a4624d032758f54e08ff03b24ed2667463eb405b4d81505631b32a1f13b5737' +
    '1f29a6095b81741b32b5864b178e3546ff2bfb3dc08682030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(serialized).toBe(tx);
});

test('Make STX token transfer with testnet string name', async () => {
  const transaction = await makeSTXTokenTransfer({
    recipient: standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159'),
    amount: 12345,
    senderKey: 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01',
    fee: 0,
    nonce: 0,
    network: 'testnet',
    memo: 'test memo',
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '8080000000040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '00014199f63f7e010141a36a4624d032758f54e08ff03b24ed2667463eb405b4d81505631b32a1f13b5737' +
    '1f29a6095b81741b32b5864b178e3546ff2bfb3dc08682030200000000000516df0ba3e79792be7be5e50a' +
    '370289accfc8c9e032000000000000303974657374206d656d6f0000000000000000000000000000000000' +
    '0000000000000000';

  expect(serialized).toBe(tx);
});

test('Throws making STX token transder with invalid network name', async () => {
  const txOptions = {
    recipient: standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159'),
    amount: 12345,
    senderKey: 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01',
    fee: 0,
    nonce: 0,
    network: 'invalidnet',
    memo: 'test memo',
    anchorMode: AnchorMode.Any,
  };

  expect(
    async () => await makeSTXTokenTransfer(txOptions as SignedTokenTransferOptions)
  ).rejects.toThrow(Error);
});

test('Make STX token transfer with post conditions', async () => {
  const recipientAddress = 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159';
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const postConditions = [
    makeStandardSTXPostCondition(recipientAddress, FungibleConditionCode.GreaterEqual, 54321),
  ];

  const transaction = await makeSTXTokenTransfer({
    recipient: standardPrincipalCV(recipientAddress),
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    postConditions,
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '0000000001040015c31b8c1c11c515e244b75806bac48d1399c77500000000000000000000000000000000' +
    '0001601ceb46ef6988c8b226c80fef4051de6acf344dc67a9421d3e734a72ae310104b061e69cee5d9ee7a' +
    '6e1cef17f23b07d7fe4db5fcdb83de0d5f08043a06a36a030200000001000216df0ba3e79792be7be5e50a' +
    '370289accfc8c9e03203000000000000d431000516df0ba3e79792be7be5e50a370289accfc8c9e0320000' +
    '00000000303974657374206d656d6f00000000000000000000000000000000000000000000000000';

  expect(serialized).toBe(tx);
});

test('Make Multi-Sig STX token transfer', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 0;
  const nonce = 0;
  const memo = 'test memo';

  const authType = AuthType.Standard;
  const addressHashMode = AddressHashMode.SerializeP2SH;

  const privKeyStrings = [
    '6d430bb91222408e7706c9001cfaeb91b08c2be6d5ac95779ab52c6b431950e001',
    '2a584d899fed1d24e26b524f202763c8ab30260167429f157f1c119f550fa6af01',
    'd5200dee706ee53ae98a03fba6cf4fdcc5084c30cfa9e1b3462dcdeaa3e0f1d201',
  ];
  const privKeys = privKeyStrings.map(createStacksPrivateKey);

  const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
  const pubKeyStrings = pubKeys.map(publicKeyToString);

  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    memo: memo,
    numSignatures: 2,
    publicKeys: pubKeyStrings,
    anchorMode: AnchorMode.Any,
  });
  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKeys[0]);
  signer.signOrigin(privKeys[1]);
  signer.appendOrigin(pubKeys[2]);

  const serializedTx = transaction.serialize();
  const tx =
    '00000000010401a23ea89d6529ac48ac766f720e480beec7f1927300000000000000000000000000000000' +
    '000000030200dc8061e63a8ed7ca4712c257299b4bdc3938e34ccc01ce979dd74e5483c4f971053a12680c' +
    'bfbea87976543a94500314c9a1eaf33986aef97821eb65fb0c604202018ff7d2d8cd4e43498912bfc2c30b' +
    'e1fd58bef8d819e1371a0f5afa5e4b58ff6e498bd67b58c32bf670f0d8bcb399fa141e5c5cc21e57d30a09' +
    '1395c95c9e05580003661ec7479330bf1ef7a4c9d1816f089666a112e72d671048e5424fc528ca51530002' +
    '030200000000000516df0ba3e79792be7be5e50a370289accfc8c9e03200000000002625a074657374206d' +
    '656d6f00000000000000000000000000000000000000000000000000';

  expect(serializedTx.toString('hex')).toBe(tx);

  const bufferReader = new BufferReader(serializedTx);
  const deserializedTx = deserializeTransaction(bufferReader);

  expect(deserializedTx.auth.authType).toBe(authType);

  expect(deserializedTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedTx.auth.spendingCondition!.nonce.toString()).toBe(nonce.toString());
  expect(deserializedTx.auth.spendingCondition!.fee.toString()).toBe(fee.toString());
  expect(deserializedTx.auth.spendingCondition!.signer).toEqual(
    'a23ea89d6529ac48ac766f720e480beec7f19273'
  );
  const deserializedPayload = deserializedTx.payload as TokenTransferPayload;
  expect(deserializedPayload.amount.toString()).toBe(amount.toString());

  const serializedSignedTx = serializedTx;

  const signedTx =
    '00000000010401a23ea89d6529ac48ac766f720e480beec7f19273000000000000000000000000000000000' +
    '00000030200dc8061e63a8ed7ca4712c257299b4bdc3938e34ccc01ce979dd74e5483c4f971053a12680cbf' +
    'bea87976543a94500314c9a1eaf33986aef97821eb65fb0c604202018ff7d2d8cd4e43498912bfc2c30be1f' +
    'd58bef8d819e1371a0f5afa5e4b58ff6e498bd67b58c32bf670f0d8bcb399fa141e5c5cc21e57d30a091395' +
    'c95c9e05580003661ec7479330bf1ef7a4c9d1816f089666a112e72d671048e5424fc528ca5153000203020' +
    '0000000000516df0ba3e79792be7be5e50a370289accfc8c9e03200000000002625a074657374206d656d6f' +
    '00000000000000000000000000000000000000000000000000';

  expect(serializedSignedTx.toString('hex')).toBe(signedTx);
});

test('Should deserialize partially signed multi-Sig STX token transfer', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 0;
  const nonce = 0;
  const memo = 'test memo';

  const authType = AuthType.Standard;
  const addressHashMode = AddressHashMode.SerializeP2SH;

  const privKeyStrings = [
    '6d430bb91222408e7706c9001cfaeb91b08c2be6d5ac95779ab52c6b431950e001',
    '2a584d899fed1d24e26b524f202763c8ab30260167429f157f1c119f550fa6af01',
    'd5200dee706ee53ae98a03fba6cf4fdcc5084c30cfa9e1b3462dcdeaa3e0f1d201',
  ];
  const privKeys = privKeyStrings.map(createStacksPrivateKey);

  const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
  const pubKeyStrings = pubKeys.map(publicKeyToString);

  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    memo: memo,
    numSignatures: 2,
    publicKeys: pubKeyStrings,
    anchorMode: AnchorMode.Any,
  });

  const serializedTx = transaction.serialize();

  const tx =
    '00000000010401a23ea89d6529ac48ac766f720e480beec7f1927300000000000000000000000000000000' +
    '000000000002030200000000000516df0ba3e79792be7be5e50a370289accfc8c9e03200000000002625a0' +
    '74657374206d656d6f00000000000000000000000000000000000000000000000000';

  expect(serializedTx.toString('hex')).toBe(tx);

  const bufferReader = new BufferReader(serializedTx);

  // Partially signed or unsigned multi-sig tx can be serialized and deserialized without exception (Incorrect number of signatures)
  // Should be able to deserializeTransaction with missing signatures.
  expect(() => deserializeTransaction(bufferReader)).not.toThrowError();

  // Now add the required signatures in the original transactions
  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKeys[0]);
  signer.signOrigin(privKeys[1]);
  signer.appendOrigin(pubKeys[2]);

  const fullySignedTransaction = transaction.serialize();
  const bufferReaderSignedTx = new BufferReader(fullySignedTransaction);

  // Should deserialize fully signed multi sig transaction
  const deserializedTx = deserializeTransaction(bufferReaderSignedTx);

  expect(deserializedTx.auth.authType).toBe(authType);

  expect(deserializedTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedTx.auth.spendingCondition!.nonce.toString()).toBe(nonce.toString());
  expect(deserializedTx.auth.spendingCondition!.fee.toString()).toBe(fee.toString());
  expect(deserializedTx.auth.spendingCondition!.signer).toEqual(
    'a23ea89d6529ac48ac766f720e480beec7f19273'
  );
  const deserializedPayload = deserializedTx.payload as TokenTransferPayload;
  expect(deserializedPayload.amount.toString()).toBe(amount.toString());

  const signedTx =
    '00000000010401a23ea89d6529ac48ac766f720e480beec7f19273000000000000000000000000000000000' +
    '00000030200dc8061e63a8ed7ca4712c257299b4bdc3938e34ccc01ce979dd74e5483c4f971053a12680cbf' +
    'bea87976543a94500314c9a1eaf33986aef97821eb65fb0c604202018ff7d2d8cd4e43498912bfc2c30be1f' +
    'd58bef8d819e1371a0f5afa5e4b58ff6e498bd67b58c32bf670f0d8bcb399fa141e5c5cc21e57d30a091395' +
    'c95c9e05580003661ec7479330bf1ef7a4c9d1816f089666a112e72d671048e5424fc528ca5153000203020' +
    '0000000000516df0ba3e79792be7be5e50a370289accfc8c9e03200000000002625a074657374206d656d6f' +
    '00000000000000000000000000000000000000000000000000';

  expect(fullySignedTransaction.toString('hex')).toBe(signedTx);
});

test('Should throw error if multisig transaction is oversigned', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 0;
  const nonce = 0;
  const memo = 'test memo';

  const privKeyStrings = [
    '6d430bb91222408e7706c9001cfaeb91b08c2be6d5ac95779ab52c6b431950e001',
    '2a584d899fed1d24e26b524f202763c8ab30260167429f157f1c119f550fa6af01',
    'd5200dee706ee53ae98a03fba6cf4fdcc5084c30cfa9e1b3462dcdeaa3e0f1d201',
  ];
  const privKeys = privKeyStrings.map(createStacksPrivateKey);

  const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
  const pubKeyStrings = pubKeys.map(publicKeyToString);

  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    memo: memo,
    numSignatures: 2,
    publicKeys: pubKeyStrings,
    anchorMode: AnchorMode.Any,
  });

  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privKeys[0]);
  signer.signOrigin(privKeys[1]);
  expect(() => {
    signer.signOrigin(privKeys[2]);
  }).toThrow('Origin would have too many signatures');

  const fields = (transaction.auth.spendingCondition as MultiSigSpendingCondition).fields;
  fields.push({ ...fields[0] });
  expect(() => {
    new TransactionSigner(transaction);
  }).toThrow('SpendingCondition has more signatures than are expected');
});

test('Make Multi-Sig STX token transfer with two transaction signers', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 0;
  const nonce = 0;
  const memo = 'test memo';

  const authType = AuthType.Standard;
  const addressHashMode = AddressHashMode.SerializeP2SH;

  const privKeyStrings = [
    '6d430bb91222408e7706c9001cfaeb91b08c2be6d5ac95779ab52c6b431950e001',
    '2a584d899fed1d24e26b524f202763c8ab30260167429f157f1c119f550fa6af01',
    'd5200dee706ee53ae98a03fba6cf4fdcc5084c30cfa9e1b3462dcdeaa3e0f1d201',
  ];
  const privKeys = privKeyStrings.map(createStacksPrivateKey);

  const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
  const pubKeyStrings = pubKeys.map(publicKeyToString);

  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    memo: memo,
    numSignatures: 2,
    publicKeys: pubKeyStrings,
    anchorMode: AnchorMode.Any,
  });

  const serializedTxUnsigned = transaction.serialize();

  const tx =
    '00000000010401a23ea89d6529ac48ac766f720e480beec7f1927300000000000000000000000000000000' +
    '000000000002030200000000000516df0ba3e79792be7be5e50a370289accfc8c9e03200000000002625a0' +
    '74657374206d656d6f00000000000000000000000000000000000000000000000000';

  expect(serializedTxUnsigned.toString('hex')).toBe(tx);

  // obtain first auth field and sign once
  const signer = new TransactionSigner(transaction);

  const sig1 = nextSignature(signer.sigHash, authType, fee, nonce, privKeys[0]).nextSig;

  const compressed1 = privKeys[0].data.toString('hex').endsWith('01');
  const field1 = createTransactionAuthField(
    compressed1 ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed,
    sig1
  );
  signer.signOrigin(privKeys[0]);

  // serialize
  const partiallySignedSerialized = transaction.serialize();

  // deserialize
  const bufferReader2 = new BufferReader(partiallySignedSerialized);
  // Partially signed multi-sig tx can be serialized and deserialized without exception (Incorrect number of signatures)
  // Should be able to deserialize as number of signatures are less than signatures required
  expect(() => deserializeTransaction(bufferReader2)).not.toThrowError();

  // finish signing with new TransactionSigner
  const signer2 = new TransactionSigner(transaction);

  const sig2 = nextSignature(signer2.sigHash, authType, fee, nonce, privKeys[1]).nextSig;

  const compressed2 = privKeys[1].data.toString('hex').endsWith('01');
  const field2 = createTransactionAuthField(
    compressed2 ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed,
    sig2
  );

  const compressedPub = isCompressed(pubKeys[2]);
  const field3 = createTransactionAuthField(
    compressedPub ? PubKeyEncoding.Compressed : PubKeyEncoding.Uncompressed,
    pubKeys[2]
  );

  signer2.signOrigin(privKeys[1]);
  signer2.appendOrigin(pubKeys[2]);

  const serializedTx = transaction.serialize();

  const bufferReader = new BufferReader(serializedTx);
  const deserializedTx = deserializeTransaction(bufferReader);

  expect(deserializedTx.auth.authType).toBe(authType);

  expect(deserializedTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedTx.auth.spendingCondition!.nonce.toString()).toBe(nonce.toString());
  expect(deserializedTx.auth.spendingCondition!.fee.toString()).toBe(fee.toString());
  expect(deserializedTx.auth.spendingCondition!.signer).toEqual(
    'a23ea89d6529ac48ac766f720e480beec7f19273'
  );
  const deserializedPayload = deserializedTx.payload as TokenTransferPayload;
  expect(deserializedPayload.amount.toString()).toBe(amount.toString());

  const spendingCondition = deserializedTx.auth.spendingCondition as MultiSigSpendingCondition;
  expect(spendingCondition.fields[0]).toEqual(field1);
  expect(spendingCondition.fields[1]).toEqual(field2);
  expect(spendingCondition.fields[2]).toEqual(field3);

  const serializedSignedTx = deserializedTx.serialize();

  const signedTx =
    '00000000010401a23ea89d6529ac48ac766f720e480beec7f19273000000000000000000000000000000000' +
    '00000030200dc8061e63a8ed7ca4712c257299b4bdc3938e34ccc01ce979dd74e5483c4f971053a12680cbf' +
    'bea87976543a94500314c9a1eaf33986aef97821eb65fb0c604202018ff7d2d8cd4e43498912bfc2c30be1f' +
    'd58bef8d819e1371a0f5afa5e4b58ff6e498bd67b58c32bf670f0d8bcb399fa141e5c5cc21e57d30a091395' +
    'c95c9e05580003661ec7479330bf1ef7a4c9d1816f089666a112e72d671048e5424fc528ca5153000203020' +
    '0000000000516df0ba3e79792be7be5e50a370289accfc8c9e03200000000002625a074657374206d656d6f' +
    '00000000000000000000000000000000000000000000000000';

  expect(serializedSignedTx.toString('hex')).toBe(signedTx);
});

test('addSignature to an unsigned transaction', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 0;
  const nonce = 0;
  const publicKey = '021ae7f08f9eaecaaa93f7c6ceac29213bae09588c15e2aded32016b259cfd9a1f';

  const unsignedTx = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    publicKey,
    anchorMode: AnchorMode.Any,
  });

  const nullSignature = (unsignedTx.auth.spendingCondition as any).signature.data;

  expect(nullSignature).toEqual(
    '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
  );

  const sig =
    '00e4ee626905ee9d04b786e2942a69504dcc0f35ca79b86fb0aafcd47a81fc3bf1547e302c3acf5c89d935a53df334316e6fcdc203cf6bed91288ebf974385398c';
  const signedTx = setSignature(unsignedTx, sig);
  expect((signedTx.auth.spendingCondition as SingleSigSpendingCondition).signature.data).toEqual(
    sig
  );
  expect(unsignedTx).not.toBe(signedTx);
});

test('Make smart contract deploy', async () => {
  const contractName = 'kv-store';
  const codeBody = fs.readFileSync('./tests/contracts/kv-store.clar').toString();
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const fee = 0;
  const nonce = 0;

  const transaction = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey,
    fee,
    nonce,
    network: new StacksTestnet(),
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000000000000000000000' +
    '0000c9c499f85df311348f81520268e11acadb8be0df1bb8db85989f71e32db7192e2806a1179fce6bf775' +
    '932b28976c9e78c645d7acac8eefaf416a14f4fd14a49303020000000001086b762d73746f726500000156' +
    '28646566696e652d6d61702073746f72652028286b657920286275666620333229292920282876616c7565' +
    '202862756666203332292929290a0a28646566696e652d7075626c696320286765742d76616c756520286b' +
    '65792028627566662033322929290a20202020286d6174636820286d61702d6765743f2073746f72652028' +
    '286b6579206b65792929290a2020202020202020656e74727920286f6b20286765742076616c756520656e' +
    '74727929290a20202020202020202865727220302929290a0a28646566696e652d7075626c696320287365' +
    '742d76616c756520286b65792028627566662033322929202876616c75652028627566662033322929290a' +
    '2020202028626567696e0a2020202020202020286d61702d7365742073746f72652028286b6579206b6579' +
    '292920282876616c75652076616c75652929290a2020202020202020286f6b2027747275652929290a';

  expect(serialized).toBe(tx);
});

test('Make smart contract deploy with network string name', async () => {
  const transaction = await makeContractDeploy({
    contractName: 'kv-store',
    codeBody: fs.readFileSync('./tests/contracts/kv-store.clar').toString(),
    senderKey: 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801',
    fee: 0,
    nonce: 0,
    network: 'testnet',
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000000000000000000000' +
    '0000c9c499f85df311348f81520268e11acadb8be0df1bb8db85989f71e32db7192e2806a1179fce6bf775' +
    '932b28976c9e78c645d7acac8eefaf416a14f4fd14a49303020000000001086b762d73746f726500000156' +
    '28646566696e652d6d61702073746f72652028286b657920286275666620333229292920282876616c7565' +
    '202862756666203332292929290a0a28646566696e652d7075626c696320286765742d76616c756520286b' +
    '65792028627566662033322929290a20202020286d6174636820286d61702d6765743f2073746f72652028' +
    '286b6579206b65792929290a2020202020202020656e74727920286f6b20286765742076616c756520656e' +
    '74727929290a20202020202020202865727220302929290a0a28646566696e652d7075626c696320287365' +
    '742d76616c756520286b65792028627566662033322929202876616c75652028627566662033322929290a' +
    '2020202028626567696e0a2020202020202020286d61702d7365742073746f72652028286b6579206b6579' +
    '292920282876616c75652076616c75652929290a2020202020202020286f6b2027747275652929290a';

  expect(serialized).toBe(tx);
});

test('Make smart contract deploy unsigned', async () => {
  const contractName = 'kv-store';
  const codeBody = fs.readFileSync('./tests/contracts/kv-store.clar').toString();
  const publicKey = '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41';
  const fee = 0;
  const nonce = 0;

  const authType = AuthType.Standard;
  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const transaction = await makeUnsignedContractDeploy({
    contractName,
    codeBody,
    publicKey,
    fee,
    nonce,
    network: new StacksTestnet(),
    anchorMode: AnchorMode.Any,
  });

  const serializedTx = transaction.serialize();

  const bufferReader = new BufferReader(serializedTx);
  const deserializedTx = deserializeTransaction(bufferReader);

  expect(deserializedTx.auth.authType).toBe(authType);

  expect(deserializedTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());
});

test('Make smart contract deploy signed', async () => {
  const contractName = 'kv-store';
  const codeBody = fs.readFileSync('./tests/contracts/kv-store.clar').toString();
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const fee = 0;
  const nonce = 0;

  const authType = AuthType.Standard;
  const addressHashMode = AddressHashMode.SerializeP2PKH;
  const transaction = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey,
    fee,
    nonce,
    network: new StacksTestnet(),
    anchorMode: AnchorMode.Any,
  });

  const serializedTx = transaction.serialize();

  const bufferReader = new BufferReader(serializedTx);
  const deserializedTx = deserializeTransaction(bufferReader);
  expect(deserializedTx.auth.authType).toBe(authType);

  expect(deserializedTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());
});

test('Make contract-call', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = 0;

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce: 1,
    network: new StacksTestnet(),
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000b2c4262b8716891ee4a3361b31b3847cdb3d4897538f0f7716a3720686aee96f01be6610141c6afb36' +
    'f32c60575147b7e08191bae5cf9706c528adf46f28473e030200000000021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with network string', async () => {
  const transaction = await makeContractCall({
    contractAddress: 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE',
    contractName: 'kv-store',
    functionName: 'get-value',
    functionArgs: [bufferCV(Buffer.from('foo'))],
    senderKey: 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801',
    fee: 0,
    nonce: 1,
    network: 'testnet',
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000b2c4262b8716891ee4a3361b31b3847cdb3d4897538f0f7716a3720686aee96f01be6610141c6afb36' +
    'f32c60575147b7e08191bae5cf9706c528adf46f28473e030200000000021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with post conditions', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const postConditionAddress = 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH';
  const assetAddress = 'ST34RKEJKQES7MXQFBT29KSJZD73QK3YNT5N56C6X';
  const assetContractName = 'test-asset-contract';
  const assetName = 'test-asset-name';
  const info = createAssetInfo(assetAddress, assetContractName, assetName);
  const tokenAssetName = 'token-asset-name';

  const fee = 0;

  const postConditions = [
    makeStandardSTXPostCondition(postConditionAddress, FungibleConditionCode.GreaterEqual, 10),
    makeContractSTXPostCondition(
      contractAddress,
      contractName,
      FungibleConditionCode.GreaterEqual,
      12345
    ),
    makeStandardFungiblePostCondition(postConditionAddress, FungibleConditionCode.Less, 1000, info),
    makeContractFungiblePostCondition(
      postConditionAddress,
      contractName,
      FungibleConditionCode.Equal,
      1,
      info
    ),
    makeStandardNonFungiblePostCondition(
      postConditionAddress,
      NonFungibleConditionCode.Owns,
      info,
      bufferCVFromString(tokenAssetName)
    ),
    makeContractNonFungiblePostCondition(
      postConditionAddress,
      contractName,
      NonFungibleConditionCode.DoesNotOwn,
      info,
      bufferCVFromString(tokenAssetName)
    ),
  ];

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce: 1,
    network: new StacksTestnet(),
    postConditions,
    postConditionMode: PostConditionMode.Deny,
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c500342900000000000000010000000000000000' +
    '0000dcaf5f38038f787babf86644e0251945b93d9bffac610fb3b8c56da9eb2961de04ab66f64aa0b2e1cc' +
    '04172a2b002b8ff34e4b0c3ee430c00331c911325446c203020000000600021a5dd8ff3545259925b98252' +
    '4807686567eec2933f03000000000000000a00031ae6c05355e0c990ffad19a5e9bda394a9c5003429086b' +
    '762d73746f726503000000000000303901021a5dd8ff3545259925b982524807686567eec2933f1ac989ba' +
    '53bbb27a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f6e74726163740f746573742d' +
    '61737365742d6e616d650400000000000003e801031a5dd8ff3545259925b982524807686567eec2933f08' +
    '6b762d73746f72651ac989ba53bbb27a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f' +
    '6e74726163740f746573742d61737365742d6e616d6501000000000000000102021a5dd8ff3545259925b9' +
    '82524807686567eec2933f1ac989ba53bbb27a76ef5e8499e65f69c7798fd5d113746573742d6173736574' +
    '2d636f6e74726163740f746573742d61737365742d6e616d650200000010746f6b656e2d61737365742d6e' +
    '616d651102031a5dd8ff3545259925b982524807686567eec2933f086b762d73746f72651ac989ba53bbb2' +
    '7a76ef5e8499e65f69c7798fd5d113746573742d61737365742d636f6e74726163740f746573742d617373' +
    '65742d6e616d650200000010746f6b656e2d61737365742d6e616d6510021ae6c05355e0c990ffad19a5e9' +
    'bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('Make contract-call with post condition allow mode', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = 0;

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce: 1,
    network: new StacksTestnet(),
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize().toString('hex');

  const tx =
    '80800000000400e6c05355e0c990ffad19a5e9bda394a9c50034290000000000000001000000000000000' +
    '0000074ba5083c1b444e5d1eb7bc7add66a9a511f57fc4b2514f5b0e54892962d5b453ea0ec6e473bc695' +
    '22fd3fdd9104b7a354f830ad7ceabd0b3f2859d15697ad9b030100000000021ae6c05355e0c990ffad19a' +
    '5e9bda394a9c5003429086b762d73746f7265096765742d76616c7565000000010200000003666f6f';

  expect(serialized).toBe(tx);
});

test('addSignature to an unsigned contract call transaction', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const fee = 0;
  const publicKey = '021ae7f08f9eaecaaa93f7c6ceac29213bae09588c15e2aded32016b259cfd9a1f';

  const unsignedTx = await makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    publicKey,
    fee,
    nonce: 1,
    network: new StacksTestnet(),
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
  });

  const nullSignature = (unsignedTx.auth.spendingCondition as any).signature.data;

  expect(nullSignature).toEqual(
    '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
  );

  const sig =
    '00e4ee626905ee9d04b786e2942a69504dcc0f35ca79b86fb0aafcd47a81fc3bf1547e302c3acf5c89d935a53df334316e6fcdc203cf6bed91288ebf974385398c';
  const signedTx = setSignature(unsignedTx, sig);
  expect((signedTx.auth.spendingCondition as SingleSigSpendingCondition).signature.data).toEqual(
    sig
  );
  expect(unsignedTx).not.toBe(signedTx);
});

test('make a multi-sig contract call', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const fee = 0;
  const privKeyStrings = [
    '6d430bb91222408e7706c9001cfaeb91b08c2be6d5ac95779ab52c6b431950e001',
    '2a584d899fed1d24e26b524f202763c8ab30260167429f157f1c119f550fa6af01',
    'd5200dee706ee53ae98a03fba6cf4fdcc5084c30cfa9e1b3462dcdeaa3e0f1d201',
  ];
  // const privKeys = privKeyStrings.map(createStacksPrivateKey);

  const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
  const pubKeyStrings = pubKeys.map(publicKeyToString);

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    publicKeys: pubKeyStrings,
    numSignatures: 3,
    signerKeys: privKeyStrings,
    fee,
    nonce: 1,
    network: new StacksTestnet(),
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
  });

  expect(tx.auth.spendingCondition!.signer).toEqual('04128cacf0764f69b1e291f62d1dcdd8f65be5ab');
});

test('Estimate transaction transfer fee', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const publicKey = publicKeyToString(pubKeyfromPrivKey(senderKey));
  const memo = 'test memo';

  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    publicKey,
    amount,
    fee,
    nonce,
    memo,
    anchorMode: AnchorMode.Any,
  });

  const serialized = transaction.serialize();
  const transactionByteLength = serialized.byteLength;

  const mockedResponse = JSON.stringify({
    cost_scalar_change_by_byte: 0.00476837158203125,
    estimated_cost: {
      read_count: 19,
      read_length: 4814,
      runtime: 7175000,
      write_count: 2,
      write_length: 1020,
    },
    estimated_cost_scalar: 14,
    estimations: [
      {
        fee: 140,
        fee_rate: 10,
      },
      {
        fee: 17,
        fee_rate: 1.2410714285714286,
      },
      {
        fee: 125,
        fee_rate: 8.958333333333332,
      },
    ],
  });

  fetchMock.mockOnce(mockedResponse);

  const mainnet = new StacksMainnet();
  const resultEstimateFee = await estimateTransaction(
    transaction.payload,
    transactionByteLength,
    mainnet
  );

  fetchMock.mockOnce(mockedResponse);

  const testnet = new StacksTestnet();
  const resultEstimateFee2 = await estimateTransaction(
    transaction.payload,
    transactionByteLength,
    testnet
  );

  expect(fetchMock.mock.calls.length).toEqual(2);
  expect(fetchMock.mock.calls[0][0]).toEqual(mainnet.getTransactionFeeEstimateApiUrl());
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(
    JSON.stringify({
      transaction_payload: serializePayload(transaction.payload).toString('hex'),
      estimated_len: transactionByteLength,
    })
  );
  expect(fetchMock.mock.calls[1][0]).toEqual(testnet.getTransactionFeeEstimateApiUrl());
  expect(fetchMock.mock.calls[1][1]?.body).toEqual(
    JSON.stringify({
      transaction_payload: serializePayload(transaction.payload).toString('hex'),
      estimated_len: transactionByteLength,
    })
  );
  expect(resultEstimateFee.map(f => f.fee)).toEqual([140, 17, 125]);
  expect(resultEstimateFee2.map(f => f.fee)).toEqual([140, 17, 125]);
});

test('Single-sig transaction byte length must include signature', async () => {
  /*
   * *** Context ***
   * 1) Single-sig transaction byte length remain same due to empty message signature which allocates the space for signature
   * 2) estimateTransactionByteLength should correctly estimate the byte length of single-sig transaction
   */

  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 100;
  const nonce = 10;
  const memo = 'test memo...';

  const privateKey = 'a5c61c6ca7b3e7e55edee68566aeab22e4da26baa285c7bd10e8d2218aa3b229';
  const publicKey = '027d28f9951ce46538951e3697c62588a87f1f1f295de4a14fdd4c780fc52cfe69';

  // Create a unsigned single-sig transaction
  const unsignedTransaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    memo: memo,
    publicKey: publicKey,
    anchorMode: AnchorMode.Any,
  });

  // Due to empty message signature space will be allocated for signature
  expect(unsignedTransaction.serialize().byteLength).toEqual(
    estimateTransactionByteLength(unsignedTransaction)
  );

  const signer = new TransactionSigner(unsignedTransaction);
  // Now sign the transaction and verify the byteLength after adding signature
  signer.signOrigin(createStacksPrivateKey(privateKey));

  const finalSerializedTx = signer.transaction.serialize();

  // Byte length will remains the same after signing due to pre allocated space by empty message signature
  expect(finalSerializedTx.byteLength).toEqual(estimateTransactionByteLength(signer.transaction));
});

test('Multi-sig transaction byte length must include the required signatures', async () => {
  /*
   * *** Context ***
   * 1) Multi-sig transaction byte length increases by adding signatures
   *    which causes the incorrect fee estimation because the fee value is set while creating unsigned transaction
   * 2) estimateTransactionByteLength should correctly estimate the byte length of multi-sig transaction
   */

  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 2500000;
  const fee = 100;
  const nonce = 10;
  const memo = 'test memo...';

  const privKeyStrings = [
    '6d430bb91222408e7706c9001cfaeb91b08c2be6d5ac95779ab52c6b431950e001',
    '2a584d899fed1d24e26b524f202763c8ab30260167429f157f1c119f550fa6af01',
    'd5200dee706ee53ae98a03fba6cf4fdcc5084c30cfa9e1b3462dcdeaa3e0f1d201',
  ];
  const privKeys = privKeyStrings.map(createStacksPrivateKey);

  const pubKeys = privKeyStrings.map(pubKeyfromPrivKey);
  const pubKeyStrings = pubKeys.map(publicKeyToString);

  // Create a unsigned multi-sig transaction
  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient,
    amount,
    fee,
    nonce,
    memo: memo,
    numSignatures: 3,
    publicKeys: pubKeyStrings,
    anchorMode: AnchorMode.Any,
  });

  // Total length without signatures
  const unsignedByteLength = 120;

  const serializedTx = transaction.serialize();
  // Unsigned transaction byte length without signatures
  expect(serializedTx.byteLength).toEqual(unsignedByteLength);

  // Expected final byte length after adding the required signatures
  const expectedFinalLength = 318;

  // estimatedLen includes the space required for signatures in case of multi-sig transaction
  expect(estimateTransactionByteLength(transaction)).toEqual(expectedFinalLength);

  // Now add the required signatures one by one and test it against the value returned by estimateTransactionByteLength
  const signer = new TransactionSigner(transaction);

  signer.signOrigin(privKeys[0]);
  // Should calculate correct length if transaction is partially signed
  expect(estimateTransactionByteLength(signer.transaction)).toEqual(expectedFinalLength);

  signer.signOrigin(privKeys[1]);
  // Should calculate correct length if transaction is partially signed
  expect(estimateTransactionByteLength(signer.transaction)).toEqual(expectedFinalLength);

  signer.signOrigin(privKeys[2]);
  // Should calculate correct length if transaction is completely signed
  expect(estimateTransactionByteLength(signer.transaction)).toEqual(expectedFinalLength);

  const finalSerializedTx = signer.transaction.serialize();
  // Validate expectedFinalLength is correct
  expect(finalSerializedTx.byteLength).toEqual(expectedFinalLength);

  // Final byte length should match as estimated by estimateTransactionByteLength
  expect(finalSerializedTx.byteLength).toEqual(estimateTransactionByteLength(signer.transaction));
});

test('Make STX token transfer with fetch account nonce', async () => {
  const nonce = 123;
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const senderKey = 'cb3df38053d132895220b9ce471f6b676db5b9bf0b4adefb55f2118ece2478df01';
  const senderAddress = 'STB44HYPYAT2BB2QE513NSP81HTMYWBJP02HPGK6';
  const memo = 'test memo';
  const network = new StacksTestnet();
  const apiUrl = network.getAccountApiUrl(senderAddress);

  fetchMock.mockOnce(`{"balance":"0", "nonce":${nonce}}`);

  const fetchNonce = await getNonce(senderAddress, network);

  fetchMock.mockOnce(`{"balance":"0", "nonce":${nonce}}`);

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    memo,
    network,
    anchorMode: AnchorMode.Any,
  });

  expect(fetchMock.mock.calls.length).toEqual(2);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(fetchMock.mock.calls[1][0]).toEqual(apiUrl);
  expect(fetchNonce.toString()).toEqual(nonce.toString());
  expect(transaction.auth.spendingCondition?.nonce?.toString()).toEqual(nonce.toString());
});

test('Make sponsored STX token transfer', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 50;
  const nonce = 2;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const sponsorKey = '9888d734e6e80a943a6544159e31d6c7e342f695ec867d549c569fa0028892d401';
  const sponsorFee = 123;
  const sponsorNonce = 55;

  const authType = AuthType.Sponsored;
  const addressHashMode = AddressHashMode.SerializeP2PKH;

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo: memo,
    sponsored: true,
    anchorMode: AnchorMode.Any,
  });

  const preSponsorSerialized = transaction.serialize().toString('hex');
  const preSponsorTx =
    '0000000001050015c31b8c1c11c515e244b75806bac48d1399c77500000000000000020000000000000032' +
    '000012f0e0f7eec8657e814bdcde9352920dd9416dd757f1ada573ef268cc93001fd76db462508ffd90dec' +
    '57bd977c3b8517f7cbc7d31b3a80aee6068c35714f83e40029cfc6376255a78451eeb4b129ed8eacffa2fe' +
    'ef000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
    '00000000000000000000000000000000000000000000000000000000000000000000000000000000030200' +
    '000000000516df0ba3e79792be7be5e50a370289accfc8c9e032000000000000303974657374206d656d6f' +
    '00000000000000000000000000000000000000000000000000';

  expect(preSponsorSerialized).toBe(preSponsorTx);
  const sponsorOptions = {
    transaction,
    sponsorPrivateKey: sponsorKey,
    fee: sponsorFee,
    sponsorNonce,
  };

  const sponsorSignedTx = await sponsorTransaction(sponsorOptions);
  const sponsorSignedTxSerialized = sponsorSignedTx.serialize();

  const bufferReader = new BufferReader(sponsorSignedTxSerialized);
  const deserializedSponsorTx = deserializeTransaction(bufferReader);

  // Create same sponsored transaction in steps to verify the signature contents with sponsorTransaction call
  const payload = createTokenTransferPayload(recipient, amount, memo);
  const baseSpendingCondition = createSingleSigSpendingCondition(
    addressHashMode,
    publicKeyToString(pubKeyfromPrivKey(senderKey)),
    nonce,
    fee
  );
  const sponsorSpendingCondition = createSingleSigSpendingCondition(
    addressHashMode,
    publicKeyToString(pubKeyfromPrivKey(sponsorKey)),
    sponsorNonce,
    sponsorFee
  );
  const authorization = createSponsoredAuth(baseSpendingCondition, sponsorSpendingCondition);
  const transactionVersion = TransactionVersion.Mainnet;
  const sponsoredTransaction = new StacksTransaction(transactionVersion, authorization, payload);

  const signer = new TransactionSigner(sponsoredTransaction);
  signer.signOrigin(createStacksPrivateKey(senderKey));
  signer.signSponsor(createStacksPrivateKey(sponsorKey));

  // Sponsored spending condition
  const sponsoredTransactionClone = signer.transaction;
  const sponsoredSpendingConditionClone = (sponsoredTransactionClone.auth as SponsoredAuthorization)
    .sponsorSpendingCondition;
  const sponsoredSpendingCondition = sponsoredSpendingConditionClone as SingleSigSpendingCondition;

  // signer spending condition
  const signerSpendingConditionClone = (sponsoredTransactionClone.auth as StandardAuthorization)
    .spendingCondition;

  const signerSpendingCondition = signerSpendingConditionClone as SingleSigSpendingCondition;

  expect(deserializedSponsorTx.auth.authType).toBe(authType);

  expect(deserializedSponsorTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedSponsorTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());

  const deserializedSponsorSpendingCondition = (
    deserializedSponsorTx.auth as SponsoredAuthorization
  ).sponsorSpendingCondition!;
  expect(deserializedSponsorSpendingCondition.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorSpendingCondition.nonce!.toString()).toBe(sponsorNonce.toString());
  expect(deserializedSponsorSpendingCondition.fee!.toString()).toBe(sponsorFee.toString());

  const spendingCondition = deserializedSponsorSpendingCondition as SingleSigSpendingCondition;
  const emptySignature = emptyMessageSignature();
  expect(spendingCondition.signature.data.toString()).not.toBe(emptySignature.data.toString());

  // Verify sponsored signature contents
  expect(spendingCondition.signature.data.toString()).toBe(
    sponsoredSpendingCondition.signature.data.toString()
  );
  expect(spendingCondition.signature.type.toString()).toBe(
    sponsoredSpendingCondition.signature.type.toString()
  );

  const signerCreatedSpendingCondition = (sponsorSignedTx.auth as StandardAuthorization)
    .spendingCondition;

  const signersSpendingCondition = signerCreatedSpendingCondition as SingleSigSpendingCondition;
  // Verify signers signature contents
  expect(signersSpendingCondition.signature.data.toString()).toBe(
    signerSpendingCondition.signature.data.toString()
  );
  expect(signersSpendingCondition.signature.type.toString()).toBe(
    signerSpendingCondition.signature.type.toString()
  );

  const deserializedPayload = deserializedSponsorTx.payload as TokenTransferPayload;
  expect(deserializedPayload.amount.toString()).toBe(amount.toString());
});

test('Make sponsored STX token transfer with sponsor fee estimate', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 50;
  const nonce = 2;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';
  const network = new StacksMainnet();

  const sponsorKey = '9888d734e6e80a943a6544159e31d6c7e342f695ec867d549c569fa0028892d401';
  const sponsorNonce = 55;

  const authType = AuthType.Sponsored;
  const addressHashMode = AddressHashMode.SerializeP2PKH;

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo: memo,
    sponsored: true,
    anchorMode: AnchorMode.Any,
  });

  const sponsorOptions = {
    transaction,
    sponsorPrivateKey: sponsorKey,
    sponsorNonce,
  };

  const mockedResponse = JSON.stringify({
    cost_scalar_change_by_byte: 0.00476837158203125,
    estimated_cost: {
      read_count: 19,
      read_length: 4814,
      runtime: 7175000,
      write_count: 2,
      write_length: 1020,
    },
    estimated_cost_scalar: 14,
    estimations: [
      {
        fee: 140,
        fee_rate: 10,
      },
      {
        fee: 1,
        fee_rate: 1.2410714285714286,
      },
      {
        fee: 125,
        fee_rate: 8.958333333333332,
      },
    ],
  });

  fetchMock.mockOnce(mockedResponse);

  const sponsorSignedTx = await sponsorTransaction(sponsorOptions);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getTransactionFeeEstimateApiUrl());

  const sponsorSignedTxSerialized = sponsorSignedTx.serialize();

  const bufferReader = new BufferReader(sponsorSignedTxSerialized);
  const deserializedSponsorTx = deserializeTransaction(bufferReader);

  expect(deserializedSponsorTx.auth.authType).toBe(authType);

  expect(deserializedSponsorTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedSponsorTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());

  const deserializedSponsorSpendingCondition = (
    deserializedSponsorTx.auth as SponsoredAuthorization
  ).sponsorSpendingCondition!;
  expect(deserializedSponsorSpendingCondition.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorSpendingCondition.nonce!.toString()).toBe(sponsorNonce.toString());
  expect(deserializedSponsorSpendingCondition.fee!.toString()).toBe('1');

  const deserializedPayload = deserializedSponsorTx.payload as TokenTransferPayload;
  expect(deserializedPayload.amount.toString()).toBe(amount.toString());
});

test('Make sponsored STX token transfer with set tx fee', async () => {
  const recipient = 'ST2HQE346DED7F58Z54EJ26M2B9MQQ3JZ7RW6MXRJ';
  const amount = 113;
  const fee = 0;
  const nonce = 0;
  const senderKey = '8ca861519c4fa4a08de4beaa41688f60a24b575a976cf84099f38dc099a6d74401';
  // const senderAddress = 'ST2HTEQF50SW4X8077F8RSR8WCT57QG166TVG0GCE';
  const network = new StacksTestnet();

  const sponsorKey = '9888d734e6e80a943a6544159e31d6c7e342f695ec867d549c569fa0028892d401';
  // const sponsorAddress = 'ST2TPJ3NEZ63MMJ8AY9S45HZ10QSH51YF93GE89GQ';
  const sponsorNonce = 0;
  const sponsorFee = 500;

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    network,
    sponsored: true,
    anchorMode: AnchorMode.Any,
  });

  const sponsorOptions = {
    transaction,
    sponsorPrivateKey: sponsorKey,
    fee: sponsorFee,
    sponsorNonce,
  };

  const sponsorSignedTx = await sponsorTransaction(sponsorOptions);

  const sponsorSignedTxSerialized = sponsorSignedTx.serialize();

  const bufferReader = new BufferReader(sponsorSignedTxSerialized);
  const deserializedSponsorTx = deserializeTransaction(bufferReader);

  expect(fetchMock.mock.calls.length).toEqual(0);
  expect(deserializedSponsorTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedSponsorTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());

  const deserializedSponsorSpendingCondition = (
    deserializedSponsorTx.auth as SponsoredAuthorization
  ).sponsorSpendingCondition!;
  expect(deserializedSponsorSpendingCondition.nonce!.toString()).toBe(sponsorNonce.toString());
  expect(deserializedSponsorSpendingCondition.fee!.toString()).toBe(sponsorFee.toString());

  const deserializedPayload = deserializedSponsorTx.payload as TokenTransferPayload;
  expect(deserializedPayload.amount.toString()).toBe(amount.toString());
});

test('Make sponsored contract deploy with sponsor fee estimate', async () => {
  const contractName = 'kv-store';
  const codeBody = fs.readFileSync('./tests/contracts/kv-store.clar').toString();
  const senderKey = '8ca861519c4fa4a08de4beaa41688f60a24b575a976cf84099f38dc099a6d74401';
  const fee = 0;
  const nonce = 0;
  const network = new StacksTestnet();

  const sponsorKey = '9888d734e6e80a943a6544159e31d6c7e342f695ec867d549c569fa0028892d401';
  // const sponsorAddress = 'ST2TPJ3NEZ63MMJ8AY9S45HZ10QSH51YF93GE89GQ';
  const sponsorNonce = 56;
  const sponsorFee = 4000;

  const authType = AuthType.Sponsored;
  const addressHashMode = AddressHashMode.SerializeP2PKH;

  const transaction = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey,
    fee,
    nonce,
    network,
    sponsored: true,
    anchorMode: AnchorMode.Any,
  });

  const sponsorOptions = {
    transaction,
    sponsorPrivateKey: sponsorKey,
    fee: sponsorFee,
    sponsorNonce,
  };

  const sponsorSignedTx = await sponsorTransaction(sponsorOptions);

  expect(fetchMock.mock.calls.length).toEqual(0);

  const sponsorSignedTxSerialized = sponsorSignedTx.serialize();

  const bufferReader = new BufferReader(sponsorSignedTxSerialized);
  const deserializedSponsorTx = deserializeTransaction(bufferReader);

  expect(deserializedSponsorTx.auth.authType).toBe(authType);

  expect(deserializedSponsorTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedSponsorTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());

  const deserializedSponsorSpendingCondition = (
    deserializedSponsorTx.auth as SponsoredAuthorization
  ).sponsorSpendingCondition!;
  expect(deserializedSponsorSpendingCondition.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorSpendingCondition.nonce!.toString()).toBe(sponsorNonce.toString());
  expect(deserializedSponsorSpendingCondition.fee!.toString()).toBe(sponsorFee.toString());
});

test('Make sponsored contract call with sponsor nonce fetch', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';
  const nonce = 0;
  const network = new StacksTestnet();
  const fee = 0;
  const sponsorFee = 1000;

  const sponsorKey = '9888d734e6e80a943a6544159e31d6c7e342f695ec867d549c569fa0028892d401';
  const sponsorAddress = 'ST2TPJ3NEZ63MMJ8AY9S45HZ10QSH51YF93GE89GQ';
  const sponsorNonce = 55;

  const authType = AuthType.Sponsored;
  const addressHashMode = AddressHashMode.SerializeP2PKH;

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    senderKey,
    fee,
    nonce,
    network,
    sponsored: true,
    anchorMode: AnchorMode.Any,
  });

  const sponsorOptions = {
    transaction,
    sponsorPrivateKey: sponsorKey,
    fee: sponsorFee,
  };

  fetchMock.mockOnce(`{"balance":"100000", "nonce":${sponsorNonce}}`);

  const sponsorSignedTx = await sponsorTransaction(sponsorOptions);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getAccountApiUrl(sponsorAddress));

  const sponsorSignedTxSerialized = sponsorSignedTx.serialize();

  const bufferReader = new BufferReader(sponsorSignedTxSerialized);
  const deserializedSponsorTx = deserializeTransaction(bufferReader);

  expect(deserializedSponsorTx.auth.authType).toBe(authType);

  expect(deserializedSponsorTx.auth.spendingCondition!.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorTx.auth.spendingCondition!.nonce!.toString()).toBe(nonce.toString());
  expect(deserializedSponsorTx.auth.spendingCondition!.fee!.toString()).toBe(fee.toString());

  const deserializedSponsorSpendingCondition = (
    deserializedSponsorTx.auth as SponsoredAuthorization
  ).sponsorSpendingCondition!;
  expect(deserializedSponsorSpendingCondition.hashMode).toBe(addressHashMode);
  expect(deserializedSponsorSpendingCondition.nonce!.toString()).toBe(sponsorNonce.toString());
  expect(deserializedSponsorSpendingCondition.fee!.toString()).toBe(sponsorFee.toString());
});

test('Transaction broadcast success', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    anchorMode: AnchorMode.Any,
  });

  fetchMock.mockOnce('success');

  const response: TxBroadcastResult = await broadcastTransaction(transaction, network);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getBroadcastApiUrl());
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(transaction.serialize());
  expect(response as TxBroadcastResultOk).toEqual({ txid: 'success' });
});

test('Transaction broadcast success with string network name', async () => {
  const transaction = await makeSTXTokenTransfer({
    recipient: standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159'),
    amount: 12345,
    senderKey: 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01',
    network: 'mainnet',
    fee: 0,
    nonce: 0,
    memo: 'test memo',
    anchorMode: AnchorMode.Any,
  });

  fetchMock.mockOnce('success');

  const response: TxBroadcastResult = await broadcastTransaction(transaction, 'mainnet');

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(new StacksMainnet().getBroadcastApiUrl());
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(transaction.serialize());
  expect(response as TxBroadcastResultOk).toEqual({ txid: 'success' });
});

test('Transaction broadcast success with network detection', async () => {
  const transaction = await makeSTXTokenTransfer({
    recipient: standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159'),
    amount: 12345,
    senderKey: 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01',
    network: 'testnet',
    fee: 0,
    nonce: 0,
    memo: 'test memo',
    anchorMode: AnchorMode.Any,
  });

  fetchMock.mockOnce('success');

  const response: TxBroadcastResult = await broadcastTransaction(transaction);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(new StacksTestnet().getBroadcastApiUrl());
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(transaction.serialize());
  expect(response as TxBroadcastResultOk).toEqual({ txid: 'success' });
});

test('Transaction broadcast with attachment', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';
  const attachment = Buffer.from('this is an attachment...');

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    anchorMode: AnchorMode.Any,
  });

  fetchMock.mockOnce('success');

  const response: TxBroadcastResult = await broadcastTransaction(transaction, network, attachment);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getBroadcastApiUrl());
  expect(fetchMock.mock.calls[0][1]?.body).toEqual(
    JSON.stringify({
      tx: transaction.serialize().toString('hex'),
      attachment: attachment.toString('hex'),
    })
  );
  expect(response as TxBroadcastResultOk).toEqual({ txid: 'success' });
});

test('Transaction broadcast returns error', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    anchorMode: AnchorMode.Any,
  });

  const rejection = {
    error: 'transaction rejected',
    reason: 'BadNonce',
    reason_data: {
      actual: 3,
      expected: 0,
      is_origin: true,
      principal: 'ST2MVNFYF6H9DCMAV3HVNHTJVVE3CFWT1JYMH1EZB',
    },
    txid: '0x4068179cb9169b969c80518d83890f8b808a70ab998dd227149221be9480a616',
  };

  fetchMock.mockOnce(JSON.stringify(rejection), { status: 400 });

  const result = await broadcastTransaction(transaction, network);
  expect((result as TxBroadcastResultRejected).reason).toEqual(TxRejectedReason.BadNonce);
  expect((result as TxBroadcastResultRejected).reason_data).toEqual(rejection.reason_data);
});

test('Transaction broadcast fails', async () => {
  const recipient = standardPrincipalCV('SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159');
  const amount = 12345;
  const fee = 0;
  const nonce = 0;
  const senderKey = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc01';
  const memo = 'test memo';

  const network = new StacksMainnet();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    fee,
    nonce,
    memo,
    anchorMode: AnchorMode.Any,
  });

  fetchMock.mockOnce('test', { status: 400 });

  await expect(broadcastTransaction(transaction, network)).rejects.toThrow();
});

test('Make contract-call with network ABI validation', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = 0;

  const network = new StacksTestnet();

  const abi = fs.readFileSync('./tests/abi/kv-store-abi.json').toString();
  fetchMock.mockOnce(abi);

  await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    senderKey,
    functionArgs: [buffer],
    fee,
    nonce: 1,
    network: new StacksTestnet(),
    validateWithAbi: true,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
  });

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(network.getAbiApiUrl(contractAddress, contractName));
});

test('Make contract-call with provided ABI validation', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = 0;

  const abi: ClarityAbi = JSON.parse(fs.readFileSync('./tests/abi/kv-store-abi.json').toString());

  await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    senderKey,
    functionArgs: [buffer],
    fee,
    nonce: 1,
    validateWithAbi: abi,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
  });
});

test('Make contract-call with network ABI validation failure', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value';
  const buffer = bufferCV(Buffer.from('foo'));
  const senderKey = 'e494f188c2d35887531ba474c433b1e41fadd8eb824aca983447fd4bb8b277a801';

  const fee = 0;

  const network = new StacksTestnet();

  fetchMock.mockOnce('failed', { status: 404 });

  let error;
  try {
    await makeContractCall({
      contractAddress,
      contractName,
      functionName,
      senderKey,
      functionArgs: [buffer],
      fee,
      nonce: 1,
      network: 'testnet',
      validateWithAbi: true,
      postConditionMode: PostConditionMode.Allow,
      anchorMode: AnchorMode.Any,
    });
  } catch (e) {
    error = e;
  }

  const abiUrl = network.getAbiApiUrl(contractAddress, contractName);
  expect(error).toEqual(
    new Error(
      `Error fetching contract ABI for contract "kv-store" at address ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE. Response 404: Not Found. Attempted to fetch ${abiUrl} and failed with the message: "failed"`
    )
  );
});

test('Call read-only function', async () => {
  const contractAddress = 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE';
  const contractName = 'kv-store';
  const functionName = 'get-value?';
  const buffer = bufferCVFromString('foo');
  const network = new StacksTestnet();
  const senderAddress = 'ST2F4BK4GZH6YFBNHYDDGN4T1RKBA7DA1BJZPJEJJ';
  const mockResult = bufferCVFromString('test');

  const options = {
    contractAddress,
    contractName,
    functionName,
    functionArgs: [buffer],
    network,
    senderAddress,
  };

  const apiUrl = network.getReadOnlyFunctionCallApiUrl(contractAddress, contractName, functionName);
  fetchMock.mockOnce(`{"okay": true, "result": "0x${serializeCV(mockResult).toString('hex')}"}`);

  const result = await callReadOnlyFunction(options);

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(fetchMock.mock.calls[0][0]).toEqual(apiUrl);
  expect(result).toEqual(mockResult);
});

test('Call read-only function with network string', async () => {
  const mockResult = bufferCVFromString('test');
  fetchMock.mockOnce(`{"okay": true, "result": "0x${serializeCV(mockResult).toString('hex')}"}`);

  const result = await callReadOnlyFunction({
    contractAddress: 'ST3KC0MTNW34S1ZXD36JYKFD3JJMWA01M55DSJ4JE',
    contractName: 'kv-store',
    functionName: 'get-value?',
    functionArgs: [bufferCVFromString('foo')],
    network: 'testnet',
    senderAddress: 'ST2F4BK4GZH6YFBNHYDDGN4T1RKBA7DA1BJZPJEJJ',
  });

  expect(fetchMock.mock.calls.length).toEqual(1);
  expect(result).toEqual(mockResult);
});
