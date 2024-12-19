# simpleStake.js

A simple tool for (bulk) staking pocket network nodes locally without relying on a third party wallet/service to perform staking operations as a non custodial client.

## Important Information

> [!WARNING]
> ⚠️ **Caution:** This software is provided "as is" without any warranty. Use at your own risk. Make sure you know what you're doing and how to interact with the pocket protocol.

This can be useful for any non-custodial staking clients from any provider who need to stake new nodes, or upstake existing nodes where available wallets don't account for providers setting reward_delegators, which can only be modified by operator accounts and so this field needs to be included in staking transactions with the currently set delegators. It is intended to work with exported nodes csv from cryptonode.tools, but can be used by anyone by following the same format for the csv.

## Installation

First, install node if you haven't already, I prefer using nvm.

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 18
nvm use 18
```

Next, clone the repo, then you can install the depenecy packages using your favorite package manager like yarn, npm,
or pnpm.

```sh
git clone https://github.com/icculp/simpleStake.git
cd simpleStake
npm install
```

## Usage

### Format CSV

Place a csv file in this directory in the following format, or see example.csv for how to format your csv. **Note that the field order doesn't matter but the fields are case-sensitive!**

The only necessary fields are `Address` and `Pubkey`. If the node is already staked, it will use current chains and current URI. If the node is being staked for the first time, and URI is not specified, it will use `https://parked.com` and `['0021']` to stake. This should be fine for most operators, who _should_ have a system to pick up newly staked nodes and restake as necessary.

Create this file and save as `nodes.csv`.

#### Example CSV file

```csv
URI,Pubkey,Address
https://set13e383d4dfd7860143940f36a6612235b72d85734.pokt-07-a.cryptonode.tools:443,f77c2583027db79e9ada6508c6cae11c9ef10791a80d55deb6389e29d8557cd2,3e383d4dfd7860143940f36a6612235b72d85734
https://set14e4956d9eae5b72937db0b6ca46a7316c5213457.pokt-07-a.cryptonode.tools:443,a550f76043987471749aae13b9889cab13a84e8a93169e866de141153df9bb4f,4e4956d9eae5b72937db0b6ca46a7316c5213457
```

### Environment Variables

The output address will be set to the address of the signer, aka the sender private key or keyfile you modify in the env below.

⚠️ **Caution:** Only set an address for `NEW_OUTPUT_ADDRESS` if you plan to change the output address to something other than the signer you use to send the transaction. Make sure that you control this account and that you are sure you know what you're doing.

Note that it is better to use an encrypted keyfile instead of a plaintext private key, do not put your password into the .env other than for testing, let it prompt you for the password.

#### Example .env file

See also `example.csv`

```sh
# Update this to the URL of the node you will use for the transaction
POKT_URL='http://192.168.0.7:8091'
# Points to the csv file created above
NODES_FILE='nodes.csv'
# If you specify a plaintext private key, it will be used, otherwise it'll try to load a keyfile.
# Leave as empty string if using an encrypted keyfile (do not comment out or remove this param even if unused).
SENDER_PRIVATE_KEY=''
# Points to your keyfile
SENDER_KEYFILE='keyfile.json'
# if you don't specify a password below, you will be prompted to enter the password. This is preferred, but if you insist on writing your password in plaintext to disk, you can uncomment below to place the keyfile password
# KEYFILE_PASSWORD='password'
# 60k pokt, script will convert to uPokt
STAKE_AMOUNT=60000
# See below for more details
RATE_LIMITED=true
# See previous Caution statement for more details
# NEW_OUTPUT_ADDRESS=8bd6459cc4ab22cd462cef0e7f63527426bb36d9
```

Note that many gateways rate limit free teir endpoints, so if you aren't using a local node for the `POKT_URL` and haven't paid for a higher rate limit, and you're bulk staking more than 15 nodes, you need to set `RATE_LIMITED` to true, which assumes a RPS of 30 requests per second.

Once you're ready to stake it should be as simple as running.

```sh
node simpleStake.js
```

Staking transaction hashes will be output to `txResults.json`, along with any errors encountered. You can check your transaction progress on [poktscan](https://poktscan.com/) by copying the transaction hash and pasting it in the search bar there. It may take a few min for the transaction to be searchable.
