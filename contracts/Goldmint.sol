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

contract MNT is StdToken {
/// Fields:
     string public constant name = "Goldmint MNT Token";
     string public constant symbol = "MNT";
     uint public constant decimals = 18;

     address public creator = 0x0;
     address public icoContractAddress = 0x0;

     // 10 mln
     uint public constant TOTAL_TOKEN_SUPPLY = 10000000 * (1 ether / 1 wei);

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier byCreatorOrIcoContract() { if((msg.sender != creator) && (msg.sender != icoContractAddress)) throw; _; }

     function setCreator(address _creator) onlyCreator {
          creator = _creator;
     }

/// Setters/Getters
     function setIcoContractAddress(address _icoContractAddress) onlyCreator {
          icoContractAddress = _icoContractAddress;
     }

/// Functions:
     /// @dev Constructor
     function MNT() {
          creator = msg.sender;

          // 10 mln tokens total
          assert(TOTAL_TOKEN_SUPPLY == (10000000 * (1 ether / 1 wei)));
     }

     function issueTokens(address _who, uint _tokens) byCreatorOrIcoContract {
          if((totalSupply + _tokens) > TOTAL_TOKEN_SUPPLY){
               throw;
          }

          balances[_who] += _tokens;
          totalSupply += _tokens;
     }

     function burnTokens(address _who, uint _tokens) byCreatorOrIcoContract {
          balances[_who] = safeSub(balances[_who], _tokens);
          totalSupply = safeSub(totalSupply, _tokens);
     }

     // Do not allow to send money directly to this contract
     function() {
          throw;
     }
}

contract Goldmint is SafeMath {
     address public creator = 0x0;
     address public tokenManager = 0x0;

     MNT public mntToken; 

     // These can be changed before ICO start ($6USD/MNT)
     uint constant STD_PRICE_USD_PER_1000_TOKENS = 6000;
     // coinmarketcap.com 25.07.2017
     uint constant ETH_PRICE_IN_USD = 205;
          
     // 1 000 000 tokens
     uint public constant BONUS_REWARD = 1000000 * (1 ether/ 1 wei);
     // 2 000 000 tokens
     uint public constant FOUNDERS_REWARD = 2000000 * (1 ether / 1 wei);
     // 7 000 000 we sell only this amount of tokens during the ICO
     uint public constant ICO_TOKEN_SUPPLY_LIMIT = 7000000 * (1 ether / 1 wei); 

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
         
          ICOFinished
     }
     State public currentState = State.Init;

/// Modifiers:
     modifier onlyCreator() { if(msg.sender != creator) throw; _; }
     modifier onlyTokenManager() { if(msg.sender != tokenManager) throw; _; }
     modifier onlyInState(State state){ if(state != currentState) throw; _; }

/// Events:
     event LogStateSwitch(State newState);
     event LogBuy(address indexed owner, uint value);
     
/// Functions:
     /// @dev Constructor
     function Goldmint(
          address _tokenManager,
          address _mntTokenAddress,
          address _foundersRewardsAccount) 
     {
          creator = msg.sender;
          tokenManager = _tokenManager;

          mntToken = MNT(_mntTokenAddress);

          foundersRewardsAccount = _foundersRewardsAccount;
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
     function setTokenManager(address _new) public onlyTokenManager {
          tokenManager = _new;
     }

     function setState(State _nextState) public onlyCreator {
          bool canSwitchState
               =  (currentState == State.Init && _nextState == State.ICORunning)
               || (currentState == State.ICORunning && _nextState == State.ICOPaused)
               || (currentState == State.ICOPaused && _nextState == State.ICORunning)
               || (currentState == State.ICORunning && _nextState == State.ICOFinished)
               || (currentState == State.ICOFinished && _nextState == State.ICORunning);

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
     /// from the bonus reward
     function issueTokensExternal(address _to, uint _tokens) onlyInState(State.ICOFinished) onlyTokenManager {
          // can not issue more than BONUS_REWARD
          if((issuedExternallyTokens + _tokens)>BONUS_REWARD){
               throw;
          }

          mntToken.issueTokens(_to,_tokens);

          issuedExternallyTokens+=_tokens;
     }

     function burnTokens(address _from, uint _tokens) onlyInState(State.ICOFinished) onlyTokenManager {
          mntToken.burnTokens(_from,_tokens);
     }

     // Default fallback function
     function() payable {
          buyTokens(msg.sender);
     }
}
