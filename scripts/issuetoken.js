var solc = require('solc');
var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before running 
assert.notEqual(typeof(process.env.ETH_NODE),'undefined');

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

function getContractAbi(contractName,cb){
     var file = './contracts/GoldHolder.sol';

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
     var contractName = ':GOLD';
     getContractAbi(contractName,function(err,abi,bytecode,abiJson){
          issueOneToken(creator,abi,bytecode);
     });
});

function issueOneToken(creator,abi,bytecode){
     var contractAddress = '0x92b99Cdb39aB18c2735a3374e2149cB75869f59b';
     var tokenManager = '0x312C43cBF189a4750395ab16fEf8227266dF8a57';

     var contract = web3.eth.contract(abi).at(contractAddress);
     contract.issueTokens(
          // for me!
          0x92b99Cdb39aB18c2735a3374e2149cB75869f59b,
          // this is very low number: 10^-18 tokens
          1,
          {
               from: tokenManager, 
               gas: 2900000 
          },function(err,result){
               assert.equal(err,null);
               done();
          }
     );
}

