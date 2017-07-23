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

     // TODO:
     uint public constant PRICE = 1000;  // per 1 Ether
     
     uint public constant PRESALE_TOKEN_SUPPLY_LIMIT = 300000 * (1 ether / 1 wei); 
     // we sell only this amount of tokens during the ICO
     uint public constant ICO_TOKEN_SUPPLY_LIMIT = 7300000 * (1 ether / 1 wei); 
     uint public constant TEAM_REWARD = 2000000 * (1 ether / 1 wei);
     uint public constant ADVISORS_REWARD = 400000 * (1 ether / 1 wei);

     uint public constant TOTAL_TOKEN_SUPPLY = 
          PRESALE_TOKEN_SUPPLY_LIMIT + 
          ICO_TOKEN_SUPPLY_LIMIT + 
          TEAM_REWARD + 
          ADVISORS_REWARD;

     bool public teamRewardsMinted = false;
     bool public advisorsRewardsMinted = false;

     enum State{
          Init,

          ICORunning,
          ICOPaused,
         
          Normal
          // TODO...
     }
     State public currentState = State.Init;

     // this is who deployed this contract
     address public creator = 0x0;
     // this is to allocate ICO rewards (one time only)
     address public teamRewardsAccount = 0x0;
     // this is to allocate ICO rewards (one time only)
     address public advisorsRewardsAccount = 0x0;
     // this is where 50% of all GOLD rewards will be transferred
     // (this is Goldmint foundation fund)
     address public goldmintRewardsAccount = 0x0;

     // this is where all GOLD rewards are kept
     address public tempGoldAccount = 0x0;
     // this is charity account (we send what was not withdrawn by token holders)
     address public charityAccount = 0x0;

     GOLD public gold;

     // TODO: combine with 'balances' map...
     struct TokenHolder {
          uint balanceAtLastReward;

          // this helps to mantain the 'last balance' map
          uint lastBalanceUpdateTime;

          // do not allow multiple withdraws in a single reward period
          uint lastRewardWithdrawTime;
     }

     uint tokenHoldersCount = 0;
     mapping(address => TokenHolder) tokenHolders;

     // Divide rewards
     uint public lastDivideRewardsTime = 0;
     uint public DIVIDE_REWARDS_INTERVAL_DAYS = 7;

     uint public lastIntervalTokenHoldersRewards = 0;
     uint public lastIntervalTokenHoldersWithdrawn = 0;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier onlyInState(State state){ if(state != currentState) throw; _; }
     modifier allowSendingRewards(){if((lastDivideRewardsTime + (DIVIDE_REWARDS_INTERVAL_DAYS * 1 days)) > now) throw; _; }

/// Events:
     event LogBuy(address indexed owner, uint value);
     event LogStateSwitch(State newState);

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

     function getCurrentPrice() returns (uint){
          return PRICE;
     }

     function setCreator(address _creator) onlyCreator {
          creator = _creator;
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
     /// @param _tempGoldAccount - should be equal to GOLD's tempGoldAccount
     function MNT(
          address _teamRewardsAccount,
          address _advisorsRewardsAccount, 
          
          address _tempGoldAccount, 
          address _goldmintRewardsAccount,
          address _charityAccount) 
     {
          creator = msg.sender;

          teamRewardsAccount = _teamRewardsAccount;
          advisorsRewardsAccount = _advisorsRewardsAccount;

          tempGoldAccount = _tempGoldAccount;
          goldmintRewardsAccount = _goldmintRewardsAccount;

          charityAccount = _charityAccount;

          assert(TOTAL_TOKEN_SUPPLY == (10000000 * (1 ether / 1 wei)));
     }

     function buyTokens(address _buyer) public payable onlyInState(State.ICORunning) {
          if(msg.value == 0) throw;
          uint newTokens = msg.value * getCurrentPrice();

          if (totalSupply + newTokens > ICO_TOKEN_SUPPLY_LIMIT) throw;

          issueTokens(_buyer,newTokens);

          LogBuy(_buyer, newTokens);
     }

     /// @dev This function is automatically called when ICO is started
     /// WARNING: can be called multiple times!
     function startICO()internal onlyCreator {
          // 1 - mint team rewards
          mintTeamRewards(teamRewardsAccount);

          // 2 - mint advisor rewards
          mintAdvisorsRewards(advisorsRewardsAccount);
     }

     function mintTeamRewards(address _whereToMint) internal onlyCreator {
          if(!teamRewardsMinted){
               teamRewardsMinted = true;
               issueTokens(_whereToMint,TEAM_REWARD);
          }
     }
     
     function mintAdvisorsRewards(address _whereToMint) internal onlyCreator {
          if(!advisorsRewardsMinted){
               advisorsRewardsMinted = true;
               issueTokens(_whereToMint,ADVISORS_REWARD);
          }
     }

     /// @dev This should be called only after ICO is finished...
     function mintRest()public onlyCreator {
          // TODO:
     }

     /// @dev This can be called to migrate Presale tokens and to update Bounty campaign balances
     // TODO: test it
     function issueTokensExternal(address _who, uint _tokens) onlyCreator {
          issueTokens(_who,_tokens);
     }

     // TODO: test it
     function issueTokens(address _who, uint _tokens) private {
          // TODO:
          // TODO: holder can buy again)))

          //tokenHolders[_who] = _tokens;
          //tokenHoldersCount = tokenHoldersCount + 1;

          balances[_who] += _tokens;
          totalSupply += _tokens;
     }

     function transfer(address _to, uint256 _value) onlyInState(State.Normal) {
          updateLastBalancesMap(msg.sender);
          updateLastBalancesMap(_to);

          super.transfer(_to, _value);
     }

     function transferFrom(address _from, address _to, uint256 _value) onlyInState(State.Normal) {
          updateLastBalancesMap(_from);
          updateLastBalancesMap(_to);

          super.transferFrom(_from, _to, _value);
     }

     // this is called BEFORE balance update from transfer() 
     function updateLastBalancesMap(address _who) private {
          // if 'last update time' is BEFORE 'last rewards were divided'...
          if(tokenHolders[_who].lastBalanceUpdateTime <= lastDivideRewardsTime) {
               tokenHolders[_who].lastBalanceUpdateTime = now;
               tokenHolders[_who].balanceAtLastReward = balances[_who];
          }
     }

     // This should be called by Goldmint staff
     function sendRewards() onlyCreator onlyInState(State.Normal) allowSendingRewards{
          lastDivideRewardsTime = now;

          // 0 - send the rest of rewards to charity account
          if(lastIntervalTokenHoldersRewards>=lastIntervalTokenHoldersWithdrawn){
               uint leftForCharity = lastIntervalTokenHoldersRewards - lastIntervalTokenHoldersWithdrawn;
               if(leftForCharity!=0){
                    gold.transferRewardWithoutFee(charityAccount,leftForCharity);
               }
          }

          // 1 - send half of all rewards to GoldmintDAO
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

     // Default fallback function
     function() payable {
          buyTokens(msg.sender);
     }
}
