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
var creator2;
var buyer;

var initialBalanceCreator = 0;

var goldContractAddress;
var goldContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

describe('Contracts 5 - GOLD token holder', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               creator2 = accounts[1];
               buyer = accounts[2];

               deployGoldContract(null,function(err){
                    done();
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy token contract',function(done){

          done();
     });

     it('should not set creator if from bad account', function(done){
          goldContract.creator((err,res)=>{
               assert.equal(err,null);
               assert.equal(res,creator);

               var params = {from: buyer, gas: 2900000};
               goldContract.setCreator(creator2, params, (err,res)=>{
                    assert.notEqual(err,null);

                    goldContract.creator((err,res)=>{
                         assert.equal(err,null);
                         assert.equal(res,creator);
                         done();
                    });
               });
          });
     });

     it('should set creator', function(done){
          var params = {from: creator, gas: 2900000};
          goldContract.setCreator(creator2, params, (err,res)=>{
               assert.equal(err,null);

               goldContract.creator((err,res)=>{
                    assert.equal(err,null);
                    assert.equal(res,creator2);
                    done();
               });
          });
     });

     it('should return 0 for total supply', function(done){
          var params = {from: creator2, gas: 2900000};

          goldContract.totalSupply((err,res)=>{
               assert.equal(err, null);
               assert.equal(res.toString(10), 0);
               done();                              
          })
     });

     it('should not issue tokens externally if locked', function(done){
          var params = {from: creator2, gas: 2900000};
          goldContract.issueTokens(buyer, 1000, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should unlock', function(done){
          var params = {from: creator2, gas: 2900000};

          goldContract.lockContract(false,params,(err,res)=>{
               assert.equal(err, null);
               done();                              
          });
     });

     // 
     it('should issue tokens', function(done){
          var params = {from: creator2, gas: 2900000};
          goldContract.issueTokens(buyer, 1000, params, (err,res)=>{
               assert.equal(err, null);

               var balance = goldContract.balanceOf(buyer);
               assert.equal(balance,1000);

               goldContract.totalSupply((err,res)=>{
                    assert.equal(err, null);
                    assert.equal(res.toString(10), 1000);

                    done();                              
               });
          });
     });
})


