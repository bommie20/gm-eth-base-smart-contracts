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

     uint public currentFeeModifier = 400;   // 0.25%
     uint public currentMinFee = 0.0025 * (1 ether / 1 wei);  

     enum State{
          Init
     }

     State public currentState = State.Init;

     address creator = 0x0;

     // this is used to send fees (that is then distributed as rewards)
     address rewardsAccount = 0x0;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier onlyInState(State state){ if(state != currentState) throw; _; }

/// Access methods:
     function getRewardsAccount()constant returns(address){
          return rewardsAccount;
     }

     function setCurrentFeeModifier(uint _value)onlyCreator{
          // 0.25% (400) by default
          // 0% .. 0.5% (200)
          if(_value<200){
               throw;
          }
          currentFeeModifier = _value;
     }

     function getCurrentFeeModifier()constant returns(uint out){
          out = currentFeeModifier;
          return;
     }

     function setCurrentMinFee(uint _value)onlyCreator{
          // 0.001 .. 0.01
          uint left = 0.001 * (1 ether / 1 wei);
          uint right = 0.01 * (1 ether / 1 wei);

          if((_value>=left) && (_value<=right)){
               currentMinFee = _value;
          }else{
               throw;
          }
     }

     function getCurrentMinFee()constant returns(uint out){
          out = currentMinFee;
          return;
     }

     function setCreator(address _value)onlyCreator{
          creator = _value;
     }

     function getCreator()constant returns(address out){
          out = creator;
          return;
     }

///
     function GOLD(address _rewardsAccount) {
          creator = msg.sender;
          rewardsAccount = _rewardsAccount;
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
          super.transfer(rewardsAccount, fee);

          // 2.Transfer
          // A -> B
          return super.transfer(_to, sendThis);
     }

     function transferRewardWithoutFee(address _to, uint _value) onlyPayloadSize(2*32) {
          // TODO: msg.sender should be only MNT contract
          if((balances[rewardsAccount] < _value) || (balances[_to] + _value <= balances[_to])) {
               throw;
          }

          balances[rewardsAccount] -= _value;
          balances[_to] += _value;

          Transfer(rewardsAccount, _to, _value);
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

     // Cap is 2000 ETH
     // 1 eth = 1000 presale SQPT tokens
     // 
     // TODO:
     uint public constant TOKEN_SUPPLY_LIMIT = PRICE * 2000 * (1 ether / 1 wei);

     enum State{
          Init,

          ICORunning,
          ICOPaused,
          ICOFinished,

          RewardsSending,
          RewardsSent
          // TODO...
     }

     State public currentState = State.Init;
     address creator = 0x0;
     address rewardsAccount = 0x0;
     GOLD gold;

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

     uint lastDivideRewardsTime = 0;
     uint lastRewardsTotal = 0;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier onlyRewardsAccount() { if(msg.sender != rewardsAccount) throw; _; }
     modifier onlyInState(State state){ if(state != currentState) throw; _; }

/// Events:
     event LogBuy(address indexed owner, uint value);
     event LogStateSwitch(State newState);

/// Access methods:
     function setState(State _nextState) public onlyCreator {
          bool canSwitchState
               =  (currentState == State.Init && _nextState == State.ICORunning)
               || (currentState == State.ICORunning && _nextState == State.ICOPaused)
               || (currentState == State.ICOPaused && _nextState == State.ICORunning)
               || (currentState == State.ICORunning && _nextState == State.ICOFinished)
               || (currentState == State.ICOFinished && _nextState == State.RewardsSending)
               || (currentState == State.RewardsSending && _nextState == State.RewardsSent);

          if(!canSwitchState) throw;

          currentState = _nextState;
          LogStateSwitch(_nextState);
     }

     function setGoldTokenAddress(address _goldTokenContractAddress) onlyCreator {
          gold = GOLD(_goldTokenContractAddress);
     }

     function getRewardsAccount()constant returns(address){
          return rewardsAccount; 
     }

     function getLastRewardsTotal()constant returns(uint){
          return lastRewardsTotal;
     }

/// Functions:
     /// @dev Constructor
     /// @param _rewardsAccount - should be equal to GOLD's rewardsAccount
     function MNT(address _rewardsAccount) {
          creator = msg.sender;
          rewardsAccount = _rewardsAccount;
     }

     // TODO: this method is still not ready... 
     function buyTokens(address _buyer) public payable onlyInState(State.ICORunning) {
          if(msg.value == 0) throw;
          uint newTokens = msg.value * PRICE;

          if (totalSupply + newTokens > TOKEN_SUPPLY_LIMIT) throw;

          // TODO: holder can buy again)))
          //tokenHolders[msg.sender] = _buyer;
          //tokenHoldersCount = tokenHoldersCount + 1;

          balances[_buyer] += newTokens;
          totalSupply += newTokens;

          LogBuy(_buyer, newTokens);
     }

     function transfer(address _to, uint256 _value) onlyInState(State.ICOFinished) {
          updateLastBalancesMap(msg.sender);
          updateLastBalancesMap(_to);

          super.transfer(_to, _value);
     }

     function transferFrom(address _from, address _to, uint256 _value) onlyInState(State.ICOFinished) {
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
     function sendRewards()onlyRewardsAccount{
          // 7 days
          if(lastDivideRewardsTime + 7 days > now) throw;
          lastDivideRewardsTime = now;
          // save total rewards at this time
          lastRewardsTotal = gold.balanceOf(rewardsAccount);
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
          
          return (balance * lastRewardsTotal / totalSupply);
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
     }

     // Default fallback function
     function() payable {
          buyTokens(msg.sender);
     }
}
