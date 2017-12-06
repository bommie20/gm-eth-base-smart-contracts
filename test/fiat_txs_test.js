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
var buyer3;

var goldmintTeamAddress;

var initialBalanceCreator = 0;

var mntContractAddress;
var mntContract;

var goldFeeContractAddress;
var goldFeeContract;

var goldContractAddress;
var goldContract;

var migrationContractAddress;
var migrationContract;

eval(fs.readFileSync('./test/helpers/misc.js')+'');

describe('Fiat 1', function() {
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
               buyer3 = accounts[3];
               goldmintTeamAddress = accounts[4];

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
               
               deployGoldFeeContract(data,function(err){
                    assert.equal(err,null);

                    // same as deplyGold2Contract but deploys 
                    // Gold from GoldmintDAO.sol file
                    deployGold2Contract(data,function(err){
                         assert.equal(err,null);

                         deployMigrationContract(data,function(err){
                              assert.equal(err,null);

                              done();
                         });
                    });
               });
          });
     });

     it('should set migration address',function(done){
          goldContract.setMigrationContractAddress(
               migrationContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

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

     it('should not add doc',function(done){
          assert.equal(migrationContract.getDocCount(),0);

          var ipfsLink = "123";
          migrationContract.addDoc(
               ipfsLink,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should add doc 1',function(done){
          assert.equal(migrationContract.getDocCount(),0);

          var ipfsLink = "123";
          migrationContract.addDoc(
               ipfsLink,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(migrationContract.getDocCount(),1);

                    var s = migrationContract.getDoc(0);
                    assert.equal(s,ipfsLink);

                    done();
               }
          );
     });
     
     it('should add doc 2',function(done){
          var ipfsLink = "234";
          migrationContract.addDoc(
               ipfsLink,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(migrationContract.getDocCount(),2);

                    var s = migrationContract.getDoc(1);
                    assert.equal(s,ipfsLink);

                    done();
               }
          );
     });

     // 2 
     it('should not add fiat tx',function(done){
          var user = "anton";
          var amount = -300;

          migrationContract.addFiatTransaction(
               user,
               amount,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should add fiat tx',function(done){
          var user = "anton";

          assert.equal(migrationContract.getFiatTransactionsCount(user),0);
          assert.equal(migrationContract.getAllFiatTransactionsCount(),0);
          assert.equal(migrationContract.getUserFiatBalance(user),0);

          // $3 
          var amount = -300;

          migrationContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(migrationContract.getFiatTransactionsCount(user),1);
                    assert.equal(migrationContract.getAllFiatTransactionsCount(),1);
                    assert.equal(migrationContract.getUserFiatBalance(user),-300);

                    var amount2 = migrationContract.getFiatTransaction(user,0);
                    assert.equal(amount2,amount);

                    done();
               }
          );
     });

     it('should add fiat tx 2',function(done){
          var user = "kostya";

          assert.equal(migrationContract.getFiatTransactionsCount(user),0);
          assert.equal(migrationContract.getUserFiatBalance(user),0);

          // $5 
          var amount = 500;

          migrationContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(migrationContract.getFiatTransactionsCount(user),1);
                    assert.equal(migrationContract.getAllFiatTransactionsCount(),2);
                    assert.equal(migrationContract.getUserFiatBalance(user),500);

                    var amount2 = migrationContract.getFiatTransaction(user,0);
                    assert.equal(amount2,amount);

                    done();
               }
          );
     });

     it('should add fiat tx 3',function(done){
          var user = "kostya";

          // $9 
          var amount = -900;

          migrationContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(migrationContract.getFiatTransactionsCount(user),2);
                    assert.equal(migrationContract.getAllFiatTransactionsCount(),3);
                    assert.equal(migrationContract.getUserFiatBalance(user),-400);

                    var amount2 = migrationContract.getFiatTransaction(user,1);
                    assert.equal(amount2,amount);

                    done();
               }
          );
     });
});

