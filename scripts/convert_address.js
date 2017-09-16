const createKeccakHash = require('keccak')

function toChecksumAddress (address) {
     address = address.toLowerCase().replace('0x','');
     var hash = createKeccakHash('keccak256').update(address).digest('hex');
     var ret = '0x';

     for (var i = 0; i < address.length; i++) {
          if (parseInt(hash[i], 16) >= 8) {
               ret += address[i].toUpperCase();
          } else {
               ret += address[i];
          }
     }

     return ret;
}

function convertAll(){
     var addresses = [
          '0xcec42e247097c276ad3d7cfd270adbd562da5c61',
          '0x373c46c544662b8c5d55c24cf4f9a5020163ec2f',
          '0x672cf829272339a6c8c11b14acc5f9d07bafac7c',
          '0xce0e1981a19a57ae808a7575a6738e4527fb9118',
          '0x93aa76cdb17eea80e4de983108ef575d8fc8f12b',
          '0x20ae3329cd1e35feff7115b46218c9d056d430fd',
          '0xe9fc1a57a5dc1caa3de22a940e9f09e640615f7e',
          '0xd360433950de9f6fa0e93c29425845eed6bfa0d0',
          '0xf0de97eaff5d6c998c80e07746c81a336e1bbd43',
          '0x80b365da1c18f4aa1ecfa0dfa07ed4417b05cc69'
     ];

     for(var i=0; i<addresses.length; ++i){
          var inAddress = addresses[i];
          var outAddress = toChecksumAddress(inAddress);

          console.log(inAddress + ' -> ' + outAddress);
     }
}

// Start 
convertAll();
