pragma solidity ^0.4.19;

contract IGold {
     function balanceOf(address _owner) constant returns (uint256);
     function issueTokens(address _who, uint _tokens);
     function burnTokens(address _who, uint _tokens);
}

contract SafeMath {
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

contract StringMover {
	function stringToBytes32(string s) constant returns(bytes32){
		bytes32 out;
		assembly {
			out := mload(add(s, 32))
	     }
		return out;
	}

	function stringToBytes64(string s) constant returns(bytes32,bytes32){
		bytes32 out;
		bytes32 out2;

		assembly {
			out := mload(add(s, 32))
			out2 := mload(add(s, 64))
	     }
		return (out,out2);
	}

	function bytes32ToString(bytes32 x) constant returns (string) {
		bytes memory bytesString = new bytes(32);
		uint charCount = 0;
		for (uint j = 0; j < 32; j++) {
			byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
			if (char != 0) {
				bytesString[charCount] = char;
				charCount++;
			}
		}
		bytes memory bytesStringTrimmed = new bytes(charCount);
		for (j = 0; j < charCount; j++) {
			bytesStringTrimmed[j] = bytesString[j];
		}
		return string(bytesStringTrimmed);
	}

	function bytes64ToString(bytes32 x, bytes32 y) constant returns (string) {
		bytes memory bytesString = new bytes(64);
		uint charCount = 0;

		for (uint j = 0; j < 32; j++) {
			byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
			if (char != 0) {
				bytesString[charCount] = char;
				charCount++;
			}
		}
		for (j = 0; j < 32; j++) {
			char = byte(bytes32(uint(y) * 2 ** (8 * j)));
			if (char != 0) {
				bytesString[charCount] = char;
				charCount++;
			}
		}

		bytes memory bytesStringTrimmed = new bytes(charCount);
		for (j = 0; j < charCount; j++) {
			bytesStringTrimmed[j] = bytesString[j];
		}
		return string(bytesStringTrimmed);
	}
}


contract FiatTablesStorage is SafeMath, StringMover {
	function FiatTablesStorage() public {
		controllerAddress = msg.sender;
	}

	address public controllerAddress = 0x0;
	modifier onlyController() { require(msg.sender==controllerAddress); _; }

	function setControllerAddress(address _newController) onlyController {
		controllerAddress = _newController;
	}

// Fields - 1
     mapping(uint => string) docs;
     uint public docCount = 0;

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

///////
     function addDoc(string _ipfsDocLink) public onlyController returns(uint){
          docs[docCount] = _ipfsDocLink;
          uint out = docCount;
          docCount++;

          return out;
     }

     function getDocCount() public constant returns (uint){
          return docCount; 
     }

     function getDocAsBytes64(uint _index) public constant returns (bytes32,bytes32){
          require(_index < docCount);
		return stringToBytes64(docs[_index]);
     }

     function addFiatTransaction(string _userId, int _amountCents) public onlyController returns(uint){
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

     function getUserFiatBalance(string _userId) public constant returns(int){
          return fiatBalancesCents[_userId];
     }

     function addBuyTokensRequest(string _userId, string _requestHash) public onlyController returns(uint){
          Request memory r;
          r.sender = tx.origin;
          r.userId = _userId;
          r.requestHash = _requestHash;
          r.buyRequest = true;
          r.state = 0;

          requests[requestsCount] = r;
          uint out = requestsCount;
          requestsCount++;
          return out;
     }

     function addSellTokensRequest(string _userId, string _requestHash) onlyController returns(uint){
          Request memory r;
          r.sender = tx.origin;
          r.userId = _userId;
          r.requestHash = _requestHash;
          r.buyRequest = false;
          r.state = 0;

          requests[requestsCount] = r;
          uint out = requestsCount;
          requestsCount++;
          return out;
     }

     function getRequestsCount() public constant returns(uint){
          return requestsCount;
     }

     function getRequest(uint _index) public constant returns(
		address a, 
		bytes32 userId, 
		bytes32 hashA, bytes32 hashB, 
		bool buy, uint8 state)
	{
          require(_index < requestsCount);

          Request memory r = requests[_index];

		bytes32 userBytes = stringToBytes32(r.userId);
		var (out1, out2) = stringToBytes64(r.requestHash);

          return (r.sender, userBytes, out1, out2, r.buyRequest, r.state);
     }

     function cancelRequest(uint _index) onlyController public {
          require(_index < requestsCount);
          require(0==requests[_index].state);

          requests[_index].state = 2;
     }
     
     function setRequestProcessed(uint _index) onlyController public {
		requests[_index].state = 1;
     }
}

contract FiatTables is CreatorEnabled, StringMover {
	FiatTablesStorage public myStorage;
     IGold public goldToken;

     event NewTokenBuyRequest(address indexed _from, string indexed _userId);
     event NewTokenSellRequest(address indexed _from, string indexed _userId);
     event RequestCancelled(uint indexed _reqId);
     event RequestProcessed(uint indexed _reqId);

////////////////////
     function FiatTables(address _goldContractAddress, address _storageAddress) {
          creator = msg.sender;

		if(0!=_storageAddress){
			// use existing storage
			myStorage = FiatTablesStorage(_storageAddress);
		}else{
			myStorage = new FiatTablesStorage();
			//myStorage.setControllerAddress(address(this));
		}

          goldToken = IGold(_goldContractAddress);
     }
	
	// Only old controller can call setControllerAddress
	function changeController(address _newController) onlyCreator {
		myStorage.setControllerAddress(_newController);
	}

// 1
     function addDoc(string _ipfsDocLink) public onlyCreator returns(uint){
		return myStorage.addDoc(_ipfsDocLink);
     }

     function getDocCount() public constant returns (uint){
          return myStorage.docCount(); 
     }

     function getDoc(uint _index) public constant returns (string){
		var (x, y) = myStorage.getDocAsBytes64(_index);
		return bytes64ToString(x,y);
     }

// 2
     // _amountCents can be negative
     // returns index in user array
     function addFiatTransaction(string _userId, int _amountCents) public onlyCreator returns(uint){
		return myStorage.addFiatTransaction(_userId, _amountCents);
     }

     function getFiatTransactionsCount(string _userId) public constant returns (uint){
		return myStorage.getFiatTransactionsCount(_userId);
     }
     
     function getAllFiatTransactionsCount() public constant returns (uint){
		return myStorage.getAllFiatTransactionsCount();
     }

     function getFiatTransaction(string _userId, uint _index) public constant returns(int){
		return myStorage.getFiatTransaction(_userId, _index);
     }

// 4
     function getUserFiatBalance(string _userId) public constant returns(int){
		return myStorage.getUserFiatBalance(_userId);
     }

// 3:
     function addBuyTokensRequest(string _userId, string _requestHash) public returns(uint){
          NewTokenBuyRequest(msg.sender, _userId); 
		return myStorage.addBuyTokensRequest(_userId, _requestHash);
     }

     function addSellTokensRequest(string _userId, string _requestHash) returns(uint){
          NewTokenSellRequest(msg.sender, _userId);
		return myStorage.addSellTokensRequest(_userId, _requestHash);
     }

     function getRequestsCount() public constant returns(uint){
          return myStorage.getRequestsCount();
     }

     function getRequest(uint _index) public constant returns(address, string, string, bool, uint8){
		var (sender, userIdBytes, hashA, hashB, buy, state) = myStorage.getRequest(_index);

		string memory userId = bytes32ToString(userIdBytes);
		string memory hash = bytes64ToString(hashA, hashB);

		return (sender, userId, hash, buy, state);
     }

     function cancelRequest(uint _index) onlyCreator public {
		RequestCancelled(_index);
		return myStorage.cancelRequest(_index);
     }
     
     function processRequest(uint _index, uint _amountCents, uint _centsPerGold) onlyCreator public {
          require(_index < getRequestsCount());

		var (sender, userId, hash, isBuy, state) = getRequest(_index);
          require(0==state);

          // 0 - get fiat amount that user has
          int amount = int(_amountCents);
          int fiatAmount = getUserFiatBalance(userId);

          uint tokens = 0;
          if(isBuy){
               require(fiatAmount > 0);
               if(fiatAmount < amount){
                    amount = fiatAmount;
               }
               require(amount > 0);

               // 1 - issue tokens
               tokens = (uint(amount) * 1 ether) / _centsPerGold;
               issueGoldTokens(sender, tokens);

               // 2 - add fiat tx
               // negative for buy
               addFiatTransaction(userId, - amount);
          }else{
               tokens = (uint(amount) * 1 ether) / _centsPerGold;

               uint tokenBalance = goldToken.balanceOf(sender);
               if(tokenBalance < tokens){
                    tokens = tokenBalance;
                    amount = int((tokens * _centsPerGold) / 1 ether);
               }

               burnGoldTokens(sender, tokens);

               // 2 - add fiat tx
               // positive for sell 
               addFiatTransaction(userId, amount);
          }

          // 3 - update state
		myStorage.setRequestProcessed(_index);

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
