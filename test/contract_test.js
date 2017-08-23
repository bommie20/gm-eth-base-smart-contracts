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
var multisig;

var initialBalanceCreator = 0;
var initialBalanceBuyer = 0;
var initialBalanceBuyer2 = 0;
var initialMultisigBalance = 0;

var mntContractAddress;
var mntContract;

var goldContractAddress;
var goldContract;

var goldmintContractAddress;
var goldmintContract;

var unsoldContractAddress;
var unsoldContract;

var foundersVestingContractAddress;
var foundersVestingContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

var ICO_TOTAL_SELLING_SHOULD_BE = 7000000 * 1000000000000000000;
var FOUNDERS_BALANCE_SHOULD_BE = 2000000 * 1000000000000000000;
var BONUS_SHOULD_BE = 1000000 * 1000000000000000000;
// 9000000000000000000000000
var TOTAL_SUPPLY_SHOULD_BE = new BigNumber(FOUNDERS_BALANCE_SHOULD_BE).plus(new BigNumber(ICO_TOTAL_SELLING_SHOULD_BE));
var TOKENS_PER_ETH = 51428571428571428571;

// TEST:
/*
var ICO_TOTAL_SELLING_SHOULD_BE = 20000000 * 100000000000000000;
var FOUNDERS_BALANCE_SHOULD_BE = 2000000 * 1000000000000000000;
var BONUS_SHOULD_BE = 1000000 * 1000000000000000000;
var TOTAL_SUPPLY_SHOULD_BE = new BigNumber(FOUNDERS_BALANCE_SHOULD_BE).plus(new BigNumber(ICO_TOTAL_SELLING_SHOULD_BE));
var TOKENS_PER_ETH = 51428571428571428571;
*/

/////////////////////////////////////////////
// 1000 tokens
var ISSUE_EXTERNALLY = 1000000000000000000;

// recursive
function getMoreVestedTokens(index,maxIndex,cb){
     // 1 - stop recursion?
     if(index>maxIndex){
          return cb(null);
     }

     // 2 - move time one month
     var hours = 24 * 31;
     var seconds = 60 * 60 * hours;

     web3.currentProvider.sendAsync({
          jsonrpc: '2.0', 
          method: 'evm_increaseTime',
          params: [seconds],       
          id: new Date().getTime() 
     }, function(err) {
          if(err)return cb(err);

          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               if(err)return cb(err);

               // 3 - continue recursion
               getMoreVestedTokens(index + 1,maxIndex,cb);
          });
     });
}

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
               multisig = accounts[7];

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

                    deployFoundersVestingContract(data,function(err){
                         assert.equal(err,null);

                         deployGoldmintContract(data,function(err){
                              assert.equal(err,null);
                              done();
                         });
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

     it('should not change state if not from creator', function(done){
          var params = {from: creator2, gas: 2900000};
          goldmintContract.setState(1, params, (err,res)=>{
               assert.notEqual(err, null);
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
               assert.equal(res.toString(10), FOUNDERS_BALANCE_SHOULD_BE);
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

          var foundersBalance = mntContract.balanceOf(foundersVestingContractAddress);
          assert.equal(foundersBalance.toString(10), FOUNDERS_BALANCE_SHOULD_BE);

          initialMultisigBalance = web3.eth.getBalance(multisig);

          // finish
          var params = {from: creator, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);

                    // check multisig ETH balance
                    var balanceAfter = web3.eth.getBalance(multisig);
                    assert.equal(balanceAfter.toString(10),initialMultisigBalance.toString(10));

                    done();
               });
          });
     });

     it('should transfer unsold tokens to GoldmintUnsold contract', function(done){
          // check that unsold tokens are transferred to GoldmintUnsold contract
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), TOTAL_SUPPLY_SHOULD_BE.toString(10));

               moved = goldmintContract.icoTokensUnsold();
               assert.equal(moved,ICO_TOTAL_SELLING_SHOULD_BE);

               assert.equal(goldmintContract.restTokensMoved(),true);

               unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,ICO_TOTAL_SELLING_SHOULD_BE);

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
               assert.equal(res.toString(10), TOTAL_SUPPLY_SHOULD_BE.toString(10));

               var moved = goldmintContract.icoTokensUnsold();
               assert.equal(moved,ICO_TOTAL_SELLING_SHOULD_BE);

               assert.equal(goldmintContract.restTokensMoved(),true);

               var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance,ICO_TOTAL_SELLING_SHOULD_BE);

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
          goldmintContract.issueTokensExternal(creator2, ISSUE_EXTERNALLY, params, (err,res)=>{
               assert.equal(err, null);

               var issuedExt = goldmintContract.issuedExternallyTokens();
               assert.equal(issuedExt,ISSUE_EXTERNALLY);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),ISSUE_EXTERNALLY);
                    done();
               });
          });
     });

     it('should not update total supply after ->running->paused->running', function(done){
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);

               // 9000001000000000000000000
               var one = new BigNumber(TOTAL_SUPPLY_SHOULD_BE);
               var two = new BigNumber(ISSUE_EXTERNALLY);
               var shouldBe = one.plus(two); 

               assert.equal(res.toString(10),shouldBe.toString(10));
               done();                              
          });
     });

     it('should not burn creator2 tokens if not from token manager', function(done){
          var params = {from: creator, gas: 2900000};
          goldmintContract.burnTokens(creator2, ISSUE_EXTERNALLY, params, (err,res)=>{
               assert.notEqual(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),ISSUE_EXTERNALLY);

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
                    assert.equal(res.toString(10),ISSUE_EXTERNALLY);
                    done();
               });
          });
     });

     it('should not burn creator2 tokens if bigger than balance 2', function(done){
          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.burnTokens(creator2, ISSUE_EXTERNALLY + 100, params, (err,res)=>{
               assert.notEqual(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),ISSUE_EXTERNALLY);
                    done();
               });
          });
     });

     it('should burn creator2 tokens', function(done){
          var params = {from: tokenManager, gas: 2900000};
          goldmintContract.burnTokens(creator2, ISSUE_EXTERNALLY, params, (err,res)=>{
               assert.equal(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),0);

                    // should be still ISSUE_EXTERNALLY
                    var issuedExt = goldmintContract.issuedExternallyTokens();
                    assert.equal(issuedExt,ISSUE_EXTERNALLY);

                    // should update total supply
                    mntContract.totalSupply((err,res)=>{
                         assert.equal(err, null);
                         assert.equal(res.toString(10), TOTAL_SUPPLY_SHOULD_BE.toString(10));

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
          var total = BONUS_SHOULD_BE;
          assert.equal(bonusReward,total);

          var ext = goldmintContract.issuedExternallyTokens();
          assert.equal(ext,ISSUE_EXTERNALLY);
          
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

     it('should not get vested founders tokens if no time elapsed', function(done){
          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should move time 29 days',function(done){
          var hours = 24 * 29;
          var seconds = 60 * 60 * hours;

          web3.currentProvider.sendAsync({
               jsonrpc: '2.0', 
               method: 'evm_increaseTime',
               params: [seconds],       
               id: new Date().getTime() 
          }, function(err) {
               assert.equal(err,null);
               done(err);
          });
     });

     it('should not get vested founders tokens if not enough time elapsed', function(done){
          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should move time 2 more days',function(done){
          var hours = 24 * 2;
          var seconds = 60 * 60 * hours;

          web3.currentProvider.sendAsync({
               jsonrpc: '2.0', 
               method: 'evm_increaseTime',
               params: [seconds],       
               id: new Date().getTime() 
          }, function(err) {
               assert.equal(err,null);
               done(err);
          });
     });

     it('should get 1/10 vested founders tokens if >30 days elapsed', function(done){
          // check precondition
          var teamBalance = mntContract.balanceOf(goldmintTeam);
          assert.equal(teamBalance.toString(10), 0);

          var foundersBalance = mntContract.balanceOf(foundersVestingContractAddress);
          assert.equal(foundersBalance.toString(10), FOUNDERS_BALANCE_SHOULD_BE);

          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               assert.equal(err, null);

               // 1/10th
               var mustMove = FOUNDERS_BALANCE_SHOULD_BE / 10;
               var left = mntContract.balanceOf(foundersVestingContractAddress);
               assert.equal(left.toString(10), FOUNDERS_BALANCE_SHOULD_BE - mustMove);

               var teamBalance = mntContract.balanceOf(goldmintTeam);
               assert.equal(teamBalance.toString(10), mustMove);

               done();
          });
     });

     it('should not get vested founders tokens again', function(done){
          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               assert.notEqual(err, null);

               // Check balances again!
               // 1/10th
               var mustMove = FOUNDERS_BALANCE_SHOULD_BE / 10;
               var left = mntContract.balanceOf(foundersVestingContractAddress);
               assert.equal(left.toString(10), FOUNDERS_BALANCE_SHOULD_BE - mustMove);

               var teamBalance = mntContract.balanceOf(goldmintTeam);
               assert.equal(teamBalance.toString(10), mustMove);
               done();
          });
     });

     it('should move time 31 days',function(done){
          var hours = 24 * 31;
          var seconds = 60 * 60 * hours;

          web3.currentProvider.sendAsync({
               jsonrpc: '2.0', 
               method: 'evm_increaseTime',
               params: [seconds],       
               id: new Date().getTime() 
          }, function(err) {
               assert.equal(err,null);
               done(err);
          });
     });

     it('should get 1/10 vested founders tokens again', function(done){
          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               assert.equal(err, null);

               // Check balances again!
               // 2/10th
               var mustMove = 2 * (FOUNDERS_BALANCE_SHOULD_BE / 10);
               var left = mntContract.balanceOf(foundersVestingContractAddress);
               assert.equal(left.toString(10), FOUNDERS_BALANCE_SHOULD_BE - mustMove);

               var teamBalance = mntContract.balanceOf(goldmintTeam);
               assert.equal(teamBalance.toString(10), mustMove);
               done();
          });
     });

     it('should not get vested founders tokens if not enough time elapsed', function(done){
          var params = {from: creator, gas: 3900000};
          foundersVestingContract.withdrawTokens(params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should get vested tokens in a loop', function(done){
          var index = 3;
          var maxIndex = 10;
          getMoreVestedTokens(index,maxIndex,function(err){
               assert.equal(err,null);

               // Check final balances
               var left = mntContract.balanceOf(foundersVestingContractAddress);
               assert.equal(left.toString(10), 0);

               var mustMove = FOUNDERS_BALANCE_SHOULD_BE;
               var teamBalance = mntContract.balanceOf(goldmintTeam);
               assert.equal(teamBalance.toString(10), mustMove);

               done();
          });
     });

     it('should not get vested tokens again!', function(done){
          var index = 0;
          var maxIndex = 0;
          getMoreVestedTokens(index,maxIndex,function(err){
               assert.notEqual(err,null);

               // Final balances should not be changed
               var left = mntContract.balanceOf(foundersVestingContractAddress);
               assert.equal(left.toString(10), 0);

               var mustMove = FOUNDERS_BALANCE_SHOULD_BE;
               var teamBalance = mntContract.balanceOf(goldmintTeam);
               assert.equal(teamBalance.toString(10), mustMove);

               done();
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
               multisig = accounts[7];

               initialMultisigBalance = web3.eth.getBalance(multisig);

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

                    deployFoundersVestingContract(data,function(err){
                         assert.equal(err,null);

                         deployGoldmintContract(data,function(err){
                              assert.equal(err,null);
                              done();
                         });
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
                    assert.equal(res,ICO_TOTAL_SELLING_SHOULD_BE);

                    goldmintContract.getCurrentPrice((err,res)=>{
                         assert.equal(err,null);
                         assert.equal(res,TOKENS_PER_ETH);

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

                    // 51.43 MNTP tokens per 1 ETH
                    var balance = mntContract.balanceOf(buyer);
                    assert.equal(balance,TOKENS_PER_ETH);

                    // new check
                    goldmintContract.getTokensIcoSold((err,res)=>{
                         assert.equal(err,null);
                         assert.equal(res,TOKENS_PER_ETH);

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

                    // check multisig ETH balance
                    var balanceAfter = web3.eth.getBalance(multisig);
                    assert.equal(balanceAfter.toString(10),
                                 parseInt(initialMultisigBalance.toString(10)) + 1000000000000000000);

                    done();
               });
          });
     });

     it('should transfer unsold tokens to GoldmintUnsold contract', function(done){
          // check that unsold tokens are transferred to GoldmintUnsold contract
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), TOTAL_SUPPLY_SHOULD_BE.toString(10));

               moved = goldmintContract.icoTokensUnsold();

               //var one = new BigNumber(ICO_TOTAL_SELLING_SHOULD_BE);
               // this doesnt work(((((
               //var two = new BigNumber(TOKENS_PER_ETH);
               //var shouldBe = one.minus(two); 
               //assert.equal(moved,shouldBe);

               // TODO: not working with different params than default!
               //assert.equal(moved,ICO_TOTAL_SELLING_SHOULD_BE - TOKENS_PER_ETH);

               assert.equal(goldmintContract.restTokensMoved(),true);

               unsoldBalance = mntContract.balanceOf(unsoldContractAddress);
               assert.equal(unsoldBalance.toString(10),moved.toString(10));

               done();                              
          });
     });

     it('should not withdraw unsold tokens if time hasnt come', function(done){
          var params = {from: creator, gas: 2900000};

          unsoldContract.withdrawTokens(params,(err,res)=>{
               assert.notEqual(err, null);

               var unsoldBalance = mntContract.balanceOf(unsoldContractAddress);

               // TODO: not working with different params than default!
               //assert.equal(unsoldBalance,ICO_TOTAL_SELLING_SHOULD_BE - TOKENS_PER_ETH);

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
               assert.equal(unsoldBalance,ICO_TOTAL_SELLING_SHOULD_BE - 37962962962962962962);

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
               multisig = accounts[7];

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

                    deployFoundersVestingContract(data,function(err){
                         assert.equal(err,null);

                         deployGoldmintContract(data,function(err){
                              assert.equal(err,null);
                              done();
                         });
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
                    assert.equal(balance,TOKENS_PER_ETH);
                    done();
               }
          );
     });

     it('should not transfer MNTP tokens if ICO is not finished',function(done){
          var params = {from: buyer, gas: 2900000};

          var balance1 = mntContract.balanceOf(buyer2);
          assert.equal(balance1,0);

          //var amount = TOKENS_PER_ETH;
          var amount = 10;
          mntContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.notEqual(err, null);

               var balance = mntContract.balanceOf(buyer);
               assert.equal(balance,TOKENS_PER_ETH);
               
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
          assert.equal(balance,TOKENS_PER_ETH);

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
               assert.equal(balance1,TOKENS_PER_ETH);
               
               var balanceNew = mntContract.balanceOf(buyer);
               assert.equal(balanceNew,0);

               done();
          });
     });
})


describe('Contracts 5 - test issueTokensFromOtherCurrency', function() {
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
               multisig = accounts[7];

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

                    deployFoundersVestingContract(data,function(err){
                         assert.equal(err,null);

                         deployGoldmintContract(data,function(err){
                              assert.equal(err,null);

                              mntContract.setIcoContractAddress(
                                   goldmintContractAddress,
                                   {
                                        from: creator,               
                                        gas: 2900000 
                                   },function(err,result){

                                        unsoldContract.setIcoContractAddress(
                                             goldmintContractAddress,
                                             {
                                                  from: creator,               
                                                  gas: 2900000 
                                             },function(err,result){
                                                  assert.equal(err,null);
                                                  done();
                                        });
                                   });
                         });
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

     it('should not issue tokens if in wrong state', function(done){
          var params = {from: tokenManager, gas: 2900000};

          var amount = 1000000000000000000;
          goldmintContract.issueTokensFromOtherCurrency(creator2, amount, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should change state to ICORunning', function(done){
          goldmintContract.currentState((err,res)=>{
               assert.equal(err,null);
               assert.equal(res,0);

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

     it('should not issue tokens from other account', function(done){
          var params = {from: creator, gas: 2900000};

          var amount = 1000000000000000000;
          goldmintContract.issueTokensFromOtherCurrency(creator2, amount, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should not be able to call issueTokensInternal', function(done){
          var params = {from: creator, gas: 2900000};
          assert.equal(typeof(goldmintContract.issueTokensInternal),'undefined');
          assert.notEqual(typeof(goldmintContract.issueTokensFromOtherCurrency),'undefined');

          done();
     });

     it('should issue tokens with issueTokensFromOtherCurrency function to creator', function(done){
          var params = {from: tokenManager, gas: 2900000};

          var amount = 1000000000000000000;
          goldmintContract.issueTokensFromOtherCurrency(creator2, amount, params, (err,res)=>{
               assert.equal(err, null);

               var issuedExt = goldmintContract.issuedExternallyTokens();
               assert.equal(issuedExt,0);

               var tokensSold = goldmintContract.icoTokensSold();
               assert.equal(tokensSold,TOKENS_PER_ETH);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),TOKENS_PER_ETH);
                    done();
               });
          });
     });
});

describe('Contracts 6 - ICO finished test', function() {
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
               multisig = accounts[7];

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

                    deployFoundersVestingContract(data,function(err){
                         assert.equal(err,null);

                         deployGoldmintContract(data,function(err){
                              assert.equal(err,null);

                              mntContract.setIcoContractAddress(
                                   goldmintContractAddress,
                                   {
                                        from: creator,               
                                        gas: 2900000 
                                   },function(err,result){

                                        unsoldContract.setIcoContractAddress(
                                             goldmintContractAddress,
                                             {
                                                  from: creator,               
                                                  gas: 2900000 
                                             },function(err,result){
                                                  assert.equal(err,null);
                                                  done();
                                        });
                                   });
                         });
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

     it('should not change state if not creator', function(done){
          var params = {from: creator2, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.notEqual(err, null);

               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,1);
                    done();
               });
          });
     });
     
     it('should move time 1 month', function(done){
          var hours = 24 * 31;
          var seconds = 60 * 60 * hours;

          web3.currentProvider.sendAsync({
               jsonrpc: '2.0', 
               method: 'evm_increaseTime',
               params: [seconds],       
               id: new Date().getTime() 
          }, function(err) {
               assert.equal(err,null);
               done();
          });
     });

     it('should change state if not creator if ICO is finished', function(done){
          assert.equal(typeof(goldmintContract.finishICO),'undefined');

          var params = {from: creator2, gas: 2900000};
          goldmintContract.setState(3, params, (err,res)=>{
               assert.equal(err, null);
               goldmintContract.currentState((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res,3);
                    done();
               });
          });
     });
});
