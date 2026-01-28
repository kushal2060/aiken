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

} from "./common.mjs";


async function withdrawFundTx(vestingUtxo){
    const utxos = await beneficairy_wallet.getUtxos();
    const beneficairyAddress = beneficairy_wallet.addresses.baseAddressBech32;
    const collatreal = await beneficairy_wallet.getCollateral();
    const collatrealInput = collatreal[0].input;
    const collatrealOutput = collatreal[0].output;

    const {pubKeyHash: beneficiaryPubKeyHash} = deserializeAddress(
        beneficairy_wallet.addresses.baseAddressBech32
    );
    const datum = deserializeDatum(vestingUtxo.output.plutusData);

    const invalidBefore = 
        unixTimeToEnclosingSlot(
            Math.min(datum.fields[0].int, Date.now()-1900),
            SLOT_CONFIG_NETWORK.preview
        ) +1;
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
        .txOut(beneficairyAddress, vestingUtxo.output.amount)
        .txInCollateral(
            collatrealInput.txHash,
            collatrealInput.outputIndex,
            collatrealOutput.amount,
            collatrealOutput.address
        ) 
        .invalidBefore(invalidBefore)
        .requiredSignerHash(beneficiaryPubKeyHash)
        .changeAddress(beneficairyAddress)
        .selectUtxosFrom(utxos)
        .complete();
    return txBuilder.txHex;    
}

async function main() {
    const txHashFromDeposit = 
    "";
    const utxo = await getUtxoByTxHash(txHashFromDeposit);
    if (utxo === undefined)throw new Error("UTxo not found");
    
    const unsignedTx= await withdrawFundTx(utxo);
    const signedTx= await beneficairy_wallet.signTx(unsignedTx);
    const txHash = await beneficairy_wallet.submitTx(signedTx);
    console.log("txHash", txHash);
}

async function getUtxoByTxHash(txHash){
    const utxos = await blockchainProvider.fetchUTxOs(txHash);
    if (utxos.length === 0){
        throw new Error("Utxo not found");
    }
    return utxos[0];
}

main();
