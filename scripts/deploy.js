var solc = require('solc');
var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before running 
assert.notEqual(typeof(process.env.ETH_NODE),'undefined');

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

function getContractAbi(contractName,cb){
     var file = './contracts/Goldmint.sol';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1);   // 1 activates the optimiser

          var abiJson = output.contracts[contractName].interface;

          var abi = JSON.parse(abiJson);
          var bytecode = output.contracts[contractName].bytecode;

          return cb(null,abi,bytecode,abiJson);
     });
}

// ************ READ THIS: ***********************
var creator = process.env.ETH_CREATOR_ADDRESS;

// 1 - get accounts
web3.eth.getAccounts(function(err, as) {
     if(err) {
          return;
     }

     // 2 - read ABI
     var contractName = ':Goldmint';
     getContractAbi(contractName,function(err,abi,bytecode,abiJson){
          fs.writeFileSync('abi.out',abiJson);
          console.log('Wrote ABI to file: abi.out');

          //deployMain(creator,abi,bytecode);
     });
});

function deployMain(creator,abi,bytecode){
     var tempContract = web3.eth.contract(abi);

     // TODO: set these params
     var tokenManager = '0xE9ae01D74F2939aEb1Fa652462E7ad878358d4e5';
     var mntTokenAddress = '0xB4c421275218C1Ae64292322FA0890E5b9D68BEa';
     var unsoldContracAddress = '0xB4c421275218C1Ae64292322FA0890E5b9D68BEa';
     var foundersRewardAddress = '0xB4c421275218C1Ae64292322FA0890E5b9D68BEa';

     // TODO: for coinmarketcap 
     var encoded      = '000000000000000000000000B4c421275218C1Ae64292322FA0890E5b9D68BEa';

     console.log('Deploying from: ' + creator);

     tempContract.new(
          tokenManager,
          escrow,
          unsoldContractAddress,
          foundersRewardAddress,
          {
               from: creator, 
               gas: 4330000,
               gasPrice: 100000000000,
               data: '0x' + bytecode 
          }, 
          function(err, c){
               if(err){
                    console.log('ERROR: ' + err);
                    return;
               }

               console.log('TX hash: ');
               console.log(c.transactionHash);
          });

}

