import fs from 'node:fs';
import { MeshWallet } from "@meshsdk/core";

async function main() {
  const owner_secret_key = MeshWallet.brew(true) as string;
  const beneficiary_secret_key = MeshWallet.brew(true) as string;

  fs.writeFileSync('owner.sk', owner_secret_key);
  fs.writeFileSync('beneficiary.sk', beneficiary_secret_key);

  const owner_wallet = new MeshWallet({
    networkId: 0,
    key: {
      type: 'root',
      bech32: owner_secret_key,
    },
  });

  const beneficiary_wallet = new MeshWallet({
    networkId: 0,
    key: {
      type: 'root',
      bech32: beneficiary_secret_key,
    },
  });

  fs.writeFileSync('owner.addr', (await owner_wallet.getUnusedAddresses())[0]);
  fs.writeFileSync('beneficiary.addr', (await beneficiary_wallet.getUnusedAddresses())[0]);
}

main();
