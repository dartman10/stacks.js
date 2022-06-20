import './setup';
import {
  IdentityNameValidityError,
  validateSubdomainFormat,
  validateSubdomainAvailability,
  validateSubdomain,
  recursiveRestoreIdentities,
} from '../src/utils';
import { Subdomains, registrars, Wallet, decrypt } from '../src';
import { mnemonicToSeed } from 'bip39';
import { bip32 } from 'bitcoinjs-lib';
import { profileResponse, nameInfoResponse } from './helpers';
import { ChainID } from '@stacks/transactions';

describe(validateSubdomainFormat.name, () => {
  it('returns error state when string less than 8 characters', () => {
    const result = validateSubdomainFormat('john');
    expect(result).toEqual(IdentityNameValidityError.MINIMUM_LENGTH);
  });

  it('returns error state when string has more than 38 characters', () => {
    const result = validateSubdomainFormat('pneumonoultramicroscopicsilicovolcanoconiosis');
    expect(result).toEqual(IdentityNameValidityError.MAXIMUM_LENGTH);
  });

  it('returns error state when using uppercase chars', () => {
    const result = validateSubdomainFormat('COOLNAMEBRO');
    expect(result).toEqual(IdentityNameValidityError.ILLEGAL_CHARACTER);
  });

  it('returns error state when using non-underscore symbols', () => {
    const result = validateSubdomainFormat('kyranj@mie');
    expect(result).toEqual(IdentityNameValidityError.ILLEGAL_CHARACTER);
  });

  it('returns error state when uppercase', () => {
    const result = validateSubdomainFormat('COOLNAMEBRO');
    expect(result).toEqual(IdentityNameValidityError.ILLEGAL_CHARACTER);
  });

  it('returns error state when using sneaky homoglyphs', () => {
    const legitIdentity = 'kyranjamie';
    const homoglyph = 'kyrаnjamie';
    // eslint-disable-next-line
    // @ts-ignore
    expect(legitIdentity === homoglyph).toEqual(false);
    const shouldPassResult = validateSubdomainFormat(legitIdentity);
    expect(shouldPassResult).toBeNull();

    const shouldFailResult = validateSubdomainFormat(homoglyph);
    expect(shouldFailResult).toEqual(IdentityNameValidityError.ILLEGAL_CHARACTER);
  });

  it('allows a selection of legit names', () => {
    const names = [
      'kyranjamie',
      'jasperjansz101',
      'auln3auuuu',
      'honeypot1337',
      'marina_p',
      '42214218',
      'emotion_trouble_solution_juice',
      '________',
    ];
    names.forEach(name => expect(validateSubdomainFormat(name)).toBeNull());
  });
});

describe(validateSubdomainAvailability.name, () => {
  it('fetches the status of a username', async () => {
    fetchMock.once(JSON.stringify({ success: true }));
    const response = await validateSubdomainAvailability('slkdjfskldjf', Subdomains.BLOCKSTACK);
    expect(response).toEqual({ success: true });
  });

  test('uses the correct registrar URL', async () => {
    fetchMock.once(JSON.stringify({ success: true }));
    const response = await validateSubdomainAvailability('slkdjfskldjf', Subdomains.TEST);
    expect(response).toEqual({ success: true });
    // @ts-ignore
    const url: string = fetchMock.mock.calls[0][0];
    expect(url.includes(registrars[Subdomains.TEST].apiUrl)).toBeTruthy();
  });
});

describe(validateSubdomain.name, () => {
  test('returns unavailable if status is unavailable', async () => {
    fetchMock.once(JSON.stringify({ status: 'unavailable' }));
    const error = await validateSubdomain('asdfasdf');
    expect(error).toEqual(IdentityNameValidityError.UNAVAILABLE);
  });
});

test('recursively makes identities', async () => {
  const wallet = await Wallet.generate('password', ChainID.Testnet);
  const plainTextBuffer = await decrypt(
    Buffer.from(wallet.encryptedBackupPhrase, 'hex'),
    'password'
  );
  const seed = await mnemonicToSeed(plainTextBuffer);
  const rootNode = bip32.fromSeed(seed);

  fetchMock
    .once(JSON.stringify({ names: ['myname.id'] }))
    .once(JSON.stringify(nameInfoResponse))
    .once(JSON.stringify(profileResponse))
    .once(JSON.stringify({ names: ['myname2.id'] }))
    .once(JSON.stringify(nameInfoResponse))
    .once(JSON.stringify(profileResponse))
    .once(JSON.stringify({ names: ['myname3.id'] }))
    .once(JSON.stringify(nameInfoResponse))
    .once(JSON.stringify(profileResponse))
    .once(JSON.stringify({ names: [] }))
    .once('', { status: 404 })
    .once(JSON.stringify(profileResponse));
  const identities = await recursiveRestoreIdentities({ rootNode });
  expect(identities[0].defaultUsername).toEqual('myname.id');
  expect(identities[1].defaultUsername).toEqual('myname2.id');
  expect(identities[2].defaultUsername).toEqual('myname3.id');
  expect(identities.length).toEqual(3);
});
