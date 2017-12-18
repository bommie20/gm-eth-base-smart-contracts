pragma solidity ^0.4.16;

contract SafeMath {
     function safeMul(uint a, uint b) internal returns (uint) {
          uint c = a * b;
          assert(a == 0 || c / a == b);
          return c;
     }

     function safeSub(uint a, uint b) internal returns (uint) {
          assert(b <= a);
          return a - b;
     }

     function safeAdd(uint a, uint b) internal returns (uint) {
          uint c = a + b;
          assert(c>=a && c>=b);
          return c;
     }
}

contract CreatorEnabled {
     address public creator = 0x0;

     modifier onlyCreator() { require(msg.sender==creator); _; }

     function changeCreator(address _to) public onlyCreator {
          creator = _to;
     }
}

// ERC20 standard
contract StdToken is SafeMath {
// Fields:
     mapping(address => uint256) balances;
     mapping (address => mapping (address => uint256)) allowed;
     uint public totalSupply = 0;

// Events:
     event Transfer(address indexed _from, address indexed _to, uint256 _value);
     event Approval(address indexed _owner, address indexed _spender, uint256 _value);

// Functions:
     function transfer(address _to, uint256 _value) onlyPayloadSize(2 * 32) returns(bool){
          balances[msg.sender] = safeSub(balances[msg.sender],_value);
          balances[_to] = safeAdd(balances[_to],_value);

          Transfer(msg.sender, _to, _value);
          return true;
     }

     function transferFrom(address _from, address _to, uint256 _value) returns(bool){
          balances[_to] = safeAdd(balances[_to],_value);
          balances[_from] = safeSub(balances[_from],_value);
          allowed[_from][msg.sender] = safeSub(allowed[_from][msg.sender],_value);

          Transfer(_from, _to, _value);
          return true;
     }

     function balanceOf(address _owner) constant returns (uint256) {
          return balances[_owner];
     }

     function approve(address _spender, uint256 _value) returns (bool) {
          // To change the approve amount you first have to reduce the addresses`
          //  allowance to zero by calling `approve(_spender, 0)` if it is not
          //  already 0 to mitigate the race condition described here:
          //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
          require((_value == 0) || (allowed[msg.sender][_spender] == 0));

          allowed[msg.sender][_spender] = _value;
          Approval(msg.sender, _spender, _value);
          return true;
     }

     function allowance(address _owner, address _spender) constant returns (uint256) {
          return allowed[_owner][_spender];
     }

     modifier onlyPayloadSize(uint _size) {
          require(msg.data.length >= _size + 4);
          _;
     }
}

contract GoldFee is CreatorEnabled {
// Functions: 
     function GoldFee(){
          creator = msg.sender;
     }

     function getMin(uint out)returns (uint){
          // 0.002 GOLD is min fee
          uint minFee = (2 * 1 ether) / 1000;
          if(out<minFee){
               return minFee;
          }
          return out;
     }

     function getMax(uint out)returns (uint){
          // 0.02 GOLD is max fee
          uint maxFee = (2 * 1 ether) / 100;
          if(out>=maxFee){
               return maxFee;
          }
          return out;
     }

     function calculateFee(
          bool _isMigrationStarted, bool _isMigrationFinished, 
          uint _mntpBalance, uint _value) public constant returns(uint) 
     {
          // When migration process is finished (1 year from Graphene launch), then transaction fee is 1% GOLD.
          if(_isMigrationFinished){
               return (_value / 100); 
          }

          // If the sender holds 0 MNTP, then the transaction fee is 1% GOLD.

          // If the sender holds at least 10 MNTP, then the transaction fee is 0.333333% GOLD, 
          // but not less than 0.002 MNTP

          // If the sender holds at least 1000 MNTP, then the transaction fee is 0.033333% GOLD,
          // but not less than 0.002 MNTP

          // If the sender holds at least 10000 MNTP, then the transaction fee is 0.0333333% GOLD,
          // but not more than 0.02 MNTP
          if(_mntpBalance>=(10000 * 1 ether)){
               return getMax((_value / 100) / 30);
          }
          if(_mntpBalance>=(1000 * 1 ether)){
               return getMin((_value / 100) / 30);
          }
          if(_mntpBalance>=(10 * 1 ether)){
               return getMin((_value / 100) / 3);
          }
          
          // 1%
          return getMin(_value / 100);
     }
}

contract Gold is StdToken, CreatorEnabled {
// Fields:
     string public constant name = "Goldmint GOLD Token";
     string public constant symbol = "GOLD";
     uint public constant decimals = 18;

     // this is used to send fees (that is then distributed as rewards)
     address public migrationAddress = 0x0;
     address public controllerAddress = 0x0;

     address public goldmintTeamAddress = 0x0;
     MNTP_Interface public mntpToken;
     GoldFee public goldFee;

     bool public lockTransfers = false;
     bool public migrationStarted = false;
     bool public migrationFinished = false;

     bool public controllerSet = false;
     bool public migrationSet = false;

// Modifiers:
     modifier onlyMigration() { require(msg.sender==migrationAddress); _; }
     modifier onlyMigrationOrController() { require(msg.sender==migrationAddress || msg.sender==controllerAddress); _; }
     modifier onlyCreatorOrController() { require(msg.sender==creator || msg.sender==controllerAddress); _; }
     modifier onlyIfUnlocked() { require(!lockTransfers); _; }

// Functions:
     function Gold(address _mntpContractAddress, address _goldmintTeamAddress, address _goldFeeAddress) public {
          creator = msg.sender;

          mntpToken = MNTP_Interface(_mntpContractAddress);
          goldmintTeamAddress = _goldmintTeamAddress; 
          goldFee = GoldFee(_goldFeeAddress);
     }

     function setControllerContractAddress(address _controllerAddress) public onlyCreator {
          require(false==controllerSet);
          controllerAddress = _controllerAddress;
          controllerSet = true;
     }

     function setMigrationContractAddress(address _migrationAddress) public onlyCreator {
          require(false==migrationSet);
          migrationAddress = _migrationAddress;
          migrationSet = true;
     }

     function setGoldmintTeamAddress(address _teamAddress) public onlyCreator {
          goldmintTeamAddress = _teamAddress;
     }

     function setGoldFeeAddress(address _goldFeeAddress) public onlyCreator {
          goldFee = GoldFee(_goldFeeAddress);
     }
     
     function issueTokens(address _who, uint _tokens) public onlyCreatorOrController {
          balances[_who] = safeAdd(balances[_who],_tokens);
          totalSupply = safeAdd(totalSupply,_tokens);

          Transfer(0x0, _who, _tokens);
     }

     function burnTokens(address _who, uint _tokens) public onlyMigrationOrController {
          balances[_who] = safeSub(balances[_who],_tokens);
          totalSupply = safeSub(totalSupply,_tokens);
     }

     // there is no way to revert that
     function startMigration() public onlyMigration {
          migrationStarted = true;
     }

     // there is no way to revert that
     function finishMigration() public onlyMigration {
          require(true==migrationStarted);

          migrationFinished = true;
     }

     function lockTransfer(bool _lock) public onlyMigration {
          lockTransfers = _lock;
     }

     function transfer(address _to, uint256 _value) public onlyIfUnlocked onlyPayloadSize(2 * 32) returns(bool){
          uint yourCurrentMntpBalance = mntpToken.balanceOf(msg.sender);

          // you can transfer if fee is ZERO 
          uint fee = goldFee.calculateFee(migrationStarted, migrationFinished, yourCurrentMntpBalance, _value);
          uint sendThis = _value;
          if(0!=fee){ 
               sendThis = safeSub(_value,fee);
          
               // 1.Transfer fee
               // A -> rewards account
               // 
               // Each GOLD token transfer should send transaction fee to
               // GoldmintMigration contract if Migration process is not started.
               // Goldmint team if Migration process is started.
               if(migrationStarted){
                    super.transfer(goldmintTeamAddress, fee);
               }else{
                    super.transfer(migrationAddress, fee);
               }
          }

          // 2.Transfer
          // A -> B
          return super.transfer(_to, sendThis);
     }

     function transferFrom(address _from, address _to, uint256 _value) public onlyIfUnlocked returns(bool){
          uint yourCurrentMntpBalance = mntpToken.balanceOf(_from);

          uint fee = goldFee.calculateFee(migrationStarted, migrationFinished, yourCurrentMntpBalance, _value);
          if(0!=fee){ 
               // 1.Transfer fee
               // A -> rewards account
               // 
               // Each GOLD token transfer should send transaction fee to
               // GoldmintMigration contract if Migration process is not started.
               // Goldmint team if Migration process is started.
               if(migrationStarted){
                    super.transferFrom(_from, goldmintTeamAddress, fee);
               }else{
                    super.transferFrom(_from, migrationAddress, fee);
               }
          }
          
          // 2.Transfer
          // A -> B
          uint sendThis = safeSub(_value,fee);
          return super.transferFrom(_from, _to, sendThis);
     }

     // Used to send rewards)
     function transferRewardWithoutFee(address _to, uint _value) public onlyMigration onlyPayloadSize(2*32) {
          balances[migrationAddress] = safeSub(balances[migrationAddress],_value);
          balances[_to] = safeAdd(balances[_to],_value);

          Transfer(migrationAddress, _to, _value);
     }

}

contract MNTP_Interface is StdToken {
// Additional methods that MNTP contract provides
     function lockTransfer(bool _lock);

     function burnTokens(address _who, uint _tokens);
}

contract GoldmintMigration is CreatorEnabled {
// Fields:
     MNTP_Interface public mntpToken;
     Gold public goldToken;

     enum State {
          Init,
          MigrationStarted,
          MigrationPaused,
          MigrationFinished
     }

     State public state = State.Init;
     
     // this is total collected GOLD rewards (launch to migration start)
     uint public mntpToMigrateTotal = 0;
     uint public migrationRewardTotal = 0;
     uint64 public migrationStartedTime = 0;
     uint64 public migrationFinishedTime = 0;

     struct Migration {
          address ethAddress;
          string grapheneAddress;
          uint tokensCount;
          bool migrated;
          uint64 date;
          string comment;
     }
     mapping (uint=>Migration) public mntpMigrations;
     mapping (address=>uint) public mntpMigrationIndexes;
     uint public mntpMigrationsCount = 0;

     mapping (uint=>Migration) public goldMigrations;
     mapping (address=>uint) public goldMigrationIndexes;
     uint public goldMigrationsCount = 0;

     event MntpMigrateWanted(address _ethAddress, string _grapheneAddress, uint256 _value);
     event MntpMigrated(address _ethAddress, string _grapheneAddress, uint256 _value);

     event GoldMigrateWanted(address _ethAddress, string _grapheneAddress, uint256 _value);
     event GoldMigrated(address _ethAddress, string _grapheneAddress, uint256 _value);

// Access methods
     function getMntpMigration(uint index) public constant returns(address,string,uint,bool,uint64,string){
          Migration memory mig = mntpMigrations[index];
          return (mig.ethAddress, mig.grapheneAddress, mig.tokensCount, mig.migrated, mig.date, mig.comment);
     }

     function getGoldMigration(uint index) public constant returns(address,string,uint,bool,uint64,string){
          Migration memory mig = goldMigrations[index];
          return (mig.ethAddress, mig.grapheneAddress, mig.tokensCount, mig.migrated, mig.date, mig.comment);
     }

// Functions:
     // Constructor
     function GoldmintMigration(address _mntpContractAddress, address _goldContractAddress) public {
          creator = msg.sender;

          require(_mntpContractAddress!=0);
          require(_goldContractAddress!=0);

          mntpToken = MNTP_Interface(_mntpContractAddress);
          goldToken = Gold(_goldContractAddress);
     }

     function lockMntpTransfers(bool _lock) public onlyCreator {
          mntpToken.lockTransfer(_lock);
     }

     function lockGoldTransfers(bool _lock) public onlyCreator {
          goldToken.lockTransfer(_lock);
     }

     // This method is called when migration to Goldmint's blockchain
     // process is started...
     function startMigration() public onlyCreator {
          require((State.Init==state) || (State.MigrationPaused==state));

          if(State.Init==state){
               // 1 - change fees
               goldToken.startMigration();
               
               // 2 - store the current values 
               migrationRewardTotal = goldToken.balanceOf(this);
               migrationStartedTime = uint64(now);
               mntpToMigrateTotal = mntpToken.totalSupply();
          }

          state = State.MigrationStarted;
     }

     function pauseMigration() public onlyCreator {
          require((state==State.MigrationStarted) || (state==State.MigrationFinished));

          state = State.MigrationPaused;
     }

     // that doesn't mean that you cant migrate from Ethereum -> Graphene
     // that means that you will get no reward
     function finishMigration() public onlyCreator {
          require((State.MigrationStarted==state) || (State.MigrationPaused==state));

          if(State.MigrationStarted==state){
               goldToken.finishMigration();
               migrationFinishedTime = uint64(now);
          }

          state = State.MigrationFinished;
     }

     function destroyMe() public onlyCreator {
          selfdestruct(msg.sender);          
     }

// MNTP
     // Call this to migrate your MNTP tokens to Graphene MNT
     // (this is one-way only)
     // _grapheneAddress is something like that - "BTS7yRXCkBjKxho57RCbqYE3nEiprWXXESw3Hxs5CKRnft8x7mdGi"
     //
     // !!! WARNING: will not allow anyone to migrate tokens partly
     // !!! DISCLAIMER: check graphene address format. You will not be able to change that!
     function migrateMntp(string _grapheneAddress) public {
          require((state==State.MigrationStarted) || (state==State.MigrationFinished));

          // 1 - calculate current reward
          uint myBalance = mntpToken.balanceOf(msg.sender);
          require(0!=myBalance);

          uint myRewardMax = calculateMyRewardMax(msg.sender);        
          uint myReward = calculateMyReward(myRewardMax);

          // 2 - pay the reward to our user
          goldToken.transferRewardWithoutFee(msg.sender, myReward);

          // 3 - burn tokens 
          // WARNING: burn will reduce totalSupply
          // 
          // WARNING: creator must call 
          // setIcoContractAddress(migrationContractAddress)
          // of the mntpToken
          mntpToken.burnTokens(msg.sender,myBalance);

          // save tuple 
          Migration memory mig;
          mig.ethAddress = msg.sender;
          mig.grapheneAddress = _grapheneAddress;
          mig.tokensCount = myBalance;
          mig.migrated = false;
          mig.date = uint64(now);
          mig.comment = '';

          mntpMigrations[mntpMigrationsCount] = mig;
          mntpMigrationIndexes[msg.sender] = mntpMigrationsCount;
          mntpMigrationsCount++;

          // send an event
          MntpMigrateWanted(msg.sender, _grapheneAddress, myBalance);
     }

     function isMntpMigrated(address _who) public constant returns(bool){
          uint index = mntpMigrationIndexes[_who];
          Migration memory mig = mntpMigrations[index];
          return mig.migrated;
     }

     function setMntpMigrated(address _who, bool _isMigrated, string _comment) public onlyCreator { 
          uint index = mntpMigrationIndexes[_who];
          mntpMigrations[index].migrated = _isMigrated; 
          mntpMigrations[index].comment = _comment; 

          // send an event
          if(_isMigrated){
               MntpMigrated(  mntpMigrations[index].ethAddress, 
                              mntpMigrations[index].grapheneAddress, 
                              mntpMigrations[index].tokensCount);
          }
     }

// GOLD
     function migrateGold(string _grapheneAddress) public {
          require((state==State.MigrationStarted) || (state==State.MigrationFinished));

          // 1 - get balance
          uint myBalance = goldToken.balanceOf(msg.sender);
          require(0!=myBalance);

          // 2 - burn tokens 
          // WARNING: burn will reduce totalSupply
          // 
          goldToken.burnTokens(msg.sender,myBalance);

          // save tuple 
          Migration memory mig;
          mig.ethAddress = msg.sender;
          mig.grapheneAddress = _grapheneAddress;
          mig.tokensCount = myBalance;
          mig.migrated = false;
          mig.date = uint64(now);
          mig.comment = '';

          goldMigrations[goldMigrationsCount] = mig;
          goldMigrationIndexes[msg.sender] = goldMigrationsCount;
          goldMigrationsCount++;

          // send an event
          GoldMigrateWanted(msg.sender, _grapheneAddress, myBalance);
     }

     // Each MNTP token holder gets a GOLD reward as a percent of all rewards
     // proportional to his MNTP token stake
     function calculateMyRewardMax(address _of) public constant returns(uint){
          if(0==mntpToMigrateTotal){
               return 0;
          }

          uint myCurrentMntpBalance = mntpToken.balanceOf(_of);
          if(0==myCurrentMntpBalance){
               return 0;
          }

          return migrationRewardTotal * (myCurrentMntpBalance / mntpToMigrateTotal);
     }

     // Migration rewards decreased linearly. 
     // 
     // The formula is: rewardPercents = max(100 - 100 * day / 365, 0)
     //
     // On 1st day of migration, you will get: 100 - 100 * 0/365 = 100% of your rewards
     // On 2nd day of migration, you will get: 100 - 100 * 1/365 = 99.7261% of your rewards
     // On 365th day of migration, you will get: 100 - 100 * 364/365 = 0.274%
     function calculateMyRewardDecreased(uint _day, uint _myRewardMax) public constant returns(uint){
          if(_day>=365){
               return 0;
          }

          uint x = ((100 * 1000000000 * _day) / 365);
          return (_myRewardMax * ((100 * 1000000000) - x)) / (100 * 1000000000);
     }
     
     function calculateMyReward(uint _myRewardMax) public constant returns(uint){
          // day starts from 0
          uint day = (uint64(now) - migrationStartedTime) / uint64(1 days);  
          return calculateMyRewardDecreased(day, _myRewardMax);
     }

/////////

     // do not allow to send money to this contract...
     function() public payable{
          revert();
     }
}

contract FiatTables is CreatorEnabled, SafeMath {
// Fields - 1
     Gold public goldToken;
     mapping(uint => string) docs;
     uint docCount = 0;

// Fields - 2 
     mapping(string => mapping(uint => int)) fiatTxs;
     mapping(string => int) fiatBalancesCents;
     mapping(string => uint) fiatCounts;
     uint fiatTotal = 0;

// Fields - 3 
     struct Request {
          address sender;
          string userId;
          string requestHash;
          bool buyRequest;         // otherwise - sell

          // 0 - init
          // 1 - processed
          // 2 - cancelled
          uint8 state;
     }
     mapping (uint=>Request) requests;
     uint public requestsCount = 0;

////////////////////
     event NewTokenBuyRequest(address indexed _from, string indexed _userId);
     event NewTokenSellRequest(address indexed _from, string indexed _userId);
     event RequestProcessed(uint indexed _reqId);
     event RequestCancelled(uint indexed _reqId);

     function FiatTables(address _goldContractAddress) {
          creator = msg.sender;
          goldToken = Gold(_goldContractAddress);
     }

// 1
     function addDoc(string _ipfsDocLink) public onlyCreator returns(uint){
          docs[docCount] = _ipfsDocLink;
          uint out = docCount;
          docCount++;

          return out;
     }

     function getDocCount() public constant returns (uint){
          return docCount; 
     }

     function getDoc(uint _index) public constant returns (string){
          require(_index < docCount);
          return docs[_index];
     }

// 2
     // _amountCents can be negative
     // returns index in user array
     function addFiatTransaction(string _userId, int _amountCents) public onlyCreator returns(uint){
          require(0!=_amountCents);

          uint c = fiatCounts[_userId];

          fiatTxs[_userId][c] = _amountCents;
          fiatBalancesCents[_userId] = fiatBalancesCents[_userId] + _amountCents;

          fiatCounts[_userId] = safeAdd(fiatCounts[_userId],1);

          fiatTotal++;
          return c;
     }

     function getFiatTransactionsCount(string _userId) public constant returns (uint){
          return fiatCounts[_userId];
     }
     
     function getAllFiatTransactionsCount() public constant returns (uint){
          return fiatTotal;
     }

     function getFiatTransaction(string _userId, uint _index) public constant returns(int){
          require(_index < fiatCounts[_userId]);
          return fiatTxs[_userId][_index];
     }

// 4
     function getUserFiatBalance(string _userId) public constant returns(int){
          return fiatBalancesCents[_userId];
     }

// 3:
     function addBuyTokensRequest(string _userId, string _requestHash) public returns(uint){
          Request memory r;
          r.sender = msg.sender;
          r.userId = _userId;
          r.requestHash = _requestHash;
          r.buyRequest = true;
          r.state = 0;

          requests[requestsCount] = r;
          uint out = requestsCount;
          requestsCount++;

          NewTokenBuyRequest(msg.sender, _userId); 
          return out;
     }

     function addSellTokensRequest(string _userId, string _requestHash) returns(uint){
          Request memory r;
          r.sender = msg.sender;
          r.userId = _userId;
          r.requestHash = _requestHash;
          r.buyRequest = false;
          r.state = 0;

          requests[requestsCount] = r;
          uint out = requestsCount;
          requestsCount++;

          NewTokenSellRequest(msg.sender, _userId);
          return out;
     }

     function getRequestsCount() public constant returns(uint){
          return requestsCount;
     }

     function getRequest(uint _index) public constant returns(address a, string userId, string hash, bool buy, uint8 state){
          require(_index < requestsCount);

          Request memory r = requests[_index];
          return (r.sender, r.userId, r.requestHash, r.buyRequest, r.state);
     }

     function cancelRequest(uint _index) onlyCreator public {
          require(_index < requestsCount);
          require(0==requests[_index].state);

          requests[_index].state = 2;
     }
     
     function processRequest(uint _index, uint _amountCents, uint _centsPerGold) onlyCreator public {
          require(_index < requestsCount);
          require(0==requests[_index].state);

          Request memory r = requests[_index];

          // 0 - get fiat amount that user has
          int amount = int(_amountCents);
          int fiatAmount = getUserFiatBalance(r.userId);

          uint tokens = 0;
          if(r.buyRequest){
               require(fiatAmount > 0);
               if(fiatAmount < amount){
                    amount = fiatAmount;
               }
               require(amount > 0);

               // 1 - issue tokens
               tokens = (uint(amount) * 1 ether) / _centsPerGold;
               issueGoldTokens(r.sender, tokens);

               // 2 - add fiat tx
               // negative for buy
               addFiatTransaction(r.userId, - amount);
          }else{
               tokens = (uint(amount) * 1 ether) / _centsPerGold;

               uint tokenBalance = goldToken.balanceOf(r.sender);
               if(tokenBalance < tokens){
                    tokens = tokenBalance;
                    amount = int((tokens * _centsPerGold) / 1 ether);
               }

               burnGoldTokens(r.sender, tokens);

               // 2 - add fiat tx
               // positive for sell 
               addFiatTransaction(r.userId, amount);
          }

          // 3 - update state
          r.state = 1;   // processed
          requests[_index] = r;

          // 4 - send event
          RequestProcessed(_index);
     }
     
////////
     function issueGoldTokens(address _userAddress, uint _tokenAmount) internal {
          require(0!=_tokenAmount);
          goldToken.issueTokens(_userAddress, _tokenAmount);
     }

     function burnGoldTokens(address _userAddress, uint _tokenAmount) internal {
          require(0!=_tokenAmount);
          goldToken.burnTokens(_userAddress, _tokenAmount);
     }
}
