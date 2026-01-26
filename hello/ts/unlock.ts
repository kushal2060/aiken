import {
  deserializeAddress,
  mConStr0,
  stringToHex,
} from "@meshsdk/core";
import {getScript,getTxBuilder,getUtxoByHash,wallet} from "./common";


async function main() {
    
    const utxos = await wallet.getUtxos();
    const walletAddress = (await wallet.getUnusedAddresses())[0];
    const collateral = (await wallet.getCollateral())[0];

    const { scriptCbor } =getScript();

    const signerHash = deserializeAddress(walletAddress).pubKeyHash;

    const message = "Hello world!";

    const txHashFromDeposit= process.argv[2];
    const scriptUtxo = await getUtxoByHash(txHashFromDeposit);

    

    const txBuilder = getTxBuilder();
    await txBuilder
        .spendingPlutusScript("V3")
        .txIn(
            scriptUtxo.input.txHash,
            scriptUtxo.input.outputIndex,
            scriptUtxo.output.amount,
            scriptUtxo.output.address,
        )
        .txInScript(scriptCbor)
        .txInRedeemerValue(mConStr0([stringToHex(message)]))
        .txInDatumValue(mConStr0([signerHash]))
        .requiredSignerHash(signerHash)
        .changeAddress(walletAddress)
        .txInCollateral(
            collateral.input.txHash,
            collateral.input.outputIndex,
            collateral.output.amount,
            collateral.output.address,
        )
        .selectUtxosFrom(utxos)
        .complete();
    
    const unsignedTx = txBuilder.txHex;

    const signedTx= await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    console.log(`1 tADA unlocked from the contract at Tx ID: ${txHash}`);
}
main();