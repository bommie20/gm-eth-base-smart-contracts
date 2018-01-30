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

var goldFiatFeeContractAddress;
var goldFiatFeeContract;

var fiatContractAddress;
var fiatContract;
var fiatContractOld;

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

                         deployFiatFeeContract(data,function(err){
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
		// 64 bytes max (not symbols!)
          var ipfsLink = "1234567890123456789012345678901234567890123456789012345678901234";

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
		// 64 bytes max (not symbols!)
          var hash = "1234567890123456789012345678901234567890123456789012345678901234";

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
                    assert.equal(r[2],hash);
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

          // buyer -> buyer3
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

                    var goldmintFeeAccount = "12312312";
                    assert.equal(fiatContract.getUserFiatBalance(goldmintFeeAccount),3);

                    // GOLD balance should be increased
                    var balance = goldContract.balanceOf(buyer3);
                    // 97% will be = 1940000000000000 GOLD
                    assert.equal(balance, (((100 * 1000000000000000000) / centsPerGold) * 97) / 100)

                    var r = fiatContract.getRequest(2);
                    assert.equal(r[0],buyer3);
                    assert.equal(r[1],"xxx");
                    assert.equal(r[4],1);    // state

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
                    // total bought was 900 - 3%
                    assert.equal(balance, ((900 * 1000000000000000000 / centsPerGold) * 97) / 100 );

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

                    var wasBeforeSell = ((900 * 1000000000000000000 / centsPerGold) * 97) / 100;
                    var sell = (100 * 1000000000000000000 / centsPerGold);
                    var shouldBe = wasBeforeSell - sell;

                    assert.equal(balance, shouldBe);

                    done();
               }
          );
     });
});

describe('Fiat 2 - change the controller', function() {
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

                              deployFiatFeeContract(data,function(err){
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
     
     it('should change the controller',function(done){
		var storageAddressWas = fiatContract.myStorage();
		console.log('EXISTING STORAGE ADDRESS: ');
		console.log(storageAddressWas);

		var file = './contracts/FiatTables.sol';
		var contractName = ':FiatTables';

		fs.readFile(file, function(err, result){
			assert.equal(err,null);

			var source = result.toString();
			assert.notEqual(source.length,0);

			assert.equal(err,null);

			var output = solc.compile(source, 0); // 1 activates the optimiser

			var abi = JSON.parse(output.contracts[contractName].interface);
			var bytecode = output.contracts[contractName].bytecode;
			var tempContract = web3.eth.contract(abi);

			var alreadyCalled = false;

			tempContract.new(
                    mntContractAddress,
				goldContractAddress,
				storageAddressWas,		// use old storage with new controller!
                    goldFiatFeeContractAddress,
				{
					from: creator, 
					// should not exceed 5000000 for Kovan by default
					gas: 5995000,
					//gasPrice: 120000000000,
					data: '0x' + bytecode
				}, 
				function(err, c){
					assert.equal(err, null);

					console.log('TX HASH: ');
					console.log(c.transactionHash);

					// TX can be processed in 1 minute or in 30 minutes...
					// So we can not be sure on this -> result can be null.
					web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
						//console.log('RESULT: ');
						//console.log(result);

						assert.equal(err, null);
						assert.notEqual(result, null);

						if(!alreadyCalled){
							alreadyCalled = true;

							assert.notEqual(fiatContractAddress, result.contractAddress);
							// save old 
							fiatContractOld = web3.eth.contract(abi).at(fiatContractAddress);

							fiatContractAddress = result.contractAddress;
							fiatContract = web3.eth.contract(abi).at(fiatContractAddress);

							done();
						}
					});
				});
		});
     });

     it('should get doc 1 from old storage',function(done){
          assert.equal(fiatContract.getDocCount(),1);

          var ipfsLink = "123";
		var s = fiatContract.getDoc(0);
		assert.equal(s,ipfsLink);

		done();
     });

     it('should not add doc 2 to new controller',function(done){
          var ipfsLink = "999";
          fiatContract.addDoc(
               ipfsLink,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    assert.equal(fiatContract.getDocCount(),1);
                    done();
               }
          );
     });

	it('should set new controller address to storage',function(done){
		// call old fiatContract 
          fiatContractOld.changeController(
			// new controller
               fiatContractAddress,
               {
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
                    assert.equal(fiatContract.getDocCount(),1);

                    done();
               }
          );

	});

     it('should add doc 2 to new controller',function(done){
          var ipfsLink = "999";
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
});
