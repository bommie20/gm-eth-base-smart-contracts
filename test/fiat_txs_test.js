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

var fiatContractAddress;
var fiatContract;

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

                              deployFiatContract(data,function(err){
                                   assert.equal(err,null);

                                   done();
                              });
                         });
                    });
               });
          });
     });

     it('should set migration address',function(done){
          goldContract.setControllerContractAddress(
               fiatContractAddress,
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
          assert.equal(fiatContract.getDocCount(),0);

          var ipfsLink = "123";
          fiatContract.addDoc(
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
          assert.equal(fiatContract.getDocCount(),0);

          var ipfsLink = "123";
          fiatContract.addDoc(
               ipfsLink,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(fiatContract.getDocCount(),1);

                    var s = fiatContract.getDoc(0);
                    assert.equal(s,ipfsLink);

                    done();
               }
          );
     });
     
     it('should add doc 2',function(done){
          var ipfsLink = "234";
          fiatContract.addDoc(
               ipfsLink,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(fiatContract.getDocCount(),2);

                    var s = fiatContract.getDoc(1);
                    assert.equal(s,ipfsLink);

                    done();
               }
          );
     });

     // 2 
     it('should not add fiat tx',function(done){
          var user = "anton";
          var amount = -300;

          fiatContract.addFiatTransaction(
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

          assert.equal(fiatContract.getFiatTransactionsCount(user),0);
          assert.equal(fiatContract.getAllFiatTransactionsCount(),0);
          assert.equal(fiatContract.getUserFiatBalance(user),0);

          // $3 
          var amount = -300;

          fiatContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(fiatContract.getFiatTransactionsCount(user),1);
                    assert.equal(fiatContract.getAllFiatTransactionsCount(),1);
                    assert.equal(fiatContract.getUserFiatBalance(user),-300);

                    var amount2 = fiatContract.getFiatTransaction(user,0);
                    assert.equal(amount2,amount);

                    done();
               }
          );
     });

     it('should add fiat tx 2',function(done){
          var user = "kostya";

          assert.equal(fiatContract.getFiatTransactionsCount(user),0);
          assert.equal(fiatContract.getUserFiatBalance(user),0);

          // $5 
          var amount = 500;

          fiatContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(fiatContract.getFiatTransactionsCount(user),1);
                    assert.equal(fiatContract.getAllFiatTransactionsCount(),2);
                    assert.equal(fiatContract.getUserFiatBalance(user),500);

                    var amount2 = fiatContract.getFiatTransaction(user,0);
                    assert.equal(amount2,amount);

                    done();
               }
          );
     });

     it('should add fiat tx 3',function(done){
          var user = "kostya";

          // $9 
          var amount = -900;

          fiatContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.equal(fiatContract.getFiatTransactionsCount(user),2);
                    assert.equal(fiatContract.getAllFiatTransactionsCount(),3);
                    assert.equal(fiatContract.getUserFiatBalance(user),-400);

                    var amount2 = fiatContract.getFiatTransaction(user,1);
                    assert.equal(amount2,amount);

                    done();
               }
          );
     });

     it('should add buy tokens request',function(done){
          var user = "kostya";
          var hash = "1231321";

          assert.equal(fiatContract.getRequestsCount(),0);

          fiatContract.addBuyTokensRequest(
               user,
               hash,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    assert.equal(fiatContract.getRequestsCount(),1);

                    var r = fiatContract.getRequest(0);
                    assert.equal(r[0],buyer);
                    assert.equal(r[1],user);
                    assert.equal(r[4],0);    // state

                    done();
               }
          );
     });

     it('should not cancel if not admin',function(done){
          fiatContract.cancelRequest(
               0,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    assert.equal(fiatContract.getRequestsCount(),1);

                    done();
               }
          );
     });

     it('should cancel request by admin',function(done){
          fiatContract.cancelRequest(
               0,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    assert.equal(fiatContract.getRequestsCount(),1);

                    var r = fiatContract.getRequest(0);
                    assert.equal(r[4],2);

                    done();
               }
          );
     });

     it('should not process cancelled request',function(done){
          var amountCents = 100;

          // 1 GOLD - $500
          var centsPerGold = (500 * 100);
          
          fiatContract.processRequest(
               0,
               amountCents,
               centsPerGold,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should add buy tokens request 2',function(done){
          var user = "anton";
          var hash = "12334390";

          assert.equal(fiatContract.getRequestsCount(),1);

          fiatContract.addBuyTokensRequest(
               user,
               hash,
               {
                    from: buyer2,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    assert.equal(fiatContract.getRequestsCount(),2);

                    var r = fiatContract.getRequest(1);
                    assert.equal(r[0],buyer2);
                    assert.equal(r[1],user);
                    assert.equal(r[4],0);    // state

                    done();
               }
          );
     });

     it('should not process request if no fiat',function(done){
          var amountCents = 100;

          // 1 GOLD - $500
          var centsPerGold = (500 * 100);

          fiatContract.processRequest(
               1,
               amountCents,
               centsPerGold,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should add fiat tx 4',function(done){
          var user = "xxx"; 
          var amount = 900;        // $9 

          fiatContract.addFiatTransaction(
               user,
               amount,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

     it('should add buy tokens request',function(done){
          var user = "xxx";
          var hash = "1231231231231";

          fiatContract.addBuyTokensRequest(
               user,
               hash,
               {
                    from: buyer3,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    assert.equal(fiatContract.getRequestsCount(),3);

                    var r = fiatContract.getRequest(2);
                    assert.equal(r[0],buyer3);
                    assert.equal(r[1],user);
                    assert.equal(r[4],0);    // state

                    done();
               }
          );
     });

     it('should process request',function(done){
          var amountCents = 100;

          // 1 GOLD - $500
          var centsPerGold = (500 * 100);
          
          var balance = goldContract.balanceOf(buyer3);
          assert.equal(balance, 0);

          fiatContract.processRequest(
               2,
               amountCents,
               centsPerGold,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    // 900 - 100
                    var user = 'xxx';
                    assert.equal(fiatContract.getUserFiatBalance(user),800);

                    // GOLD balance should be increased
                    var balance = goldContract.balanceOf(buyer3);
                    assert.equal(balance, 100 * 1000000000000000000 / centsPerGold);

                    done();
               }
          );
     });

     it('should add buy tokens request 2',function(done){
          var user = "xxx";
          var hash = "1231231231232";

          fiatContract.addBuyTokensRequest(
               user,
               hash,
               {
                    from: buyer3,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

     it('should process request 2',function(done){
          // 800 left only
          var amountCents = 1000;

          // 1 GOLD - $500
          var centsPerGold = (500 * 100);

          fiatContract.processRequest(
               3,
               amountCents,
               centsPerGold,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    var user = 'xxx';
                    assert.equal(fiatContract.getUserFiatBalance(user),0);

                    // GOLD balance should be increased
                    var balance = goldContract.balanceOf(buyer3);
                    // total bought was 900
                    assert.equal(balance, 900 * 1000000000000000000 / centsPerGold);

                    done();
               }
          );
     });

     it('should add sell tokens request 3',function(done){
          var user = "xxx";
          var hash = "1231231231232";

          fiatContract.addSellTokensRequest(
               user,
               hash,
               {
                    from: buyer3,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

     it('should process request 3',function(done){
          // sell $100 worth of tokens 
          var amountCents = 100;

          // 1 GOLD - $500
          var centsPerGold = (500 * 100);

          fiatContract.processRequest(
               4,
               amountCents,
               centsPerGold,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    // should be increased
                    var user = 'xxx';
                    assert.equal(fiatContract.getUserFiatBalance(user),100);

                    // GOLD balance should be decreased  
                    var balance = goldContract.balanceOf(buyer3);
                    assert.equal(balance, 800 * 1000000000000000000 / centsPerGold);

                    done();
               }
          );
     });
});

