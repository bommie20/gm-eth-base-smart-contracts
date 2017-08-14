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

eval(fs.readFileSync('./test/helpers/misc.js')+'');

// If ETH_PRICE_IN_USD or STD_PRICE_USD_PER_1000_TOKENS or discountPercents table changes ->
// these test will fail...
describe('Contracts 1 - prices tests', function() {
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
               foundersRewardAccount = accounts[4];
               unsoldTokensReward = accounts[5];
               tokenManager = accounts[6];

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

     it('should get initial price', function(done){
          var icoTokensSold = goldmintContract.icoTokensSold();
          assert.equal(icoTokensSold,0);

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,53571428571428571428);

               done();
          });
     });

     it('should get second bucket price', function(done){
          var icoTokensSold = 700001 * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,50420168067226890756);

               done();
          });
     });

     it('should get third bucket price', function(done){
          var icoTokensSold = ((2 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,47619047619047619047);

               done();
          });
     });

     it('should get fourth bucket price', function(done){
          var icoTokensSold = ((3 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,46583850931677018633);

               done();
          });
     });

     it('should get fifth bucket price', function(done){
          var icoTokensSold = ((4 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,45592705167173252279);

               done();
          });
     });

     it('should get sixth bucket price', function(done){
          var icoTokensSold = ((5 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,44642857142857142857);

               done();
          });
     });

     it('should get seventh bucket price', function(done){
          var icoTokensSold = ((6 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,43731778425655976676);

               done();
          });
     });

     it('should get eight bucket price', function(done){
          var icoTokensSold = ((7 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,42857142857142857142);

               done();
          });
     });

     it('should get nineth bucket price', function(done){
          var icoTokensSold = ((8 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,42857142857142857142);

               done();
          });
     });

     it('should get tenth bucket price', function(done){
          var icoTokensSold = ((9 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.equal(err,null);
               assert.equal(res,42857142857142857142);

               done();
          });
     });

     it('should not get eleventh bucket price', function(done){
          var icoTokensSold = ((10 * 700000) + 1) * 1000000000000000000;

          goldmintContract.getMntTokensPerEth(icoTokensSold,(err,res)=>{
               assert.notEqual(err,null);
               done();
          });
     });
});
