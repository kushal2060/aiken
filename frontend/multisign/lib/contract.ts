import {
  BlockfrostProvider,
  MeshTxBuilder,
  serializePlutusScript,
  applyParamsToScript,
} from '@meshsdk/core';
import "dotenv/config"
import blueprint from "../../../plutus.json"

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '';

// Your plutus.json validator - you'll need to import this
let blockchainProvider: BlockfrostProvider | null = null;

export function getBlockchainProvider() {
  if (!blockchainProvider) {
    blockchainProvider = new BlockfrostProvider(BLOCKFROST_API_KEY);
  }
  return blockchainProvider;
}

export function getScript() {
  // Apply params (empty for this contract)
  const scriptCbor = applyParamsToScript(blueprint.validators[2].compiledCode, []);
  
  const scriptAddr = serializePlutusScript({
    code: scriptCbor,
    version: 'V3',
  }).address;

  return { scriptCbor, scriptAddr };
}

export function getTxBuilder() {
  const provider = getBlockchainProvider();
  console.log('Using Blockfrost provider with project ID:', BLOCKFROST_API_KEY);
  return new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
  });
}

getTxBuilder();