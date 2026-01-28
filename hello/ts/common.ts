import fs from "node:fs";
import "dotenv/config";
import {
    BlockfrostProvider,
    MeshTxBuilder,
    MeshWallet,
    serializePlutusScript,
    UTxO,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core";
import blueprint from "../../plutus.json";

if (!process.env.BLOCKFROST_PROJECT_ID) {
    throw new Error("BLOCKFROST_PROJECT_ID environment variable is not set.");
}
const blockchainProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID as string);

//wallet
export const wallet = new MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
        type: "root",
        bech32: fs.readFileSync("me.sk").toString(),
    },
});

export function getScript(){
    const scriptCbor = applyParamsToScript(
        blueprint.validators[0].compiledCode,
        []
    );

    const scriptAddr = serializePlutusScript(
        {code: scriptCbor, version: "V3"},
    ).address;

    return {scriptCbor, scriptAddr};
}

//function for trasnsaction builder
export function getTxBuilder(){
    return new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
    });
}

function print(){
    let address =getScript().scriptAddr;
    console.log('Script DDRESS',address);
}
print();

//get Utxos
export async function getUtxoByHash(txHash: string): Promise<UTxO> {
    const utxos = await blockchainProvider.fetchUTxOs(txHash);
    if (utxos.length === 0) {
        throw new Error(`No UTxOs found for transaction hash: ${txHash}`);
    }
    return utxos[0];
}
