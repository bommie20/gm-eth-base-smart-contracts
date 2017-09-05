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

contract StdToken is SafeMath {
     // Fields:
     mapping(address => uint256) balances;
     mapping (address => mapping (address => uint256)) allowed;
     uint public totalSupply = 0;

     // Events:
     event Transfer(address indexed _from, address indexed _to, uint256 _value);
     event Approval(address indexed _owner, address indexed _spender, uint256 _value);

     // Functions:
     function transfer(address _to, uint256 _value) returns(bool){
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

contract MNTP is StdToken {
/// Fields:
     string public constant name = "Goldmint MNT Prelaunch Token";
     string public constant symbol = "MNTP";
     uint public constant decimals = 18;

     address public creator = 0x0;
     address public icoContractAddress = 0x0;
     bool public lockTransfers = false;

     // 10 mln
     uint public constant TOTAL_TOKEN_SUPPLY = 10000000 * 1 ether;

/// Modifiers:
     modifier onlyCreator() { 
          require(msg.sender == creator); 
          _; 
     }

     modifier byIcoContract() { 
          require(msg.sender == icoContractAddress); 
          _; 
     }

     function setCreator(address _creator) onlyCreator {
          creator = _creator;
     }

/// Setters/Getters
     function setIcoContractAddress(address _icoContractAddress) onlyCreator {
          icoContractAddress = _icoContractAddress;
     }

/// Functions:
     /// @dev Constructor
     function MNTP() {
          creator = msg.sender;

          // 10 mln tokens total
          assert(TOTAL_TOKEN_SUPPLY == 10000000 * 1 ether);
     }

     /// @dev Override
     function transfer(address _to, uint256 _value) public returns(bool){
          require(!lockTransfers);
          return super.transfer(_to,_value);
     }

     /// @dev Override
     function transferFrom(address _from, address _to, uint256 _value) public returns(bool){
          require(!lockTransfers);
          return super.transferFrom(_from,_to,_value);
     }

     function issueTokens(address _who, uint _tokens) byIcoContract {
          require((totalSupply + _tokens) <= TOTAL_TOKEN_SUPPLY);

          balances[_who] = safeAdd(balances[_who],_tokens);
          totalSupply = safeAdd(totalSupply,_tokens);
     }

     // For refunds only
     function burnTokens(address _who, uint _tokens) byIcoContract {
          balances[_who] = safeSub(balances[_who], _tokens);
          totalSupply = safeSub(totalSupply, _tokens);
     }

     function lockTransfer(bool _lock) byIcoContract {
          lockTransfers = _lock;
     }

     // Do not allow to send money directly to this contract
     function() {
          revert();
     }
}

// This contract will hold all tokens that were unsold during ICO
// (Goldmint should be able to withdraw them and sold only 1 year post-ICO)
contract GoldmintUnsold is SafeMath {
     address public creator;
     address public teamAccountAddress;
     address public icoContractAddress;
     uint64 public icoIsFinishedDate;

     MNTP public mntToken;

     function GoldmintUnsold(address _teamAccountAddress,address _mntTokenAddress){
          creator = msg.sender;
          teamAccountAddress = _teamAccountAddress;

          mntToken = MNTP(_mntTokenAddress);          
     }

     modifier onlyCreator() { 
          require(msg.sender==creator); 
          _; 
     }

     modifier onlyIcoContract() { 
          require(msg.sender==icoContractAddress); 
          _; 
     }

/// Setters/Getters
     function setIcoContractAddress(address _icoContractAddress) onlyCreator {
          icoContractAddress = _icoContractAddress;
     }

     // only by Goldmint contract 
     function finishIco() public onlyIcoContract {
          icoIsFinishedDate = uint64(now);
     }

     // can be called by anyone...
     function withdrawTokens() public {
          // wait for 1 year!
          uint64 oneYearPassed = icoIsFinishedDate + 365 days;  
          require(uint(now) >= oneYearPassed);

          // transfer all tokens from this contract to the teamAccountAddress
          uint total = mntToken.balanceOf(this);
          mntToken.transfer(teamAccountAddress,total);
     }

     // Default fallback function
     function() payable {
          revert();
     }
}

contract FoundersVesting is SafeMath {
     address public teamAccountAddress;
     uint64 public lastWithdrawTime;

     uint public withdrawsCount = 0;
     uint public amountToSend = 0;

     MNTP public mntToken;

     function FoundersVesting(address _teamAccountAddress,address _mntTokenAddress){
          teamAccountAddress = _teamAccountAddress;
          lastWithdrawTime = uint64(now);

          mntToken = MNTP(_mntTokenAddress);          
     }

     // can be called by anyone...
     function withdrawTokens() public {
          // 1 - wait for next month!
          uint64 oneMonth = lastWithdrawTime + 30 days;  
          require(uint(now) >= oneMonth);

          // 2 - calculate amount (only first time)
          if(withdrawsCount==0){
               amountToSend = mntToken.balanceOf(this) / 10;
          }

          require(amountToSend!=0);

          // 3 - send 1/10th
          uint currentBalance = mntToken.balanceOf(this);
          if(currentBalance<amountToSend){
             amountToSend = currentBalance;  
          }
          mntToken.transfer(teamAccountAddress,amountToSend);

          // 4 - update counter
          withdrawsCount++;
          lastWithdrawTime = uint64(now);
     }

     // Default fallback function
     function() payable {
          revert();
     }
}

contract Goldmint is SafeMath {
     address public creator = 0x0;
     address public tokenManager = 0x0;
     address public otherCurrenciesChecker = 0x0;

     // These are HARD CODED!!!
     // For extra security we split single multisig into 10 separate multisigs
     //
     // TODO: set to real params!
     address[] public multisigs = [
          0x4743E37B3671958f4B6dc5a342eA6A182bDa56aa,
          0xf50Ee077fEd52078F1167D495598a50aCbbffEd1,
          0xAc72BEaf48a9BedC35588b61b49780fa2037608e,
          0xBAbb78a6fa75af062cb8fac4311f3b05A86f92db,
          0x61cc4Be864B7845EAb03A190562B609886CA5F07,
          0x3FdCa8B5d4D7B7AFaA5cE2c3bdb681D595568ddd,
          0xbEb1C119713D18f0CbdfD6c5829707693A38F701,
          0x7B2C21be7b4Bf2B1588099e60E1f6a89E5E9beA8,
          0x2EBe70376f1f2640af432626101AC52A337F143a,
          0x80b365da1C18f4aa1ecFa0dFA07Ed4417B05Cc69
     ];

     uint64 public icoStartedTime = 0;

     MNTP public mntToken; 
     GoldmintUnsold public unsoldContract;

     // We count ETH invested by person, in case we need to make a refund.
     mapping(address => uint) ethInvestedBy;

     // These can be changed before ICO start ($7USD/MNTP)
     uint constant STD_PRICE_USD_PER_1000_TOKENS = 7000;
     // coinmarketcap.com 04.09.2017
     uint constant ETH_PRICE_IN_USD = 300;
     // price changes from block to block
     uint constant SINGLE_BLOCK_LEN = 700000;

///////     
     // 1 000 000 tokens
     uint public constant BONUS_REWARD = 1000000 * 1 ether;
     // 2 000 000 tokens
     uint public constant FOUNDERS_REWARD = 2000000 * 1 ether;
     // 7 000 000 we sell only this amount of tokens during the ICO
     uint public constant ICO_TOKEN_SUPPLY_LIMIT = 7000000 * 1 ether;
     // 150 000 tokens soft cap
     uint public constant ICO_TOKEN_SOFT_CAP = 150000 * 1 ether;
     
     // this is total number of tokens sold during ICO
     uint public icoTokensSold = 0;
     // this is total number of tokens sent to GoldmintUnsold contract after ICO is finished
     uint public icoTokensUnsold = 0;

     // this is total number of tokens that were issued by a scripts
     uint public issuedExternallyTokens = 0;

     // this is where FOUNDERS_REWARD will be allocated
     address public foundersRewardsAccount = 0x0;

     enum State{
          Init,

          ICORunning,
          ICOPaused,
         
          ICOFinished,

          // We start to refund if Soft Cap is not reached.
          // Then each token holder request his money back and his
          // tokens are burned.
          // There is no any possibility to transfer tokens
          // There is no any possibility to move back
          Refunding,

          // In this state we lock all MNT tokens forever.
          // There is no any possibility to transfer tokens
          // There is no any possibility to move back
          Migrating
     }
     State public currentState = State.Init;

/// Modifiers:
     modifier onlyCreator() { 
          require(msg.sender==creator); 
          _; 
     }
     modifier onlyTokenManager() { 
          require(msg.sender==tokenManager); 
          _; 
     }
     modifier onlyOtherCurrenciesChecker() { 
          require(msg.sender==otherCurrenciesChecker); 
          _; 
     }
     modifier onlyInState(State state){ 
          require(state==currentState); 
          _; 
     }

/// Events:
     event LogStateSwitch(State newState);
     event LogBuy(address indexed owner, uint value);
     event LogBurn(address indexed owner, uint value);
     
/// Functions:
     /// @dev Constructor
     function Goldmint(
          address _tokenManager,
          address _otherCurrenciesChecker,

          address _mntTokenAddress,
          address _unsoldContractAddress,
          address _foundersVestingAddress)
     {
          creator = msg.sender;

          tokenManager = _tokenManager;
          otherCurrenciesChecker = _otherCurrenciesChecker; 

          mntToken = MNTP(_mntTokenAddress);
          unsoldContract = GoldmintUnsold(_unsoldContractAddress);

          // slight rename
          foundersRewardsAccount = _foundersVestingAddress;

          assert(multisigs.length==10);
     }

     function startICO() public onlyCreator onlyInState(State.Init) {
          setState(State.ICORunning);
          icoStartedTime = uint64(now);
          mntToken.lockTransfer(true);
          mntToken.issueTokens(foundersRewardsAccount, FOUNDERS_REWARD);
     }

     function pauseICO() public onlyCreator onlyInState(State.ICORunning) {
          setState(State.ICOPaused);
     }

     function resumeICO() public onlyCreator onlyInState(State.ICOPaused) {
          setState(State.ICORunning);
     }

     function startRefunding() public onlyCreator onlyInState(State.ICORunning) {
          // only switch to this state if less than ICO_TOKEN_SOFT_CAP sold
          require(icoTokensSold < ICO_TOKEN_SOFT_CAP);
          setState(State.Refunding);

          // in this state tokens still shouldn't be transferred
          assert(mntToken.lockTransfers());
     }

     function startMigration() public onlyCreator onlyInState(State.ICOFinished) {
          // there is no way back...
          setState(State.Migrating);

          // disable token transfers
          mntToken.lockTransfer(true);
     }

     /// @dev This function can be called by creator at any time,
     /// or by anyone if ICO has really finished.
     function finishICO() public onlyInState(State.ICORunning) {
          require(msg.sender == creator || isIcoFinished());

          setState(State.ICOFinished);
          mntToken.lockTransfer(false);

          // move all unsold tokens to unsoldTokens contract
          icoTokensUnsold = safeSub(ICO_TOKEN_SUPPLY_LIMIT,icoTokensSold);
          if(icoTokensUnsold>0){
               mntToken.issueTokens(unsoldContract,icoTokensUnsold);
               unsoldContract.finishIco();
          }

          // send all ETH to multisigs
          // we have N separate multisigs for extra security
          uint sendThisAmount = (this.balance / 10);
          for(uint i=0; i<10; ++i){
               address ms = multisigs[i];
               ms.transfer(sendThisAmount);
          }
     }

     function setState(State _s) internal {
          currentState = _s;
          LogStateSwitch(_s);
     }

/// Access methods:
     function setTokenManager(address _new) public onlyTokenManager {
          tokenManager = _new;
     }

     function setOtherCurrenciesChecker(address _new) public onlyCreator {
          otherCurrenciesChecker = _new;
     }

// These are used by frontend so we can not remove them
     function getTokensIcoSold() constant public returns (uint){          
          return icoTokensSold;       
     }      
     
     function getTotalIcoTokens() constant public returns (uint){          
          return ICO_TOKEN_SUPPLY_LIMIT;         
     }       
     
     function getMntTokenBalance(address _of) constant public returns (uint){         
          return mntToken.balanceOf(_of);         
     }        

     function getBlockLength()constant public returns (uint){          
          return SINGLE_BLOCK_LEN;      
     }

     function getCurrentPrice()constant public returns (uint){
          return getMntTokensPerEth(icoTokensSold);
     }

/////////////////////////////
     function isIcoFinished() constant public returns(bool) {
          return icoStartedTime > 0
            && (now > icoStartedTime + 30 days || icoTokensSold >= ICO_TOKEN_SUPPLY_LIMIT);
     }

     function getMntTokensPerEth(uint _tokensSold) public constant returns (uint){
          // 10 buckets
          uint priceIndex = (_tokensSold / 1 ether) / SINGLE_BLOCK_LEN;
          assert(priceIndex>=0 && (priceIndex<=9));
          
          uint8[10] memory discountPercents = [20,15,10,8,6,4,2,0,0,0];

          // We have to multiply by '1 ether' to avoid float truncations
          // Example: ($7000 * 100) / 120 = $5833.33333
          uint pricePer1000tokensUsd = 
               ((STD_PRICE_USD_PER_1000_TOKENS * 100) * 1 ether) / (100 + discountPercents[priceIndex]);

          // Correct: 300000 / 5833.33333333 = 51.42857142
          // We have to multiply by '1 ether' to avoid float truncations
          uint mntPerEth = (ETH_PRICE_IN_USD * 1000 * 1 ether * 1 ether) / pricePer1000tokensUsd;
          return mntPerEth;
     }

     function buyTokens(address _buyer) public payable onlyInState(State.ICORunning) {
          require(msg.value!=0);

          // The price is selected based on current sold tokens.
          // Price can 'overlap'. For example:
          //   1. if currently we sold 699950 tokens (the price is 10% discount)
          //   2. buyer buys 1000 tokens
          //   3. the price of all 1000 tokens would be with 10% discount!!!
          uint newTokens = (msg.value * getMntTokensPerEth(icoTokensSold)) / 1 ether;

          issueTokensInternal(_buyer,newTokens);

          // Update this only when buying from ETH
          ethInvestedBy[msg.sender] = safeAdd(ethInvestedBy[msg.sender], msg.value);
     }

     /// @dev This is called by other currency processors to issue new tokens 
     function issueTokensFromOtherCurrency(address _to, uint _weiCount) onlyInState(State.ICORunning) public onlyOtherCurrenciesChecker {
          require(_weiCount!=0);

          uint newTokens = (_weiCount * getMntTokensPerEth(icoTokensSold)) / 1 ether;
          issueTokensInternal(_to,newTokens);
     }

     /// @dev This can be called to manually issue new tokens 
     /// from the bonus reward
     function issueTokensExternal(address _to, uint _tokens) public onlyInState(State.ICOFinished) onlyTokenManager {
          // can not issue more than BONUS_REWARD
          require((issuedExternallyTokens + _tokens)<=BONUS_REWARD);

          mntToken.issueTokens(_to,_tokens);

          issuedExternallyTokens = issuedExternallyTokens + _tokens;
     }

     function issueTokensInternal(address _to, uint _tokens) internal {
          require((icoTokensSold + _tokens)<=ICO_TOKEN_SUPPLY_LIMIT);

          mntToken.issueTokens(_to,_tokens);

          icoTokensSold+=_tokens;

          LogBuy(_to,_tokens);
     }

     // anyone can call this and get his money back
     function getMyRefund() public onlyInState(State.Refunding) {
          address sender = msg.sender;
          uint ethValue = ethInvestedBy[sender];

          require(ethValue > 0);

          // 1 - send money back
          sender.transfer(ethValue);
          ethInvestedBy[sender] = 0;

          // 2 - burn tokens
          mntToken.burnTokens(sender, mntToken.balanceOf(sender));
     }

     // Default fallback function
     function() payable {
          // buyTokens -> issueTokensInternal
          buyTokens(msg.sender);
     }
}
