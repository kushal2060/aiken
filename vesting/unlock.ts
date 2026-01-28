import {
  deserializeAddress,
  deserializeDatum,
  unixTimeToEnclosingSlot,
  SLOT_CONFIG_NETWORK,
} from "@meshsdk/core";

import {
    getTxBuilder,
    beneficairy_wallet,
    scriptAddr,
    scriptCbor,
    blockchainProvider,
    owner_wallet
} from "./common.js";
import CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";

async function withdrawFundTx(vestingUtxo: any){
    const utxos = await beneficairy_wallet.getUtxos();
    const beneficairyAddress = (await beneficairy_wallet.getUnusedAddresses())[0];
    const collatreal = await beneficairy_wallet.getCollateral();
    if (!collatreal || collatreal.length === 0) {
      throw new Error("No collateral UTxO found. Fund the beneficiary wallet with a pure ADA UTxO and try again.");
    }
    const collatrealInput = collatreal[0].input;
    const collatrealOutput = collatreal[0].output;

    const {pubKeyHash: beneficiaryPubKeyHash} = deserializeAddress((await beneficairy_wallet.getUnusedAddresses())[0]);
    const datum = deserializeDatum(vestingUtxo.output.plutusData);

    // console.log("beneficiaryPubKeyHash:", beneficiaryPubKeyHash);
    // console.log("datum fields (raw):", datum.fields);
    // console.log("datum.owner hex:", Buffer.from(datum.fields[1].bytes).toString("hex"));
    // console.log("datum.beneficiary hex:", Buffer.from(datum.fields[2].bytes).toString("hex"));

    const datumTime = Number(datum.fields[0].int);
    console.log("datumTime(ms):", datumTime);
    const invalidBefore =
      unixTimeToEnclosingSlot(
        Math.min(datumTime, Date.now() - 1900),
        SLOT_CONFIG_NETWORK.preview
      ) + 1;
    console.log("invalidBefore(slot):", invalidBefore);
    const txBuilder = getTxBuilder();
    await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
            vestingUtxo.input.txHash,
            vestingUtxo.input.outputIndex,
            vestingUtxo.output.amount,
            scriptAddr
        )   
        .spendingReferenceTxInInlineDatumPresent()
        .spendingReferenceTxInRedeemerValue("")
        .txInScript(scriptCbor)
        .txOut(beneficairyAddress!, vestingUtxo.output.amount)
        .txInCollateral(
            collatrealInput.txHash,
            collatrealInput.outputIndex,
            collatrealOutput.amount,
            collatrealOutput.address
        ) 
        .invalidBefore(invalidBefore)
        .requiredSignerHash(beneficiaryPubKeyHash)
        .changeAddress(beneficairyAddress!)
        .selectUtxosFrom(utxos)
        .complete();
    return txBuilder.txHex;    
}

async function main() {
    const txHashFromDeposit = 
    "54b034ee631f39de8c009822b616b74b705d0c8e2e7ebf905b984e7740e79f4b";
    const utxo = await getUtxoByTxHash(txHashFromDeposit);
    const utxos = await beneficairy_wallet.getUtxos();
    console.log("Utxos:",utxos);

    // console.log("Utoxs foud",utxo)
    if (utxo === undefined)throw new Error("UTxo not found");
    
    const unsignedTx= await withdrawFundTx(utxo);
    const signedTx= await beneficairy_wallet.signTx(unsignedTx,true);
    const txHash = await beneficairy_wallet.submitTx(signedTx);
    console.log("txHash", txHash);
    console.log("signed len:", signedTx.length);
    try {
      const tx = CardanoWasm.Transaction.from_bytes(Buffer.from(signedTx, "hex"));
      const vkeys = tx.witness_set().vkeys();
      console.log("vkey witnesses count:", vkeys ? vkeys.len() : 0);
    } catch (e) { console.error("decode signed tx failed:", e); }
}

async function getUtxoByTxHash(txHash:string){
    const utxos = await blockchainProvider.fetchUTxOs(txHash);
    if (utxos.length === 0){
        throw new Error("Utxo not found");
    }
    return utxos[0];
}

main();
