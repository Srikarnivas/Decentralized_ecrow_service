import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import { algos } from '@algorandfoundation/algokit-utils';
import { EscrowServiceClient } from '../contracts/clients/EscrowServiceClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: EscrowServiceClient;

describe('EscrowService', () => {
  beforeEach(fixture.beforeEach);

  let testAssetId: bigint;
  let boss: string;
  let worker: string;

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algorand } = fixture;
    const { testAccount: bossAccount, testAccount: workerAccount } = fixture.context;
    boss = bossAccount.addr;
    worker = workerAccount.addr;

    appClient = new EscrowServiceClient(
      {
        sender: bossAccount,
        resolveBy: 'id',
        id: 0,
      },
      algorand.client.algod
    );

    const assetCreate = await algorand.send.assetCreate({
      sender: boss,
      total: 10n,
    });

    testAssetId = BigInt(assetCreate.confirmation.assetIndex!);

    await appClient.create.createApplication({
      assetId: testAssetId,
      quantity: 3n,
      paymentAmount: 2.0,
      worker,
    });
  });

  test('optInToAsset', async () => {
    const { algorand } = fixture;
    const { appAddress } = await appClient.appClient.getAppReference();

    await expect(algorand.account.getAssetInformation(appAddress, testAssetId)).rejects.toBeDefined();

    const mbrTxn = await algorand.transactions.payment({
      sender: boss,
      receiver: appAddress,
      amount: algos(0.2), // Adjusted for Digital Marketplace standard
      extraFee: algos(0.001),
    });

    const result = await appClient.optInToAsset({ mbrTxn });

    expect(result.confirmation).toBeDefined();

    const { balance } = await algorand.account.getAssetInformation(appAddress, testAssetId);
    expect(balance).toBe(0n);
  });

  test('deposit', async () => {
    const { algorand } = fixture;
    const { appAddress } = await appClient.appClient.getAppReference();

    const result = await algorand.send.assetTransfer({
      assetId: testAssetId,
      sender: boss,
      receiver: appAddress,
      amount: 3n,
    });

    expect(result.confirmation).toBeDefined();

    const { balance } = await algorand.account.getAssetInformation(appAddress, testAssetId);
    expect(balance).toBe(3n);
  });

  test('setConditionMet', async () => {
    await appClient.setConditionMet({ workerAddress: worker });

    const { conditionMet } = await appClient.getGlobalState();
    expect(conditionMet).toBe(true);
  });

  test('releaseFunds', async () => {
    const { algorand } = fixture;
    const { appAddress } = await appClient.appClient.getAppReference();

    const paymentTxn = await algorand.transactions.payment({
      sender: boss,
      receiver: appAddress,
      amount: algos(2.0),
      extraFee: algos(0.001),
    });

    const result = await appClient.releaseFunds({ workerPaymentTxn: paymentTxn });

    expect(result.confirmation).toBeDefined();

    const { balance } = await algorand.account.getAssetInformation(worker, testAssetId);
    expect(balance).toBe(3n);
  });

  test('deleteEscrow', async () => {
    const { algorand } = fixture;
    const { amount: initialBalance } = await algorand.account.getInformation(boss);

    const result = await appClient.deleteEscrow({}, { sendParams: { fee: algos(0.003) } });

    expect(result.confirmation).toBeDefined();

    const { amount: finalBalance } = await algorand.account.getInformation(boss);
    expect(finalBalance - initialBalance).toEqual(algos(2.0));

    const { balance } = await algorand.account.getAssetInformation(boss, testAssetId);
    expect(balance).toBe(7n);
  });
});