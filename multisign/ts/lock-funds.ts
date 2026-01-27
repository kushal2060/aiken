import { Asset, mConStr0 } from "@meshsdk/core";
import { getScript,getTxBuilder,wallet1,getOwnerHashes } from "./common";

async function main (){
    const assest: Asset[]=[
        {
            unit: "lovelace",
            quantity: "10000000" //10ada
        }
    ];

    const utxos = await wallet1.getUtxos();
    const walletAddress = (await wallet1.getUnusedAddresses())[0];
    const {scriptAddr} = getScript();
    const {pkh1,pkh2,pkh3} = await getOwnerHashes();

    console.log(`Script Address: ${scriptAddr}`);
    console.log(`Owner 1 PKH: ${pkh1}`);
    console.log(`Owner 2 PKH: ${pkh2}`);
    console.log(`Owner 3 PKH: ${pkh3}`);

    // Create datum: { owners: [pkh1, pkh2, pkh3], threshold: 2 }
    const datum = mConStr0([
        [pkh1, pkh2, pkh3], // List of owner verification key hashes
        2, // Threshold
    ]);

    const txBuilder=getTxBuilder();
    
    await txBuilder.txOut(scriptAddr,assest).txOutInlineDatumValue(datum)
            .changeAddress(walletAddress)
            .selectUtxosFrom(utxos)
            .complete();

    const unsignedTx = txBuilder.txHex;
    const signedTx = await wallet1.signTx(unsignedTx);
    const txHash = await wallet1.submitTx(signedTx);

    console.log(`10 ADA locked into multisig contract at Tx ID: ${txHash}`);
    console.log(`\nSave this for unlock: ${txHash}#0`);      

}

main();