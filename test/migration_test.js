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

var initialBalanceCreator = 0;

var mntContractAddress;
var mntContract;

var goldContractAddress;
var goldContract;

var migrationContractAddress;
var migrationContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

describe('Migrations 1', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               buyer = accounts[1];

               done();
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

                    deployMigrationContract(data,function(err){
                         assert.equal(err,null);

                         done();
                    });
               });
          });
     });

     it('should return reward 0', function(done){
          var out = migrationContract.calculateMyRewardMax(creator); 
          assert.equal(out,0);

          done();
     })

     it('should set ico contract address',function(done){
          // set myself
          mntContract.setIcoContractAddress(
               creator,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    done();
               }
          );
     });

     it('should issue some MNTP tokens', function(done){
          var params = {from: creator, gas: 2900000};

          mntContract.issueTokens(buyer, 1000, params, (err,res)=>{
               assert.equal(err, null);

               var balance = mntContract.balanceOf(buyer);
               assert.equal(balance,1000);

               done();
          });
     });

     it('should return reward', function(done){
          var out = migrationContract.calculateMyRewardMax(buyer); 
          assert.equal(out,0);

          done();
     })
});
