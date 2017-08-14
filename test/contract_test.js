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
var goldmintTeam;

var buyer;
var buyer2;
var buyers = [];
var unsoldTokensReward;
var tokenManager;

var initialBalanceCreator = 0;
var initialBalanceBuyer = 0;
var initialBalanceBuyer2 = 0;

var mntContractAddress;
var mntContract;

var goldContractAddress;
var goldContract;

var goldmintContractAddress;
var goldmintContract;

var unsoldContractAddress;
var unsoldContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

describe('Contracts 2 - test MNTP getters and setters', function() {
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
               goldmintTeam = accounts[3];
               creator2 = accounts[4];
               tokenManager = accounts[5];
               unsoldTokensReward = accounts[6];

               var contractName = ':MNTP';
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

               deployUnsoldContract(data,function(err){
                    assert.equal(err,null);

                    deployGoldmintContract(data,function(err){
                         assert.equal(err,null);
                         done();
                    });
               });
          });
     });

     it('should set Goldmint address to MNTP contract',function(done){
          mntContract.setIcoContractAddress(
               goldmintContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should set Goldmint token address to Unsold contract',function(done){
          unsoldContract.setIcoContractAddress(
               goldmintContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should not set creator if from bad account', function(done){
          mntContract.creator((err,res)=>{
               assert.equal(err,null);
               assert.equal(res,creator);

               var params = {from: buyer, gas: 2900000};
               mntContract.setCreator(creator2, params, (err,res)=>{
                    assert.notEqual(err,null);

                    mntContract.creator((err,res)=>{
                         assert.equal(err,null);
                         assert.equal(res,creator);
                         done();
                    });
               });
          });
     });

     it('should set creator', function(done){
          var params = {from: creator, gas: 2900000};
          mntContract.setCreator(creator2, params, (err,res)=>{
               assert.equal(err,null);
               mntContract.creator((err,res)=>{
                    assert.equal(err,null);
                    assert.equal(res,creator2);
                    done();
               });
          });
     });

     it('should return 0 for total supply', function(done){
          var params = {from: creator2, gas: 2900000};
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 0);
               done();                              
          })
     });

     it('should change state to ICORunning', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(1, params, (err,res)=>{
               assert.equal(err, null);
               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,1);
                    done();
               });
          });
     });

     it('should change state to ICOPaused', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(2, params, (err,res)=>{
               assert.equal(err, null);
               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,2);
                    done();
               });
          });
     });

     it('should not update total supply after ->running->paused', function(done){
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 2000000000000000000000000);
               done();                              
          });
     });

     it('should change state to ICORunning', function(done){
          goldmintContract.currentState((err,res)=>{
               assert.equal(err,null);
               assert.equal(res,2);

               var params = {from: creator, gas: 2900000};
               goldmintContract.setState(1, params, (err,res)=>{
                    assert.equal(err, null);

                    goldmintContract.currentState((err,res)=>{
                         assert.equal(err, null);
                         assert.equal(res,1);
                         done();
                    });
               });
          });
     });

     it('should not issue tokens externally if in wrong state', function(done){
          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.issueTokensExternal(creator2, 1000, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should change state to ICOFinished', function(done){
          // check preconditions
          var moved = goldmintContract.icoTokensUnsold();
          assert.equal(moved,0);
          assert.equal(goldmintContract.restTokensMoved(),false);
          var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
          assert.equal(unsoldBalance,0);

          // finish
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);
                    done();
               });
          });
     });

     it('should transfer unsold tokens to GoldmintUnsold contract', function(done){
          // check that unsold tokens are transferred to GoldmintUnsold contract
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 9000000000000000000000000);

               moved = goldmintContract.icoTokensUnsold();
               assert.equal(moved,7000000000000000000000000);

               assert.equal(goldmintContract.restTokensMoved(),true);

               unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,7000000000000000000000000);

               done();                              
          });
     });

     it('should change state to ICORunning', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(1, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,1);
                    done();
               });
          });
     });

     it('should change state to ICOFinished again', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);
                    done();
               });
          });
     });

     it('should not transfer unsold tokens again', function(done){
          // check that unsold tokens are transferred to GoldmintUnsold contract
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 9000000000000000000000000);

               var moved = goldmintContract.icoTokensUnsold();
               assert.equal(moved,7000000000000000000000000);

               assert.equal(goldmintContract.restTokensMoved(),true);

               var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,7000000000000000000000000);

               done();                              
          });
     });

     it('should not issue tokens if not token manager', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.issueTokensExternal(creator2, 1000, params, (err,res)=>{
               assert.notEqual(err, null);

               done();
          });
     });

     it('should issue tokens externally with issueTokensExternal function to creator', function(done){
          assert.notEqual(typeof mntContract.issueTokens, 'undefined');

          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.issueTokensExternal(creator2, 1000000000000000000, params, (err,res)=>{
               assert.equal(err, null);

               var issuedExt = goldmintContract.issuedExternallyTokens();
               assert.equal(issuedExt,1000000000000000000);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),1000000000000000000);
                    done();
               });
          });
     });

     it('should not update total supply after ->running->paused->running', function(done){
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 9000001000000000000000000);
               done();                              
          });
     });

     it('should not burn creator2 tokens if not from token manager', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.burnTokens(creator2, 1000000000000000000, params, (err,res)=>{
               assert.notEqual(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),1000000000000000000);

                    done();
               });
          });
     });

     it('should not burn creator2 tokens if bigger than balance', function(done){
          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.burnTokens(creator2, 2000000000000000000, params, (err,res)=>{
               assert.notEqual(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),1000000000000000000);
                    done();
               });
          });
     });

     it('should not burn creator2 tokens if bigger than balance 2', function(done){
          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.burnTokens(creator2, 1000000000000000100, params, (err,res)=>{
               assert.notEqual(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),1000000000000000000);
                    done();
               });
          });
     });

     it('should burn creator2 tokens', function(done){
          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.burnTokens(creator2, 1000000000000000000, params, (err,res)=>{
               assert.equal(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),0);

                    // should be still 1000
                    var issuedExt = goldmintContract.issuedExternallyTokens();
                    assert.equal(issuedExt,1000000000000000000);

                    // should update total supply
                    mntContract.totalSupply((err,res)=>{
                         assert.equal(err, null);
                         assert.equal(res.toString(10), 9000000000000000000000000);

                         done();
                    });
               });
          });
     });

     it('should not issue additional tokens if more than max', function(done){
          var params = {from: tokenManager, gas: 2900000};

          // 1 mln
          var additional = 1000000000000000000000000;

          goldmintContract.issueTokensExternal(buyer2, additional, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should issue additional tokens', function(done){
          var params = {from: tokenManager, gas: 3900000};

          var bonusReward = goldmintContract.BONUS_REWARD();
          var total = 1000000000000000000000000;
          assert.equal(bonusReward,total);

          var ext = goldmintContract.issuedExternallyTokens();
          assert.equal(ext,1000000000000000000);
          
          // issue more!
          var additional = bonusReward - ext; 
          goldmintContract.issueTokensExternal(buyer2, additional, params, (err,res)=>{
               assert.equal(err, null);

               var ext2 = goldmintContract.issuedExternallyTokens();
               assert.equal(ext2,total);

               mntContract.balanceOf(buyer2, (err,res)=>{
                    //console.log('RES: ');
                    //console.log(res);

                    assert.equal(err, null);
                    assert.equal(res.toString(10),additional);

                    done();
               });
          });
     });
})


describe('Contracts 3 - ICO buy tests', function() {
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
               goldmintTeam = accounts[3];
               creator2 = accounts[4];
               tokenManager = accounts[5];
               unsoldTokensReward = accounts[6];

               var contractName = ':MNTP';
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

               deployUnsoldContract(data,function(err){
                    assert.equal(err,null);

                    deployGoldmintContract(data,function(err){
                         assert.equal(err,null);
                         done();
                    });
               });
          });
     });

     it('should set Goldmint token address to MNTP contract',function(done){
          mntContract.setIcoContractAddress(
               goldmintContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should set Goldmint token address to Unsold contract',function(done){
          unsoldContract.setIcoContractAddress(
               goldmintContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should get all frontend data', function(done){
          goldmintContract.getTokensIcoSold((err,res)=>{
               assert.equal(err,null);
               assert.equal(res,0);

               goldmintContract.getTotalIcoTokens((err,res)=>{
                    assert.equal(err,null);
                    assert.equal(res,7000000 * 1000000000000000000);

                    goldmintContract.getCurrentPrice((err,res)=>{
                         assert.equal(err,null);
                         assert.equal(res,53571428571428571428);

                         done();
                    });
               });
          });
     });

     it('should change state to ICORunning', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(1, params, (err,res)=>{
               assert.equal(err, null);
               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,1);
                    done();
               });
          });
     });

     it('should buy tokens 1',function(done){
          // 1 ETH
          var amount = 1000000000000000000;

          web3.eth.sendTransaction(
               {
                    from: buyer,               
                    to: goldmintContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    // 53.5 MNTP tokens per 1 ETH
                    var balance = mntContract.balanceOf(buyer);
                    assert.equal(balance,53571428571428571428);

                    // new check
                    goldmintContract.getTokensIcoSold((err,res)=>{
                         assert.equal(err,null);
                         assert.equal(res,53571428571428571428);

                         done();
                    });
               }
          );
     });

     it('should change state to ICOFinished', function(done){
          // check preconditions
          var moved = goldmintContract.icoTokensUnsold();
          assert.equal(moved,0);
          assert.equal(goldmintContract.restTokensMoved(),false);
          var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
          assert.equal(unsoldBalance,0);

          // finish
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);
                    done();
               });
          });
     });

     it('should transfer unsold tokens to GoldmintUnsold contract', function(done){
          // check that unsold tokens are transferred to GoldmintUnsold contract
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 9000000000000000000000000);

               moved = goldmintContract.icoTokensUnsold();
               assert.equal(moved,7000000000000000000000000 - 53571428571428571428);

               assert.equal(goldmintContract.restTokensMoved(),true);

               unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,7000000000000000000000000 - 53571428571428571428);

               done();                              
          });
     });

     it('should not withdraw unsold tokens if time hasnt passed', function(done){
          var params = {from: creator, gas: 2900000};

          unsoldContract.withdrawTokens(params,(err,res)=>{
               assert.notEqual(err, null);

               var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,7000000000000000000000000 - 53571428571428571428);

               var transferred = mntContract.balanceOf(unsoldTokensReward);
               assert.equal(transferred,0);

               done();              
          });
     });

     // TODO: test -> move time in 1 year!
     /*
     it('should not withdraw unsold tokens if time hasnt passed', function(done){
          var params = {from: creator, gas: 2900000};

          unsoldContract.withdrawTokens(params,(err,res)=>{
               assert.notEqual(err, null);

               var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,7000000000000000000000000 - 37962962962962962962);

               var transferred = mntContract.balanceOf(unsoldTokensReward);
               assert.equal(transferred,0);

               done();              
          });
     });
     */
})

describe('Contracts 4 - lock MNTP transfers', function() {
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
               goldmintTeam = accounts[3];
               creator2 = accounts[4];
               tokenManager = accounts[5];
               unsoldTokensReward = accounts[6];

               var contractName = ':MNTP';
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

               deployUnsoldContract(data,function(err){
                    assert.equal(err,null);

                    deployGoldmintContract(data,function(err){
                         assert.equal(err,null);
                         done();
                    });
               });
          });
     });

     it('should set Goldmint token address to MNTP contract',function(done){
          mntContract.setIcoContractAddress(
               goldmintContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should set Goldmint token address to Unsold contract',function(done){
          unsoldContract.setIcoContractAddress(
               goldmintContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should change state to ICORunning', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(1, params, (err,res)=>{
               assert.equal(err, null);
               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,1);
                    done();
               });
          });
     });

     it('should buy tokens 1',function(done){
          // 1 ETH
          var amount = 1000000000000000000;

          web3.eth.sendTransaction(
               {
                    from: buyer,               
                    to: goldmintContractAddress,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    // 53.5 MNTP tokens per 1 ETH
                    var balance = mntContract.balanceOf(buyer);
                    assert.equal(balance,53571428571428571428);
                    done();
               }
          );
     });

     it('should not transfer MNTP tokens if ICO is not finished',function(done){
          var params = {from: buyer, gas: 2900000};

          var balance1 = mntContract.balanceOf(buyer2);
          assert.equal(balance1,0);

          //var amount = 53571428571428571428;
          var amount = 10;
          mntContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.notEqual(err, null);

               var balance = mntContract.balanceOf(buyer);
               assert.equal(balance,53571428571428571428);
               
               done();
          });
     });

     it('should change state to ICOFinished', function(done){
          // finish
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);
                    done();
               });
          });
     });

     it('should transfer MNTP tokens if ICO is finished',function(done){
          var params = {from: buyer, gas: 2900000};

          var balance = mntContract.balanceOf(buyer);
          assert.equal(balance,53571428571428571428);

          var balance1 = mntContract.balanceOf(buyer2);
          assert.equal(balance1,0);

          var amount = 10;
          mntContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.equal(err, null);

               balance1 = mntContract.balanceOf(buyer2);
               assert.equal(balance1,amount);
               
               var balanceNew = mntContract.balanceOf(buyer);
               assert.equal(balanceNew,balance - 10);

               done();
          });
     });

     it('should change state to ICORunning again', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(1, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,1);
                    done();
               });
          });
     });

     it('should not transfer MNTP tokens if ICO is not finished',function(done){
          var params = {from: buyer, gas: 2900000};

          var amount = 10;
          mntContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should change state to ICORunning again', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);
                    done();
               });
          });
     });

     it('should transfer MNTP tokens if ICO is finished 2',function(done){
          var params = {from: buyer, gas: 2900000};

          var balance = mntContract.balanceOf(buyer);
          var balance1 = mntContract.balanceOf(buyer2);

          // send everything
          var amount = balance;
          mntContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.equal(err, null);

               balance1 = mntContract.balanceOf(buyer2);
               assert.equal(balance1,53571428571428571428);
               
               var balanceNew = mntContract.balanceOf(buyer);
               assert.equal(balanceNew,0);

               done();
          });
     });
})


