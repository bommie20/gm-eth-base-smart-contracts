var solc = require('solc');
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
var unsoldTokensReward;
var tokenManager;
var multisig;
var multisig2;
var ethRateChanger;

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

var unsoldContractAddress;
var unsoldContract;

var foundersVestingContractAddress;
var foundersVestingContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

var ONE_BLOCK = 700000;

//var ONE_BLOCK = 100;

var PRICE_1 = 51428571428571428571;
var PRICE_2 = 49285714285714285714;
var PRICE_3 = 47142857142857142857;
var PRICE_4 = 46285714285714285714;
var PRICE_5 = 45428571428571428571;
var PRICE_6 = 44571428571428571428;
var PRICE_7 = 43714285714285714285;
var PRICE_8 = 42857142857142857142;
var PRICE_9 = 42857142857142857142;
var PRICE_10= 42857142857142857142;

// If ETH_PRICE_IN_USD or STD_PRICE_USD_PER_1000_TOKENS or discountPercents table changes ->
// these test will fail...
describe('Price tests', function() {
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
               unsoldTokensReward = accounts[5];
               tokenManager = accounts[6];
               ethRateChanger = accounts[7];

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

                              multisig = goldmintContract.multisigs(0);
                              multisig2 = goldmintContract.multisigs(1);

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

     it('should get initial price', function(done){
          var icoTokensSold = goldmintContract.icoTokensSold();
          assert.equal(icoTokensSold,0);

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               // 1 ETH = 51.4285 tokens
               assert.equal(res,PRICE_1);

               done();
          });
     });

     it('should get second bucket price', function(done){
          var icoTokensSold = (ONE_BLOCK + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_2);

               done();
          });
     });

     it('should get third bucket price', function(done){
          var icoTokensSold = ((2 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_3);

               done();
          });
     });

     it('should get fourth bucket price', function(done){
          var icoTokensSold = ((3 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_4);

               done();
          });
     });

     it('should get fifth bucket price', function(done){
          var icoTokensSold = ((4 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_5);

               done();
          });
     });

     it('should get sixth bucket price', function(done){
          var icoTokensSold = ((5 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_6);

               done();
          });
     });

     it('should get seventh bucket price', function(done){
          var icoTokensSold = ((6 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_7);

               done();
          });
     });

     it('should get eight bucket price', function(done){
          var icoTokensSold = ((7 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_8);

               done();
          });
     });

     it('should get nineth bucket price', function(done){
          var icoTokensSold = ((8 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_9);

               done();
          });
     });

     it('should get tenth bucket price', function(done){
          var icoTokensSold = ((9 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,PRICE_10);

               done();
          });
     });

     it('should not get eleventh bucket price', function(done){
          var icoTokensSold = ((10 * ONE_BLOCK) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.notEqual(err,null);
               done();
          });
     });
});
