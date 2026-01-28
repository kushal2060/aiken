import fs from 'node:fs'
import {
    MeshWallet,
} from "@meshsdk/core"

//sk for owner and beneficairy wallet

const owner_secret_key = MeshWallet.brew(true);
const beneficairy_secret_key = MeshWallet.brew(true);

fs.writeFileSync('owner.sk',owner_secret_key);
fs.writeFileSync('beneficiary.sk',beneficairy_secret_key);

const owner_wallet = new MeshWallet({
    networkId: 0,
    key: {
        type: 'root',
        bech32: owner_secret_key,
    },
});

const beneficairy_wallet = new MeshWallet({
    networkId: 0,
    key: {
        type: 'root',
        bech32: beneficairy_secret_key,
    }
});

fs.writeFileSync('owenr.addr', (await owner_wallet.getUnusedAddresses())[0]);
fs.writeFileSync('beneficiary.addr',(await beneficairy_wallet.getUnusedAddresses())[0]);
