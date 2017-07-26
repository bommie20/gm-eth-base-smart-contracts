pragma solidity ^0.4.4;

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

     function assert(bool assertion) internal {
          if (!assertion) throw;
     }
}

// Standard token interface (ERC 20)
// https://github.com/ethereum/EIPs/issues/20
contract Token is SafeMath {
     // Functions:
     /// @return total amount of tokens
     function totalSupply() constant returns (uint256 supply) {}

     /// @param _owner The address from which the balance will be retrieved
     /// @return The balance
     function balanceOf(address _owner) constant returns (uint256 balance) {}

     /// @notice send `_value` token to `_to` from `msg.sender`
     /// @param _to The address of the recipient
     /// @param _value The amount of token to be transferred
     function transfer(address _to, uint256 _value) {}

     /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
     /// @param _from The address of the sender
     /// @param _to The address of the recipient
     /// @param _value The amount of token to be transferred
     /// @return Whether the transfer was successful or not
     function transferFrom(address _from, address _to, uint256 _value){}

     /// @notice `msg.sender` approves `_addr` to spend `_value` tokens
     /// @param _spender The address of the account able to transfer the tokens
     /// @param _value The amount of wei to be approved for transfer
     /// @return Whether the approval was successful or not
     function approve(address _spender, uint256 _value) returns (bool success) {}

     /// @param _owner The address of the account owning tokens
     /// @param _spender The address of the account able to transfer the tokens
     /// @return Amount of remaining tokens allowed to spent
     function allowance(address _owner, address _spender) constant returns (uint256 remaining) {}

     // Events:
     event Transfer(address indexed _from, address indexed _to, uint256 _value);
     event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

contract StdToken is Token {
     // Fields:
     mapping(address => uint256) balances;
     mapping (address => mapping (address => uint256)) allowed;
     uint public totalSupply = 0;

     // Functions:
     function transfer(address _to, uint256 _value) {
          if((balances[msg.sender] < _value) || (balances[_to] + _value <= balances[_to])) {
               throw;
          }

          balances[msg.sender] -= _value;
          balances[_to] += _value;
          Transfer(msg.sender, _to, _value);
     }

     function transferFrom(address _from, address _to, uint256 _value) {
          if((balances[_from] < _value) || 
               (allowed[_from][msg.sender] < _value) || 
               (balances[_to] + _value <= balances[_to])) 
          {
               throw;
          }

          balances[_to] += _value;
          balances[_from] -= _value;
          allowed[_from][msg.sender] -= _value;

          Transfer(_from, _to, _value);
     }

     function balanceOf(address _owner) constant returns (uint256 balance) {
          return balances[_owner];
     }

     function approve(address _spender, uint256 _value) returns (bool success) {
          allowed[msg.sender][_spender] = _value;
          Approval(msg.sender, _spender, _value);

          return true;
     }

     function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
          return allowed[_owner][_spender];
     }

     modifier onlyPayloadSize(uint _size) {
          if(msg.data.length < _size + 4) {
               throw;
          }
          _;
     }
}

contract GOLD is StdToken {
/// Fields:
     string public constant name = "Goldmint GOLD Token";
     string public constant symbol = "GOLD";
     uint public constant decimals = 18;

     uint public constant CURRENT_FEE_MODIFIER_MIN = 100;
     uint public constant CURRENT_FEE_MODIFIER_MAX = 100000;
     uint public currentFeeModifier = 400;   // 0.25%

     uint public constant MIN_FEE = 0.001 * (1 ether / 1 wei);
     uint public constant MAX_FEE = 0.01 * (1 ether / 1 wei);
     uint public currentMinFee = 0.0025 * (1 ether / 1 wei);  

     enum State{
          Init
     }

     State public currentState = State.Init;

     address public creator = 0x0;
     // this is used to send fees (that is then distributed as rewards to all MNT token holders)
     address public tempGoldAccount = 0x0;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier onlyInState(State state){ if(state != currentState) throw; _; }

/// Access methods:
     // TODO: test
     function setCreator(address _creator) onlyCreator {
          creator = _creator;
     }

     // TODO: test
     function setTempGoldAccount(address _tempGoldAccount) onlyCreator {
          tempGoldAccount = _tempGoldAccount;
     }
     
     function setCurrentFeeModifier(uint _value)onlyCreator{
          // 0.001% (100000) .. 1% (100)
          // 0.25% (400) by default
          if((_value<CURRENT_FEE_MODIFIER_MIN) || (_value>CURRENT_FEE_MODIFIER_MAX)){
               throw;
          }
          currentFeeModifier = _value;
     }

     function setCurrentMinFee(uint _value)onlyCreator{
          // 0.001 .. 0.01
          if((_value<MIN_FEE) || (_value>MAX_FEE)){
               throw;
          }
          currentMinFee = _value;
     }

///
     function GOLD(address _tempGoldAccount) {
          creator = msg.sender;
          tempGoldAccount = _tempGoldAccount;
     }

     function calculateFee(uint _value) returns(uint) {
          // 0.25% by default
          uint fee = (_value / currentFeeModifier);  

          if(fee < currentMinFee){
               fee = currentMinFee;
          }
          return fee;
     }

     // Send GOLD tokens from A (msg.sender) -> B (_to)
     function transfer(address _to, uint _value) onlyPayloadSize(2 * 32) {
          uint fee = calculateFee(_value);
          // if fee is bigger than _value -> this will throw
          uint sendThis = safeSub(_value,fee);
          
          // 1.Transfer fee
          // A -> rewards account
          super.transfer(tempGoldAccount, fee);

          // 2.Transfer
          // A -> B
          return super.transfer(_to, sendThis);
     }

     // TODO: msg.sender should be only MNT contract
     function transferRewardWithoutFee(address _to, uint _value) onlyPayloadSize(2*32) {
          if((balances[tempGoldAccount] < _value) || (balances[_to] + _value <= balances[_to])) {
               throw;
          }

          balances[tempGoldAccount] -= _value;
          balances[_to] += _value;

          Transfer(tempGoldAccount, _to, _value);
     }

     // TODO: warning!!!! Just for tests!!!
     // should be removed in production
     function TEST_issueTokens(address _for, uint _amount) /*onlyCreator*/ {
          balances[_for] += _amount;
          totalSupply += _amount;
     }
}

contract MNT is StdToken {
/// Fields:
     string public constant name = "Goldmint MNT Token";
     string public constant symbol = "MNT";
     uint public constant decimals = 18;

     address public creator = 0x0;
     address public icoContractAddress = 0x0;

     // this is where 50% of all GOLD rewards will be transferred
     // (this is Goldmint foundation fund)
     address public goldmintRewardsAccount = 0x0;

     // this is where all GOLD rewards are kept
     address public tempGoldAccount = 0x0;

     // this is charity account (we send what was not withdrawn by token holders)
     address public charityAccount = 0x0;

     GOLD public gold;

     // TODO: who sets this to true?
     bool public blockTransfers = false;

     // TODO: combine with 'balances' map...
     struct TokenHolder {
          uint balanceAtLastReward;

          // this helps to mantain the 'last balance' map
          uint lastBalanceUpdateTime;

          // do not allow multiple withdraws in a single reward period
          uint lastRewardWithdrawTime;
     }

     mapping(address => TokenHolder) tokenHolders;

     // Divide rewards
     uint public lastDivideRewardsTime = 0;
     uint public DIVIDE_REWARDS_INTERVAL_DAYS = 7;

     uint public lastIntervalTokenHoldersRewards = 0;
     uint public lastIntervalTokenHoldersWithdrawn = 0;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier byCreatorOrIcoContract() { if((msg.sender != creator) && (msg.sender != icoContractAddress)) throw; _; }
     modifier allowTransfer(){if(blockTransfers) throw; _; }
     modifier allowSendingRewards(){if((lastDivideRewardsTime + (DIVIDE_REWARDS_INTERVAL_DAYS * 1 days)) > now) throw; _; }

     function setCreator(address _creator) onlyCreator {
          creator = _creator;
     }

/// Setters/Getters
     function setIcoContractAddress(address _icoContractAddress) onlyCreator {
          icoContractAddress = _icoContractAddress;
     }

     function setTempGoldAccount(address _tempGoldAccount) onlyCreator {
          tempGoldAccount = _tempGoldAccount;
     }

     function setGoldTokenAddress(address _goldTokenContractAddress) onlyCreator {
          gold = GOLD(_goldTokenContractAddress);
     }

     function setGoldmintRewardsAccount(address _goldmintRewardsAccount) onlyCreator {
          goldmintRewardsAccount = _goldmintRewardsAccount;
     }

     function setDivideRewardsInterval(uint _days) onlyCreator {
          DIVIDE_REWARDS_INTERVAL_DAYS = _days;
     }

     function setCharityAccount(address _charityAccount) onlyCreator {
          charityAccount = _charityAccount;
     }

/// Functions:
     /// @dev Constructor
     function MNT(
          address _goldTokenContractAddress,
          
          address _tempGoldAccount, 
          address _goldmintRewardsAccount,
          address _charityAccount) 
     {
          creator = msg.sender;

          gold = GOLD(_goldTokenContractAddress);

          tempGoldAccount = _tempGoldAccount;
          goldmintRewardsAccount = _goldmintRewardsAccount;

          charityAccount = _charityAccount;
     }

     function issueTokens(address _who, uint _tokens) byCreatorOrIcoContract {
          // TODO: check this...
          tokenHolders[_who].balanceAtLastReward = 0;
          tokenHolders[_who].lastBalanceUpdateTime = now;
          tokenHolders[_who].lastRewardWithdrawTime = 0;

          balances[_who] += _tokens;
          totalSupply += _tokens;
     }

     function transfer(address _to, uint256 _value) allowTransfer {
          updateLastBalancesMap(msg.sender);
          updateLastBalancesMap(_to);

          super.transfer(_to, _value);
     }

     function transferFrom(address _from, address _to, uint256 _value) allowTransfer {
          updateLastBalancesMap(_from);
          updateLastBalancesMap(_to);

          super.transferFrom(_from, _to, _value);
     }

     // this is called BEFORE balance update from transfer() 
     function updateLastBalancesMap(address _who) internal {
          // if 'last update time' is BEFORE 'last rewards were divided'...
          if(tokenHolders[_who].lastBalanceUpdateTime <= lastDivideRewardsTime) {
               tokenHolders[_who].lastBalanceUpdateTime = now;
               tokenHolders[_who].balanceAtLastReward = balances[_who];
          }
     }

     // This should be called by Goldmint staff
     function sendRewards() onlyCreator allowSendingRewards {
          lastDivideRewardsTime = now;

          // 0 - send the rest of rewards to charity account
          if(lastIntervalTokenHoldersRewards>=lastIntervalTokenHoldersWithdrawn){
               uint leftForCharity = lastIntervalTokenHoldersRewards - lastIntervalTokenHoldersWithdrawn;
               if(leftForCharity!=0){
                    gold.transferRewardWithoutFee(charityAccount,leftForCharity);
               }
          }

          // 1 - send half of all rewards to Goldmint
          uint totalRewardsLeft = gold.balanceOf(tempGoldAccount);
          uint half = totalRewardsLeft / 2;
          gold.transferRewardWithoutFee(goldmintRewardsAccount,half);

          // 2 - send other half to token holders
          // save total rewards at this time
          uint rest = totalRewardsLeft - half;
          lastIntervalTokenHoldersRewards = rest;
          lastIntervalTokenHoldersWithdrawn = 0;
     }

     // This should be called by token holder
     function calculateMyReward(address _addr)constant returns(uint){
          uint256 balance;

          if(tokenHolders[_addr].lastBalanceUpdateTime <= lastDivideRewardsTime) {
               // if balance was NOT updated since last reward
               // get current balance
               balance = balances[_addr];
          } else {
               // if balance was updated since last reward
               // get the balance at 'lastDivideRewardsTime' 
               balance = tokenHolders[_addr].balanceAtLastReward;
          }
          
          return (balance * lastIntervalTokenHoldersRewards / totalSupply);
     }

     // This should be called by token holder
     function getMyReward(){
          // if you already got your reward since last time 'sendRewards' was called
          if(tokenHolders[msg.sender].lastRewardWithdrawTime >= lastDivideRewardsTime) {
               throw;
          }

          uint myReward = calculateMyReward(msg.sender);
          tokenHolders[msg.sender].lastRewardWithdrawTime = now;

          // send rewards to the MNT token holder
          // rewardAccount -> _mntTokenHolder
          gold.transferRewardWithoutFee(msg.sender,myReward);

          lastIntervalTokenHoldersWithdrawn+=myReward;
     }

     // Do not allow to send money directly to this contract
     function() {
          throw;
     }
}

contract Goldmint is SafeMath {
     address public creator = 0x0;

     MNT public mntToken; 

     // These can be changed before ICO start ($6USD/MNT)
     uint constant STD_PRICE_USD_PER_1000_TOKENS = 6000;
     // coinmarketcap.com 25.07.2017
     uint constant ETH_PRICE_IN_USD = 205;
          
     uint constant TOKENS_PREICO_SOLD = 310000;
     uint constant TOKENS_EARLY_INVESTORS = 700000;
     uint constant TOKENS_ADVISORS = 690000;

     // 1 700 000 tokens
     uint public constant BONUS_REWARD = (TOKENS_PREICO_SOLD + TOKENS_EARLY_INVESTORS + TOKENS_ADVISORS) * (1 ether/ 1 wei);
     // 2 000 000 tokens
     uint public constant FOUNDERS_REWARD = 2000000 * (1 ether / 1 wei);
     // we sell only this amount of tokens during the ICO
     uint public constant ICO_TOKEN_SUPPLY_LIMIT = 6300000 * (1 ether / 1 wei); 

     uint public constant TOTAL_TOKEN_SUPPLY = 
          BONUS_REWARD + 
          ICO_TOKEN_SUPPLY_LIMIT + 
          FOUNDERS_REWARD;

     // this is total number of tokens sold during ICO
     uint public icoTokensSold = 0;

     // this is total number of tokens that were issued by a scripts
     uint public issuedExternallyTokens = 0;

     bool public foundersRewardsMinted = false;

     // this is where FOUNDERS_REWARD will be allocated
     address public foundersRewardsAccount = 0x0;

     enum State{
          Init,

          ICORunning,
          ICOPaused,
         
          Normal
          // TODO...
     }
     State public currentState = State.Init;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier onlyInState(State state){ if(state != currentState) throw; _; }

/// Events:
     event LogStateSwitch(State newState);
     event LogBuy(address indexed owner, uint value);
     
/// Functions:
     /// @dev Constructor
     function Goldmint(
          address _mntTokenAddress,
          address _foundersRewardsAccount) 
     {
          creator = msg.sender;

          mntToken = MNT(_mntTokenAddress);

          foundersRewardsAccount = _foundersRewardsAccount;

          // 10 mln tokens total
          assert(TOTAL_TOKEN_SUPPLY == (10000000 * (1 ether / 1 wei)));
     }

     /// @dev This function is automatically called when ICO is started
     /// WARNING: can be called multiple times!
     function startICO() internal onlyCreator {
          mintFoundersRewards(foundersRewardsAccount);
     }

     function mintFoundersRewards(address _whereToMint) internal onlyCreator {
          if(!foundersRewardsMinted){
               foundersRewardsMinted = true;
               mntToken.issueTokens(_whereToMint,FOUNDERS_REWARD);
          }
     }

/// Access methods:
     function setState(State _nextState) public onlyCreator {
          bool canSwitchState
               =  (currentState == State.Init && _nextState == State.ICORunning)
               || (currentState == State.ICORunning && _nextState == State.ICOPaused)
               || (currentState == State.ICOPaused && _nextState == State.ICORunning)
               || (currentState == State.ICORunning && _nextState == State.Normal);

          if(!canSwitchState) throw;

          currentState = _nextState;
          LogStateSwitch(_nextState);

          if(currentState==State.ICORunning){
               startICO();
          }
     }

     function getMntTokensPerEth(uint tokensSold) public constant returns (uint){
          // 10 buckets
          uint priceIndex = (tokensSold / (1 ether/ 1 wei)) / 700000;
          assert(priceIndex>=0 && (priceIndex<=9));
          
          uint8[10] memory discountPercents = [10,8,6,4,3,2,1,0,0,0];

          // Example: $5400 / 1000 MNT
          uint pricePer1000tokensUsd = 
               (STD_PRICE_USD_PER_1000_TOKENS - (discountPercents[priceIndex] * STD_PRICE_USD_PER_1000_TOKENS / 100));

          uint mntPerEth = (ETH_PRICE_IN_USD * 1000 * (1 ether / 1 wei)) / pricePer1000tokensUsd;
          return mntPerEth;
     }

     // TODO: test
     function buyTokens(address _buyer) public payable onlyInState(State.ICORunning) {
          if(msg.value == 0) throw;

          // The price is selected based on current sold tokens.
          // Price can 'overlap'. For example:
          //   1. if currently we sold 699950 tokens (the price is 10% discount)
          //   2. buyer buys 1000 tokens
          //   3. the price of all 1000 tokens would be with 10% discount!!!
          uint newTokens = (msg.value * getMntTokensPerEth(icoTokensSold)) / (1 ether / 1 wei);

          if(icoTokensSold + newTokens > ICO_TOKEN_SUPPLY_LIMIT) throw;

          mntToken.issueTokens(_buyer,newTokens);

          icoTokensSold+=newTokens;

          LogBuy(_buyer, newTokens);
     }

     /// @dev This can be called to manually issue new tokens
     // TODO: test it
     function issueTokensExternal(address _to, uint _tokens) onlyCreator {
          // can not issue more than BONUS_REWARD
          if(issuedExternallyTokens + _tokens>BONUS_REWARD){
               throw;
          }

          mntToken.issueTokens(_to,_tokens);
          
          issuedExternallyTokens+=_tokens;
     }

     // Default fallback function
     function() payable {
          buyTokens(msg.sender);
     }
}
