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
          require(balances[msg.sender] >= _value);
          require(balances[_to] + _value > balances[_to]);

          balances[msg.sender] = safeSub(balances[msg.sender],_value);
          balances[_to] = safeAdd(balances[_to],_value);

          Transfer(msg.sender, _to, _value);
          return true;
     }

     function transferFrom(address _from, address _to, uint256 _value) returns(bool){
          require(balances[_from] >= _value);
          require(allowed[_from][msg.sender] >= _value);
          require(balances[_to] + _value > balances[_to]);

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

contract Gold is StdToken, CreatorEnabled {
// Fields:
     string public constant name = "Goldmint GOLD Token";
     string public constant symbol = "GOLD";
     uint public constant decimals = 18;

     // this is used to send fees (that is then distributed as rewards)
     address public migrationAddress = 0x0;
     bool public lockTransfers = false;

// Modifiers:
     modifier onlyMigration() { require(msg.sender==migrationAddress); _; }
     modifier onlyIfUnlocked() { require(!lockTransfers); _; }

// Functions:
     function GOLD() public {
          creator = msg.sender;
     }

     function setMigrationContractAddress(address _migrationAddress) public onlyCreator {
          migrationAddress = _migrationAddress;
     }

     function emit(address _to, uint _value) public onlyCreator {
          // TODO:
     }

     function startMigration() public onlyMigration {
          // TODO:
     }

     function lockTransfer(bool _lock) public onlyMigration {
          lockTransfers = _lock;
     }

     function transfer(address _to, uint256 _value) public onlyIfUnlocked onlyPayloadSize(2 * 32) returns(bool){
          uint fee = calculateFee(_value);
          uint sendThis = safeSub(_value,fee);
          
          // 1.Transfer fee
          // A -> rewards account
          super.transfer(migrationAddress, fee);

          // 2.Transfer
          // A -> B
          return super.transfer(_to, sendThis);
     }

     function transferFrom(address _from, address _to, uint256 _value) public onlyIfUnlocked returns(bool){
          uint fee = calculateFee(_value);
          uint sendThis = safeSub(_value,fee);
          
          // 1.Transfer fee
          // A -> rewards account
          super.transferFrom(_from, migrationAddress, fee);

          // 2.Transfer
          // A -> B
          return super.transferFrom(_from, _to, sendThis);
     }

     // Used to send rewards)
     function transferRewardWithoutFee(address _to, uint _value) public onlyMigration onlyPayloadSize(2*32) {
          balances[migrationAddress] = safeSub(balances[migrationAddress],_value);
          balances[_to] = safeAdd(balances[_to],_value);

          Transfer(migrationAddress, _to, _value);
     }

     function calculateFee(uint _value) internal returns(uint) {
          // TODO
          return 0;  
     }

}

contract MNTP_Interface is StdToken {
// Additional methods that MNTP contract provides
     function lockTransfer(bool _lock);
}

contract GoldmintMigration is CreatorEnabled {
// Fields:
     MNTP_Interface public mntpToken;
     Gold public goldToken;

     enum State {
          Init,
          MigrationStarted
     }

     State public state = State.Init;
     
     // this is total collected GOLD rewards (launch to migration start)
     uint public migrationRewardTotal = 0;
     uint public mntpToMigrateTotal = 0;
     uint64 public migrationStartedTime = 0;

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
          // 1 - change fees
          goldToken.startMigration();
          
          // 2 - store the current values 
          migrationRewardTotal = goldToken.balanceOf(this);
          mntpToMigrateTotal = mntpToken.totalSupply();
          migrationStartedTime = uint64(now);
     }

     // Call this to migrate your MNTP tokens to Graphene MNT
     // (this is one-way only)
     // _grapheneAddress is something like that - "BTS7yRXCkBjKxho57RCbqYE3nEiprWXXESw3Hxs5CKRnft8x7mdGi"
     function migrateMntp(string _grapheneAddress) public {
          // 1 - calculate current reward
          uint myRewardMax = calculateMyRewardMax(msg.sender);        
          uint myReward = calculateMyRewardDecreased(myRewardMax);

          // 2 - pay reward

     }

     function migrateGold(string _grapheneAddress) public {
     
     }

     // Each MNTP token holder gets a GOLD reward as a percent of all rewards
     // proportional to his MNTP token stake
     function calculateMyRewardMax(address _of) public constant returns(uint){
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
     function calculateMyRewardDecreased(uint _myRewardMax) public constant returns(uint){
          // day starts from 0
          uint day = (uint64(now) - migrationStartedTime) / uint64(1 days);  
          if(day>=365){
               return 0;
          }

          return _myRewardMax * (100 - (100 * day/365));
     }
}
