import { Asset, mConStr0, deserializeAddress } from "@meshsdk/core";
import { getTxBuilder, owner_wallet, beneficairy_wallet, scriptAddr } from "./common.js"

async function depositFundTx(amount: Asset[], lockUntilTimeStampMs: number): Promise<string> {
  const utxos = await owner_wallet.getUtxos();

  const { pubKeyHash: ownerPubKeyHash } = deserializeAddress((await owner_wallet.getUnusedAddresses())[0]);
  const { pubKeyHash: beneficiaryPubKeyHash } = deserializeAddress((await beneficairy_wallet.getUnusedAddresses())[0]);
  const walletAddress = (await owner_wallet.getUnusedAddresses())[0];
  const txBuilder = getTxBuilder();
  await txBuilder
    .txOut(scriptAddr, amount)
    .txOutInlineDatumValue(mConStr0([lockUntilTimeStampMs, ownerPubKeyHash, beneficiaryPubKeyHash]))
    .changeAddress(walletAddress)
    .selectUtxosFrom(utxos)
    .complete();

  return txBuilder.txHex;
}

async function main() {
  const assets: Asset[] = [
    {
      unit: "lovelace",
      quantity: "10000000",
    },
  ];

  const lockUntilTimeStamp = new Date();
  lockUntilTimeStamp.setMinutes(lockUntilTimeStamp.getMinutes() + 10);

  const unsignedTx = await depositFundTx(assets, lockUntilTimeStamp.getTime());
  const signedTx = await owner_wallet.signTx(unsignedTx);
  const txHash = await owner_wallet.submitTx(signedTx);

  console.log("txHash", txHash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});