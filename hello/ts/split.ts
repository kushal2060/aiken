import { getTxBuilder, wallet } from "./common";

async function main(){
  const utxos = await wallet.getUtxos();
  const addr = (await wallet.getUnusedAddresses())[0];

  const txb = getTxBuilder();
  await txb
    .txOut(addr, [{ unit: "lovelace", quantity: "1000000" }])
    .changeAddress(addr)
    .selectUtxosFrom(utxos)
    .complete();

  const signed = await wallet.signTx(txb.txHex);
  const hash = await wallet.submitTx(signed);
  console.log("split tx:", hash);
}
main();