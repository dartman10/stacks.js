import { sha256 } from '@noble/hashes/sha256';
import {
  getPublicKey as nobleGetPublicKey,
  signSync as nobleSecp256k1Sign,
  utils,
  verify as nobleSecp256k1Verify,
} from '@noble/secp256k1';
import {
  Buffer,
  bytesToHex,
  hexToBigInt,
  parseRecoverableSignatureVrs,
  signatureRsvToVrs,
  utf8ToBytes,
} from '@stacks/common';
import { ec as EC } from 'elliptic';
import {
  compressPublicKey,
  createStacksPrivateKey,
  getAddressFromPrivateKey,
  getAddressFromPublicKey,
  getPublicKey,
  makeRandomPrivKey,
  privateKeyToString,
  PubKeyEncoding,
  pubKeyfromPrivKey,
  publicKeyFromSignatureRsv,
  publicKeyFromSignatureVrs,
  publicKeyToString,
  signMessageHashRsv,
  signWithKey,
  StacksMessageType,
  StacksPublicKey,
  TransactionVersion,
} from '../src';
import { randomBytes } from '../src/utils';
import { serializeDeserialize } from './macros';

// Create and initialize EC context
// Better do it once and reuse it
const ec = new EC('secp256k1');

test('Stacks public key and private keys', () => {
  const privKeyString = 'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc';
  const pubKeyString =
    '04ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab' +
    '5b435d20ea91337cdd8c30dd7427bb098a5355e9c9bfad43797899b8137237cf';
  const pubKey = pubKeyfromPrivKey(privKeyString);
  expect(publicKeyToString(pubKey)).toBe(pubKeyString);

  const deserialized = serializeDeserialize(pubKey, StacksMessageType.PublicKey) as StacksPublicKey;
  expect(publicKeyToString(deserialized)).toBe(pubKeyString);

  const privKey = createStacksPrivateKey(privKeyString);
  expect(publicKeyToString(getPublicKey(privKey))).toBe(pubKeyString);

  const randomKey = makeRandomPrivKey();
  expect(privateKeyToString(randomKey).length).toEqual(64);

  expect(getAddressFromPrivateKey(privKeyString)).toBe('SPZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZEA9PX5');
  expect(getAddressFromPrivateKey(Buffer.from(privKeyString, 'hex'))).toBe(
    'SPZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZEA9PX5'
  );

  expect(getAddressFromPrivateKey(privKeyString, TransactionVersion.Testnet)).toBe(
    'STZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZG8ZXFM'
  );
  expect(
    getAddressFromPrivateKey(Buffer.from(privKeyString, 'hex'), TransactionVersion.Testnet)
  ).toBe('STZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZG8ZXFM');

  expect(getAddressFromPublicKey(pubKeyString)).toBe('SPZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZEA9PX5');
  expect(getAddressFromPublicKey(Buffer.from(pubKeyString, 'hex'))).toBe(
    'SPZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZEA9PX5'
  );

  expect(getAddressFromPublicKey(pubKeyString, TransactionVersion.Testnet)).toBe(
    'STZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZG8ZXFM'
  );
  expect(
    getAddressFromPublicKey(Buffer.from(pubKeyString, 'hex'), TransactionVersion.Testnet)
  ).toBe('STZG6BAY4JVR9RNAB1HY92B7Q208ZYY4HZG8ZXFM');

  const compressedPubKey = compressPublicKey(pubKey.data).data.toString('hex');
  expect(compressedPubKey).toBe(
    '03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab'
  );
});

test('signWithKey', () => {
  // $ clarinet console
  // > (secp256k1-verify
  //     0xa591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e
  //     0xf540e429fc6e8a4c27f2782479e739cae99aa21e8cb25d4436f333577bc791cd1d9672055dd1604dd5194b88076e4f859dd93c834785ed589ec38291698d414200
  //     0x0290255f88fa311f5dee9425ce33d7d516c24157e2aae8e25a6c631dd6f7322aef
  //   )
  // >> true

  const privateKey = createStacksPrivateKey(
    'bcf62fdd286f9b30b2c289cce3189dbf3b502dcd955b2dc4f67d18d77f3e73c7'
  );
  const expectedMessageHash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
  const expectedSignatureVrs =
    '00f540e429fc6e8a4c27f2782479e739cae99aa21e8cb25d4436f333577bc791cd1d9672055dd1604dd5194b88076e4f859dd93c834785ed589ec38291698d4142';

  const messageHash = Buffer.from(sha256('Hello World')).toString('hex');
  expect(messageHash).toBe(expectedMessageHash);

  const signature = signWithKey(privateKey, messageHash);
  expect(signature.data).toBe(expectedSignatureVrs);
});

test('signMessageHashRsv', () => {
  // $ clarinet console
  // > (secp256k1-verify
  //     0xa591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e
  //     0xf540e429fc6e8a4c27f2782479e739cae99aa21e8cb25d4436f333577bc791cd1d9672055dd1604dd5194b88076e4f859dd93c834785ed589ec38291698d414200
  //     0x0290255f88fa311f5dee9425ce33d7d516c24157e2aae8e25a6c631dd6f7322aef
  //   )
  // >> true

  const privateKey = createStacksPrivateKey(
    'bcf62fdd286f9b30b2c289cce3189dbf3b502dcd955b2dc4f67d18d77f3e73c7'
  );
  const expectedMessageHash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
  const expectedSignatureRsv =
    'f540e429fc6e8a4c27f2782479e739cae99aa21e8cb25d4436f333577bc791cd1d9672055dd1604dd5194b88076e4f859dd93c834785ed589ec38291698d414200';

  const messageHash = Buffer.from(sha256('Hello World')).toString('hex');
  expect(messageHash).toBe(expectedMessageHash);

  const signature = signMessageHashRsv({ privateKey, messageHash });
  expect(signature.data).toBe(expectedSignatureRsv);
});

test('noble sign message', () => {
  // example from https://paulmillr.com/noble/
  const privateKey = createStacksPrivateKey(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  );
  const expectedMessageHash = '011a775441ecb14943130a16f00cdd41818a83dd04372f3259e3ca7237e3cdaa';
  const expectedR = 114926983411733245831514739773229123958640458736536797227773647312126690926912n;
  const expectedS = 3148023981578716756961627923124903910422344826113324160219886779423594190576n;

  const messageHash = Buffer.from(sha256('greetings from noble')).toString('hex');
  expect(messageHash).toBe(expectedMessageHash);

  const signatureRsv = signMessageHashRsv({ privateKey, messageHash }).data;
  const signatureVrs = signatureRsvToVrs(signatureRsv);

  const { r: signatureR, s: signatureS } = parseRecoverableSignatureVrs(signatureVrs);
  expect(hexToBigInt(signatureR)).toBe(expectedR);
  expect(hexToBigInt(signatureS)).toBe(expectedS);
});

test('Retrieve public key from rsv signature', () => {
  const privKey = createStacksPrivateKey(
    'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc'
  );
  const uncompressedPubKey =
    '04ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab5b435d20ea91337cdd8c30dd7427bb098a5355e9c9bfad43797899b8137237cf';
  const compressedPubKey = '03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab';

  const message = 'hello world';
  const messageHex = bytesToHex(utf8ToBytes(message));
  const sig = signWithKey(privKey, messageHex);

  const uncompressedPubKeyFromSig = publicKeyFromSignatureVrs(
    messageHex,
    sig,
    PubKeyEncoding.Uncompressed
  );
  const compressedPubKeyFromSig = publicKeyFromSignatureVrs(
    messageHex,
    sig,
    PubKeyEncoding.Compressed
  );

  expect(uncompressedPubKeyFromSig).toBe(uncompressedPubKey);
  expect(compressedPubKeyFromSig).toBe(compressedPubKey);
});

test('Retrieve public key from vrs signature', () => {
  const privateKey = createStacksPrivateKey(
    'edf9aee84d9b7abc145504dde6726c64f369d37ee34ded868fabd876c26570bc'
  );
  const uncompressedPubKey =
    '04ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab5b435d20ea91337cdd8c30dd7427bb098a5355e9c9bfad43797899b8137237cf';
  const compressedPubKey = '03ef788b3830c00abe8f64f62dc32fc863bc0b2cafeb073b6c8e1c7657d9c2c3ab';

  const messageHex = bytesToHex(utf8ToBytes('hello world'));
  const sig = signMessageHashRsv({ privateKey, messageHash: messageHex });

  const uncompressedPubKeyFromSig = publicKeyFromSignatureRsv(
    messageHex,
    sig,
    PubKeyEncoding.Uncompressed
  );
  const compressedPubKeyFromSig = publicKeyFromSignatureRsv(
    messageHex,
    sig,
    PubKeyEncoding.Compressed
  );

  expect(uncompressedPubKeyFromSig).toBe(uncompressedPubKey);
  expect(compressedPubKeyFromSig).toBe(compressedPubKey);
});

test('Sign msg using elliptic/secp256k1 and verify signature using @noble/secp256k1', () => {
  // Maximum keypairs to try if a keypairs is not accepted by @noble/secp256k1
  const keyPairAttempts = 8; // Normally a keypairs is accepted in first or second attempt

  let nobleVerifyResult = false;

  for (let i = 0; i < keyPairAttempts && !nobleVerifyResult; i++) {
    // Generate keys
    const options = { entropy: randomBytes(32) };
    const keyPair = ec.genKeyPair(options);

    const msg = 'hello world';
    const msgHex = bytesToHex(utf8ToBytes(msg));

    // Sign msg using elliptic/secp256k1
    // input must be an array, or a hex-string
    const signature = keyPair.sign(msgHex);

    // Export DER encoded signature in hex format
    const signatureHex = signature.toDER('hex');

    // Verify signature using elliptic/secp256k1
    const ellipticVerifyResult = keyPair.verify(msgHex, signatureHex);

    expect(ellipticVerifyResult).toBeTruthy();

    // Get public key from key-pair
    const publicKey = keyPair.getPublic().encodeCompressed('hex');

    // Verify same signature using @noble/secp256k1
    nobleVerifyResult = nobleSecp256k1Verify(signatureHex, msgHex, publicKey);
  }
  // Verification result by @noble/secp256k1 should be true
  expect(nobleVerifyResult).toBeTruthy();
});

test('Sign msg using @noble/secp256k1 and verify signature using elliptic/secp256k1', () => {
  // Generate private key
  const privateKey = utils.randomPrivateKey();

  const msg = 'hello world';
  const msgHex = bytesToHex(utf8ToBytes(msg));

  // Sign msg using @noble/secp256k1
  // input must be a hex-string
  const signature = nobleSecp256k1Sign(msgHex, privateKey);

  const publicKey = nobleGetPublicKey(privateKey);

  // Verify signature using @noble/secp256k1
  const nobleVerifyResult = nobleSecp256k1Verify(signature, msgHex, publicKey);

  // Verification result by @noble/secp256k1
  expect(nobleVerifyResult).toBeTruthy();

  // Generate keypair using private key
  const keyPair = ec.keyFromPrivate(privateKey);

  // Verify signature using elliptic/secp256k1
  const ellipticVerifyResult = keyPair.verify(msgHex, signature);

  // Verification result by elliptic/secp256k1 should be true
  expect(ellipticVerifyResult).toBeTruthy();
});
