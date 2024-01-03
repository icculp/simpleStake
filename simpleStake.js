const { JsonRpcProvider } = require('@pokt-foundation/pocketjs-provider');
const { KeyManager } = require('@pokt-foundation/pocketjs-signer');
const { TransactionBuilder } = require('@pokt-foundation/pocketjs-transaction-builder');
const { URL } = require('url');
const { parse } = require('csv-parse');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// load env variables
require('dotenv').config();


const AMOUNT = JSON.parse(process.env.STAKE_AMOUNT * 1000000).toString() || '60000000000'; // convert decimal to uPokt
const POKT_URL = JSON.parse(JSON.stringify(process.env.POKT_URL)) || 'localhost:8081';
const SENDER_PRIVATE_KEY = JSON.parse(JSON.stringify(process.env.SENDER_PRIVATE_KEY)) || null;
const SENDER_KEYFILE = JSON.parse(JSON.stringify(process.env.SENDER_KEYFILE)) || null;
const PASSWORD = process.env.KEYFILE_PASSWORD ?  JSON.parse(JSON.stringify(process.env.KEYFILE_PASSWORD)) : '';
const NODES_FILE = JSON.parse(JSON.stringify(process.env.NODES_FILE)) || 'nodes.csv';
const KEYFILE_PATH = path.join(__dirname, SENDER_KEYFILE);
const PROVIDER = new JsonRpcProvider({ rpcUrl: POKT_URL });
const CSV_FILE_PATH = path.join(__dirname, NODES_FILE);
const RATE_LIMITED = process.env.RATE_LIMITED || false;


function logToFile(message) {
  const logFilePath = path.join(__dirname, 'app.log');
  console.log(message)
  fs.appendFileSync(logFilePath, `${new Date().toISOString()} - ${message}\n`);
}

async function loadNodesFromCSV() {
  // Load nodes from a csv file
  return new Promise((resolve, reject) => {
    let nodes = [];
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(parse({ delimiter: ',', columns: true, ltrim: true }))
      .on('data', (row) => {
        nodes.push(row);
      })
      .on('error', (error) => {
        logToFile(`Error loading nodes csv: ${error}`)
        reject(error);
      })
      .on('end', () => {
        logToFile('parsed csv data:'); //, nodes);
        resolve(nodes);
      });
  });
}

async function loadSigner() {
  let signer;
  if (SENDER_PRIVATE_KEY) {
    signer = await KeyManager.fromPrivateKey(SENDER_PRIVATE_KEY)
    return signer;
  } else {
    const KEYFILE = JSON.parse(JSON.stringify(await fs.readFileSync(KEYFILE_PATH, 'utf8')));
    if (PASSWORD === '') {
      // prompt user to enter password if not provided
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });
      const hiddenQuery = (query) => new Promise((resolve) => {
        rl.question(query, (input) => {
          rl.history = rl.history.slice(1); // Remove input from history
          resolve(input);
        });
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
          if (rl.line.length > 0) {
            rl.output.write("*");
          }
        };
      });
      signer = await KeyManager.fromPPK({ ppk: KEYFILE, password:  await hiddenQuery('Please enter your password: ') });
      rl.close();
      return signer;
    }
    signer = await KeyManager.fromPPK({ ppk: KEYFILE, password: PASSWORD });
    return signer;
  }
}

async function stakeNode(nodeDetails, signer) {
  try {
    const outputAddress = await signer.getAddress();
    const transactionBuilder = new TransactionBuilder({
      chainID: "mainnet",
      provider: PROVIDER,
      signer: signer,
    });
    logToFile(`Staking node with pubkey: ${nodeDetails.Pubkey}, address: ${nodeDetails.Address}, output address: ${outputAddress}, amount: ${AMOUNT}`);
    const tx = transactionBuilder.nodeStake({
      nodePubKey: nodeDetails.Pubkey,
      outputAddress: outputAddress,
      chains: ['0021'],
      amount: AMOUNT,
      serviceURL: new URL(nodeDetails.URI)
    });
    logToFile('Prepared Transaction: ' + JSON.stringify(tx))
    const txresponse = await transactionBuilder.submit({
      memo: "cryptonode.tools nodeStake",
      txMsg: tx,
    });
    logToFile('Stake tx: ' + txresponse.txHash + ' for node: ' + nodeDetails.Address);
    return { txHash: txresponse.txHash, nodeAddress: nodeDetails.Address };
  } catch (error) {
    logToFile(`Stakenode Error: address ${nodeDetails.Address}, error: ${error}`);
    return { error: error, nodeAddress: nodeDetails.Address };
  }
}

async function stakeNodes() {
  const NODES = await loadNodesFromCSV();
  const signer = await loadSigner();
  const tx_results = []
  //console.log(NODES)
  for (nodeIndex in NODES) {
    //console.log(`Staking node with address ${NODES[nodeIndex].Address}`);
    tx_results.push(await stakeNode(NODES[nodeIndex], signer));
    // sleep for 1 second between txs
    if (RATE_LIMITED) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return tx_results;
}

// save tx results to file
stakeNodes()
  .then(txResults => {
    const txResultsPath = path.join(__dirname, 'txResults.json');
    fs.writeFileSync(txResultsPath, JSON.stringify(txResults));
  })
  .catch(error => {
    logToFile(`Error: ${error}`);
});