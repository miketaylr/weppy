//toDataURL(toWebM(parseWebP(parseRIFF(


function parseRIFF(string){
  var offset = 0;
  var chunks = {};
  while(offset < string.length){
    var id = string.substr(offset, 4);
    var len = parseInt(string.substr(offset+4, 4).split('').map(function(i){
      var unpadded = i.charCodeAt(0).toString(2);
      return (new Array(8 - unpadded.length + 1)).join('0') + unpadded
    }).join(''),2);
    var data = string.substr(offset + 4 + 4, len);
    //console.log(id, len, data);
    offset += 4 + 4 + len;
    chunks[id] = chunks[id] || [];
    if(id == 'RIFF'){
      chunks[id].push(parseRIFF(data));
    }else if(id == 'LIST'){
      chunks[id].push(parseRIFF(data));
    }else{
      chunks[id].push(data)
    }
    
  }
  return chunks
}



function toBinStr(bits){
  var data = '';
  var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
  bits = pad + bits;
  for(var i = 0; i < bits.length; i+= 8){
    data += String.fromCharCode(parseInt(bits.substr(i,8),2))
  }
  return data;
}




function encode_64(input) {
	var output = "", i = 0, l = input.length,
	key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", 
	chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	while (i < l) {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) enc3 = enc4 = 64;
		else if (isNaN(chr3)) enc4 = 64;
		output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
	}
	return output;
}

function numToBin(number){
  var bits = number.toString('2');
  var data = '';
  var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
  bits = pad + bits;
  for(var i = 0; i < bits.length; i+= 8){
    data += String.fromCharCode(parseInt(bits.substr(i,8),2))
  }
  return data;
}

function parseWebP(riff){
  var VP8 = riff.RIFF[0].WEBP[0];

  var frame_start = VP8.indexOf('\x9d\x01\x2a')

  for(var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);
  
  var width, horizontal_scale, height, vertical_scale, tmp;
  tmp = (c[1] << 8) | c[0];
  width = tmp & 0x3FFF;
  horizontal_scale = tmp >> 14;
  tmp = (c[3] << 8) | c[2];
  height = tmp & 0x3FFF;
  vertical_scale = tmp >> 14;
  
  console.log(width, height);
  return {
    width: width,
    height: height,
    data: VP8,
    riff: riff
  }
}


function generateEBML(json){
  var ebml = '';
  for(var i in json){
    var el_len = json[i].pop ? json[i].length : 1;
    for(var k = 0; k < el_len; k++){
      var data = json[i].pop ? json[i][k] : json[i];
      console.log(schema[i].name, i,k,data);
      var hexid = i;
      if(typeof data == 'object'){
        data = generateEBML(data);
      }else if(typeof data == 'number'){
        data = toBinStr(data.toString(2));
      }
      if(typeof data == 'string'){
        var len = data.length;
        var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
        //(zeroes + 1) * 8 - (zeroes + 1) = zeroes * 7 - 7 = needed size
        var size_str = len.toString(2);
        var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
        var size = (new Array(zeroes + 1)).join('0') + '1' + padded;
        ebml += toBinStr(parseInt(hexid, 16).toString(2));
        ebml += toBinStr(size);
        ebml += data;
      }else{
        console.log('big error!?!?!?',i,data,json);
      }
    }
  }
  return ebml;
}



function toWebM(image){

  //converted using JSON.stringify(EBML,null,'  ').replace(/\w+/g,function(b){return nameHexMap[b]||b})
  //the EBML header is not present because of sorting issues, it doesn't always end up the first
  var EBML = {
    "18538067": [
      {
        "1654ae6b": [
          {
            "ae": [
              {
                "d7": 1,
                "63c5": 1,
                "9c": 0,
                "22b59c": "und",
                "86": "V_VP8",
                "83": 1,
                "23e383": 40000000,
                "e0": {
                  "b0": image.width,
                  "ba": image.height
                }
              }
            ]
          }
        ],
        "1f43b675": [
          {
            "e7": 0,
            "a3": [
              '\x81\x00\x00\x80' + image.data.substr(4)
            ]
          }
        ]
      }
    ]
  };

  return "\x1aE\xdf\xa3\x40\x20B\x82\x40\x04webmB\x85\x81\x02B\x86\x81\x01B\x87\x81\x02B\xf7\x81\x01B\xf2\x81\x04B\xf3\x81\x08" + generateEBML(EBML);
}

function toDataURL(webm){
  return 'data:video/webm;base64,' + encode_64(webm);
}


