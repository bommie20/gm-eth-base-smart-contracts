 solc = require('solc');
var Web3 = require('web3');

var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before testing
//assert.notEqual(typeof(process.env.ETH_NODE),'undefined');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

var accounts;

var creator;
var buyer;
var buyer2;
var buyers = [];

var initialBalanceCreator = 0;
var initialBalanceBuyer = 0;
var initialBalanceBuyer2 = 0;

var mntContractAddress;
var mntContract;

var goldContractAddress;
var goldContract;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

function diffWithGas(mustBe,diff){
     var gasFee = 12000000;
     return (diff>=mustBe) && (diff<=mustBe + gasFee);
}

function getContractAbi(contractName,cb){
     var file = './contracts/Goldmint.sol';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1);   // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          return cb(null,abi);
     });
}

function deployGoldContract(data,cb){
     var file = './contracts/Goldmint.sol';
     var contractName = ':GOLD';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          tempContract.new(
               creator,  // rewardsAccount
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 4995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         goldContractAddress = result.contractAddress;
                         goldContract = web3.eth.contract(abi).at(goldContractAddress);

                         console.log('GOLD2 Contract address: ');
                         console.log(goldContractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

function deployMntContract(data,cb){
     var file = './contracts/Goldmint.sol';
     var contractName = ':MNT';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          tempContract.new(
               creator,  // rewardsAccount
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 4995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         mntContractAddress = result.contractAddress;
                         mntContract = web3.eth.contract(abi).at(mntContractAddress);

                         console.log('MNT Contract address: ');
                         console.log(mntContractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

describe('ContractsScheme2 0', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               buyer = accounts[1];
               buyer2 = accounts[2];

               var contractName = ':MNT';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    done();
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy token contract',function(done){
          var data = {};
          deployMntContract(data,function(err){
               assert.equal(err,null);

               deployGoldContract(data,function(err){
                    assert.equal(err,null);

                    done();
               });
          });
     });

     it('should get initial balances',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);
          initialBalanceBuyer = web3.eth.getBalance(buyer);
          initialBalanceBuyer2= web3.eth.getBalance(buyer2);

          done();
     });

     it('should get initial token balances',function(done){
          var balance = mntContract.balanceOf(creator);
          assert.equal(balance,0);

          balance = mntContract.balanceOf(buyer);
          assert.equal(balance,0);

          balance = mntContract.balanceOf(buyer2);
          assert.equal(balance,0);

          done();
     });

     it('should get initial state',function(done){
          var state = mntContract.currentState();
          assert.equal(state,0);
          done();
     });

     it('should set GOLD token address',function(done){
          mntContract.setGoldTokenAddress(
               goldContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should not move state if not owner',function(done){
          mntContract.setState(
               1,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should throw if state is INIT',function(done){
          var amount = 200000000000000000;

          web3.eth.sendTransaction(
               {
                    from: buyer,               
                    to: mntContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);

                    done();
               }
          );
     });

     it('should move state to ICO started',function(done){
          mntContract.setState(
               1,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should buy some MNT tokens for buyer1',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          web3.eth.sendTransaction(
               {
                    from: buyer,               
                    to: mntContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should buy some MNT tokens for buyer2',function(done){
          // 0.4 ETH
          var amount = 400000000000000000;

          web3.eth.sendTransaction(
               {
                    from: buyer2,               
                    to: mntContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     /////// 
     it('should get updated Buyers balance',function(done){
          // 0 - estimate gas costs
          //var amount = 200000000000000000;
          //var gas = mntContract.buyTokens.estimateGas(amount);
          //console.log('GAS: ' + gas);

          // 1 - tokens
          var tokens = mntContract.balanceOf(buyer);
          assert.equal(tokens / 1000000000000000000,200);   // 200 tokens (converted)

          tokens = mntContract.balanceOf(buyer2);
          assert.equal(tokens / 1000000000000000000,400);   // 400 tokens (converted)

          // 2 - ETHs
          var currentBalance = web3.eth.getBalance(buyer);
          var diff = initialBalanceBuyer - currentBalance;
          var mustBe = 200000000000000000;

          assert.equal(diffWithGas(mustBe,diff),true);

          done();
     });

     it('should issue some test GOLD tokens for buyer',function(done){
          // 100 GOLD tokens
          var amount = 100 * 1000000000000000000; 

          goldContract.TEST_issueTokens(
               buyer,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    // now creator should have 100 GOLD tokens
                    var tokens = goldContract.balanceOf(buyer);
                    assert.equal(tokens / 1000000000000000000,100);   

                    done();
               }
          );
     });

     it('should transfer GOLD buyer -> buyer2',function(done){
          // 20 GOLD tokens
          var amount = 20 * 1000000000000000000; 

          // creator is really == rewardsAccount
          goldContract.transfer(
               buyer2,
               amount,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    // now creator should have 100 GOLD tokens
                    var tokens = goldContract.balanceOf(buyer);
                    assert.equal(tokens / 1000000000000000000,80);   

                    tokens = goldContract.balanceOf(buyer2);
                    assert.equal(tokens / 1000000000000000000,19.95);   

                    var rewAccount = goldContract.getRewardsAccount();
                    assert.equal(rewAccount,creator);

                    var totalRewardsCollected = goldContract.balanceOf(rewAccount);
                    assert.equal(totalRewardsCollected/ 1000000000000000000,0.05);   

                    // should be zero because no sendRewards was called...
                    var totalRewards = mntContract.getLastRewardsTotal();
                    assert.equal(totalRewards/ 1000000000000000000,0);   

                    done();
               }
          );
     });

     it('should send rewards',function(done){
          mntContract.sendRewards(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should not send rewards again',function(done){
          mntContract.sendRewards(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });


     it('should get my rewards 1',function(done){
          // check the balance
          var balance = mntContract.balanceOf(buyer);
          assert.equal(balance / 1000000000000000000,200);   // 200 tokens (converted)

          var total = mntContract.totalSupply();
          assert.equal(total/ 1000000000000000000,600);   // 600 tokens (converted)

          // should not be zero 
          var totalRewards = mntContract.getLastRewardsTotal();
          assert.equal(totalRewards,0.05 * 1000000000000000000);   

          var myRewards = mntContract.calculateMyReward(buyer);

          mntContract.getMyReward(
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

});
