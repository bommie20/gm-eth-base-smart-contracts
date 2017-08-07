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
var charityAccount;
var charityAccount2;

var foundersRewardAccount;

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

var goldmintContractAddress;
var goldmintContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

describe('Contracts 2 - test MNT getters and setters', function() {
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
               goldmintRewardsAccount = accounts[5];
               advisors = accounts[6];
               charityAccount = accounts[7];
               charityAccount2 = accounts[8];

               foundersRewardAccount = accounts[9];

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

               deployGoldmintContract(data,function(err){
                    assert.equal(err,null);
                    done();
               });
          });
     });

     it('should set Goldmint token address to MNT contract',function(done){
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

     it('should issue tokens external with issueTokensExternal function to creator', function(done){
          assert.notEqual(typeof mntContract.issueTokens, 'undefined');

          var params = {from: creator, gas: 2900000};
          goldmintContract.issueTokensExternal(creator2, 1000, params, (err,res)=>{
               assert.equal(err, null);

               mntContract.balanceOf(creator2, (err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10),1000);
                    done();
               });
          });
     });

     it('should return 1000 for total supply', function(done){
          var params = {from: creator2, gas: 2900000};
          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 1000);
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
          //var FOUNDERS_REWARD = 2000000000000000000000000;
          //var BONUS_REWARD = 1800000000000000000000000;

          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 2000000000000000000001000);
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

     it('should not update total supply after ->running->paused->running', function(done){
          var params = {from: creator2, gas: 2900000};

          mntContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 2000000000000000000001000);
               done();                              
          });
     });
})


