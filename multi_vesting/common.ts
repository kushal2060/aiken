import 'dotenv/config';
import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
} from "@meshsdk/core";
import {applyParamsToScript} from "@meshsdk/core"
import fs, {read} from 'fs';
import blueprint from "../plutus.json"
export const blockchainProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID as string);

export const owner_wallet1 = new MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
        type: "root",
        bech32: fs.readFileSync("owner.sk").toString(),
    },
});

export const owner_wallet2 = new MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
        type: "root",
        bech32: fs.readFileSync("me.sk").toString(),
    },
});

export const beneficairy_wallet = new MeshWallet({
    networkId: 0,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
        type: "root",
        bech32: fs.readFileSync("beneficiary.sk").toString(),
    },
});


export function getTxBuilder() {
    return new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
        // verbose: true, //logs
    });
}


export const scriptCbor = applyParamsToScript(blueprint.validators[6].compiledCode, []);
export const scriptAddr = serializePlutusScript(
    {code: scriptCbor, version: "V3"},
    undefined,
    0
).address;