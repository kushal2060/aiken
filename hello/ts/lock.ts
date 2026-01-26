import { Asset, deserializeAddress, mConStr0 } from "@meshsdk/core";
import { getScript,getTxBuilder,wallet } from "./common";

async function main() {
    //assest we want to lock
    const assests: Asset[] = [
        {
            unit: "lovelace",
            quantity: "1000000",
        },
    ];

    const utxos = await wallet.getUtxos();
    const walletAddress = (await wallet.getUnusedAddresses())[0];

    const {scriptAddr} = getScript();

    const signerHash = deserializeAddress(walletAddress).pubKeyHash;

    // console.log(`Script Address: ${scriptAddr}`);
    // console.log(`Wallet Address: ${walletAddress}`);
    // console.log(`Signer PubKey Hash: ${signerHash}`);
    // console.log(`Utxos: ${JSON.stringify(utxos)}`);
    const txBuilder = getTxBuilder();
    await txBuilder
        .txOut(scriptAddr, assests)
        .txOutDatumHashValue(mConStr0([signerHash]))
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .complete();
    
    const unsignedTx= txBuilder.txHex;

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    console.log(`1 tADA locked into the contract at Tx ID: ${txHash}`);

}

main();