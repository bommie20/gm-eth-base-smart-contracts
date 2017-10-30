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

     it('should not set migration address if not creator',function(done){
          goldContract.setMigrationContractAddress(
               migrationContractAddress,
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
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

     it('should return reward 0', function(done){
          var out = migrationContract.calculateMyRewardMax(buyer); 
          assert.equal(out,0);
          var out2= migrationContract.calculateMyReward(out);
          assert.equal(out2,0);

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

     it('should not emit GOLD if not creator',function(done){
          var balance = goldContract.balanceOf(buyer);
          assert.equal(balance,0);

          var amount = 100000;
          var params = {from: buyer, gas: 2900000};
          goldContract.issueTokens(buyer, amount, params, (err,res)=>{
               assert.notEqual(err, null);
               done();
          });
     });

     it('should emit some GOLD tokens to buyer',function(done){
          var balance = goldContract.balanceOf(buyer);
          assert.equal(balance,0);

          var amount = 100000;
          var params = {from: creator, gas: 2900000};
          goldContract.issueTokens(buyer, amount, params, (err,res)=>{
               assert.equal(err, null);

               var balance = goldContract.balanceOf(buyer);
               assert.equal(balance,100000);

               done();
          });
     });

     it('should transfer GOLD tokens to get some reward',function(done){
          assert.notEqual(goldContract.migrationAddress(),0);

          var balance1 = goldContract.balanceOf(buyer2);
          assert.equal(balance1,0);

          var amount = 100000;

          // GOLD: buyer -> buyer2
          var params = {from: buyer, gas: 2900000};
          goldContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.equal(err, null);

               var balance = goldContract.balanceOf(buyer);
               assert.equal(balance,0);

               var mntpBalance = mntContract.balanceOf(buyer);
               var fee = goldContract.calculateFee(mntpBalance,amount);
               assert.equal(fee,1000);  // 1% 

               balance1 = goldContract.balanceOf(buyer2);
               assert.equal(balance1,100000 - fee);

               // fees are collected
               var balanceRewards = goldContract.balanceOf(migrationContractAddress);
               assert.equal(balanceRewards.toString(10),fee.toString(10));

               done();
          });
     });

     it('should return zero reward because migration is not started', function(done){
          var out = migrationContract.calculateMyRewardMax(buyer); 
          assert.equal(out,0);
          var out2= migrationContract.calculateMyReward(out);
          assert.equal(out2,0);

          done();
     })

     it('should not start the migration if not creator',function(done){
          migrationContract.startMigration(
               {
                    from: buyer,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should not migrate if not migrations is not started',function(done){
          var grapheneAddress = '224238729837489237482374892734897234897';

          migrationContract.migrateMntp(
               grapheneAddress,
               {
                    from: creator,           
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should not finish the migration if not started',function(done){
          migrationContract.finishMigration(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should start the migration',function(done){
          migrationContract.startMigration(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    assert.notEqual(migrationContract.migrationRewardTotal(),0);
                    assert.notEqual(migrationContract.migrationStartedTime(),0);
                    assert.equal(mntContract.totalSupply(),1000);

                    done();
               }
          );
     });

     it('should return non-zero reward', function(done){
          var out = migrationContract.calculateMyRewardMax(buyer); 

          // 100% of rewards
          var balanceRewards = goldContract.balanceOf(migrationContractAddress);
          assert.equal(out.toString(10),balanceRewards.toString(10));

          var out2 = migrationContract.calculateMyReward(out);
          assert.equal(out2.toString(10),balanceRewards.toString(10));

          done();
     })

     it('should emit some GOLD tokens to buyer3 and rewards should not be changed',function(done){
          var balance = goldContract.balanceOf(buyer3);
          assert.equal(balance,0);

          var amount = 200000;
          var params = {from: creator, gas: 2900000};
          goldContract.issueTokens(buyer3, amount, params, (err,res)=>{
               assert.equal(err, null);

               var balance = goldContract.balanceOf(buyer3);
               assert.equal(balance,200000);

               // rewards should not be changed - 100% of rewards
               var out = migrationContract.calculateMyRewardMax(buyer); 
               var balanceRewards = goldContract.balanceOf(migrationContractAddress);
               assert.equal(out.toString(10),balanceRewards.toString(10));

               var out2 = migrationContract.calculateMyReward(out);
               assert.equal(out2.toString(10),balanceRewards.toString(10));

               done();
          });
     });

     it('should transfer reward to goldmint team',function(done){
          var amount = 200000;
          
          var prevBalance = goldContract.balanceOf(buyer2);
          var prevFees = goldContract.balanceOf(migrationContractAddress); 

          // GOLD: buyer3 -> buyer2
          var params = {from: buyer3, gas: 2900000};
          goldContract.transfer(buyer2, amount, params, (err,res)=>{
               assert.equal(err, null);

               var balance = goldContract.balanceOf(buyer3);
               assert.equal(balance,0);

               // should update the balance
               var balanceNew = goldContract.balanceOf(buyer2);

               var mntpBalance = mntContract.balanceOf(buyer3);
               var fee = goldContract.calculateFee(mntpBalance, amount);
               var one = new BigNumber(amount);
               var two = new BigNumber(fee);
               var shouldBe = prevBalance.plus(one).minus(two); 

               assert.equal(balanceNew.toString(10),shouldBe.toString(10));

               // fees should not be updated!
               var balanceRewards = goldContract.balanceOf(migrationContractAddress);
               assert.equal(balanceRewards.toString(10),prevFees.toString(10));

               // goldmint team should get the reward
               var teamAmount = goldContract.balanceOf(goldmintTeamAddress);
               assert.equal(teamAmount.toString(10),fee.toString(10));

               done();
          });
     });

     // Now migrate MNTP tokens
     it('should migrate MNTP tokens',function(done){
          var grapheneAddress = '224238729837489237482374892734897234897';

          var myGoldBalance = goldContract.balanceOf(buyer2);
          var migrationBalance = goldContract.balanceOf(migrationContractAddress);

          migrationContract.migrateMntp(
               grapheneAddress,
               {
                    from: buyer2,           
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    var out = migrationContract.calculateMyRewardMax(buyer2); 
                    var out2= migrationContract.calculateMyReward(out); 

                    // should get my migration rewards
                    var shouldBe = myGoldBalance.plus(out2); 

                    var myNewGoldBalance = goldContract.balanceOf(buyer2);
                    assert.equal(myNewGoldBalance.toString(10),shouldBe.toString(10));

                    // rewards should be decreased
                    shouldBe = migrationBalance.minus(out2); 
                    var newMigrateBalance = goldContract.balanceOf(migrationContractAddress);
                    assert.equal(newMigrateBalance.toString(10),shouldBe.toString(10));

                    done();
               }
          );
     });

     it('should not migrate MNTP tokens again',function(done){
          var grapheneAddress = '224238729837489237482374892734897234897';

          migrationContract.migrateMntp(
               grapheneAddress,
               {
                    from: buyer2,           
                    gas: 2900000 
               },function(err,result){
                    // TODO
                    assert.notEqual(err,null);

                    done();
               }
          );
     });

     // finish the migration
     it('should finish the migration ',function(done){
          migrationContract.finishMigration(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

     // TODO: test, still can migrate


});

describe('Migrations 2 - calculate fees', function() {
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

     // migration still not started
     // migration still not finished
     it('should calculate correct fees',function(done){
          var mntpBalance = 0;
          var amount = 1000;
          var fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 10);   // 1%

          // 2
          mntpBalance = 0;
          amount = 100000000;
          fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 1000000);   // 1%

          // 3 - i own 10 MNTP tokens
          mntpBalance = 10 * 1000000000000000000;
          amount = 100000000;
          fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 333333);   // 0.3333%

          // 4 - i own 1000 MNTP tokens
          mntpBalance = 1000 * 1000000000000000000;
          amount = 100000000;
          fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 33333);   // 0.03333%

          done();
     });

     it('should not finish the migration if not started',function(done){
          migrationContract.finishMigration(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should start the migration',function(done){
          migrationContract.startMigration(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

     it('should finish the migration',function(done){
          migrationContract.finishMigration(
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    done();
               }
          );
     });

     // migration finished
     it('should calculate correct fees',function(done){
          var mntpBalance = 0;
          var amount = 1000;
          var fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 10);   // 1%

          // 2
          mntpBalance = 0;
          amount = 100000000;
          fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 1000000);   // 1%

          // 3 - i own 10 MNTP tokens
          mntpBalance = 10 * 1000000000000000000;
          amount = 100000000;
          fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 1000000);   // 1%

          // 4 - i own 1000 MNTP tokens
          mntpBalance = 1000 * 1000000000000000000;
          amount = 100000000;
          fee = goldContract.calculateFee(mntpBalance,amount);
          assert.equal(fee, 1000000);   // 1%

          done();
     });
});

describe('Migrations 3 - calculate rewards', function() {
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

     it('should calculate rewards',function(done){
          // day 1
          var input = 1000;
          var out = migrationContract.calculateMyRewardDecreased(0, input);
          assert.equal(out,1000);

          // day 365
          out = migrationContract.calculateMyRewardDecreased(366, input);
          assert.equal(out,0);

          // day 2
          out = migrationContract.calculateMyRewardDecreased(1, input);
          assert.equal(out,997);

          // day 3 
          out = migrationContract.calculateMyRewardDecreased(2, input);
          assert.equal(out,994);

          // day 4 
          out = migrationContract.calculateMyRewardDecreased(3, input);
          assert.equal(out,991);

          // day 5 
          out = migrationContract.calculateMyRewardDecreased(4, input);
          assert.equal(out,989);

          // day 6 
          var input2 = 1000 * 1000000000000000000;
          out = migrationContract.calculateMyRewardDecreased(5, input2);
          assert.equal(out,986301369870000000000);

          // day 101
          var input2 = 1000 * 1000000000000000000;
          out = migrationContract.calculateMyRewardDecreased(100, input2);
          assert.equal(out,726027397270000000000);

          done();
     });

});