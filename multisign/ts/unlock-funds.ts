import {
  deserializeAddress,
  mConStr0,
} from "@meshsdk/core";
import {
  getScript,
  getTxBuilder,
  wallet1,
  wallet2,
  blockchainProvider,
} from "./common";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  const { scriptAddr, scriptCbor } = getScript();

  // Fetch new utxos at script address
  const utxos = await blockchainProvider.fetchAddressUTxOs(scriptAddr);
  if (utxos.length === 0) {
    throw new Error("No UTxOs found at script");
  }

  console.log(`Found ${utxos.length} UTxO(s) at script address`);
  
  // First unspent UTxO
  const scriptUtxo = utxos[0];
  
  console.log(`Using UTxO: ${scriptUtxo.input.txHash}#${scriptUtxo.input.outputIndex}`);
  console.log(`Amount: ${scriptUtxo.output.amount.find(a => a.unit === 'lovelace')?.quantity} lovelace`);

  // Recipient address
  console.log("Enter recipient address:");
  const recipient_address = await ask("");
  console.log("Recipient:", recipient_address);
  rl.close();


  const wallet1Utxos = await wallet1.getUtxos();
  const collateral = wallet1Utxos.find(u => {
    const lovelace = parseInt(u.output.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
    return lovelace >= 5_000_000; 
  });

  if (!collateral) {
    throw new Error("No suitable collateral found. Need at least 5 ADA in wallet1");
  }

  console.log(`Using collateral: ${collateral.input.txHash}#${collateral.input.outputIndex}`);

  // Signer addresses
  const signer1Address = (await wallet1.getUnusedAddresses())[0];
  const signer2Address = (await wallet2.getUnusedAddresses())[0];

  const signer1Hash = deserializeAddress(signer1Address).pubKeyHash;
  const signer2Hash = deserializeAddress(signer2Address).pubKeyHash;

  console.log(`Signer 1 PKH: ${signer1Hash}`);
  console.log(`Signer 2 PKH: ${signer2Hash}`);

  const redeemer = mConStr0([]);

  const txBuilder = getTxBuilder();

  try {
    await txBuilder
      .spendingPlutusScript("V3")
      .txIn(
        scriptUtxo.input.txHash,
        scriptUtxo.input.outputIndex,
        scriptUtxo.output.amount,
        scriptAddr
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(scriptCbor)
      .txOut(recipient_address, scriptUtxo.output.amount)
      .requiredSignerHash(signer1Hash)
      .requiredSignerHash(signer2Hash)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address
      )
      .changeAddress(signer1Address)
      .selectUtxosFrom([collateral])
      .complete();

    const unsignedTx = txBuilder.txHex;

    // Sign with wallets
    console.log("\nSigning with wallet 1...");
    const signed1 = await wallet1.signTx(unsignedTx, true);
    
    console.log("Signing with wallet 2...");
    const signed2 = await wallet2.signTx(signed1, true);

    console.log("Submitting transaction...");
    const submitTxhash = await wallet1.submitTx(signed2);

    console.log("\n Success unlocking funds!");
    console.log(`Transaction hash: ${submitTxhash}`);
  } catch (err: any) {
    console.error("Tx submission failed:", JSON.stringify(err, null, 2));
  }
}

main();