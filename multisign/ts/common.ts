import fs from "node:fs"
import "dotenv/config"
import {
  BlockfrostProvider,
  MeshTxBuilder,
  MeshWallet,
  serializePlutusScript,
  UTxO,
  deserializeAddress,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core";
import blueprint from "../../plutus.json";
import { error } from "node:console";


if (!process.env.BLOCKFROST_PROJECT_ID) {
    throw new Error("BLOCKFROST_PROJECT_ID environment variable is not set.");
}
const blockchainProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID as string);

// Wallet 1
export const wallet1 = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("me.sk").toString(),
  },
});

// Wallet 2
export const wallet2 = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("me1.sk").toString(),
  },
});

// Wallet 3
export const wallet3 = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("me2.sk").toString(),
  },
});

export async function getOwnerHashes() {
    const addr1 = (await wallet1.getUnusedAddresses())[0];
    const addr2 = (await wallet2.getUnusedAddresses())[0];
    const addr3 = (await wallet3.getUnusedAddresses())[0];

    const pkh1=deserializeAddress(addr1).pubKeyHash;
    const pkh2=deserializeAddress(addr2).pubKeyHash;
    const pkh3=deserializeAddress(addr3).pubKeyHash;

    return {pkh1,pkh2,pkh3};
    
}

export function getScript(){
    const scriptCbor=applyParamsToScript(
        blueprint.validators[2].compiledCode,[]
    )

    const scriptAddr= serializePlutusScript(
        {code:scriptCbor, version:"V3"}
    ).address;

    return {scriptCbor,scriptAddr};
}

export function getTxBuilder() {
    return new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider
    })
}


export async function getUtxoByHash(txHash:string): Promise <UTxO>{
    const utxos = await blockchainProvider.fetchAddressUTxOs(txHash);
    if (utxos.length == 0){
        throw new Error(`no utxo found for: ${txHash} `);
    }
    return utxos[0];

}

// function print(){
//     let address =getScript().scriptAddr;
//     console.log('Script DDRESS',address);
// }
// print();

export {blockchainProvider};