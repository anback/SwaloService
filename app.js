// web.js
var express = require("express");
var url = require('url');
var request = require('request');
var bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.json());

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});
var logcount = 0;

app.get('/GetGeoData', function(req, res) {
	logcount++;
	var url_parts = url.parse(req.url, true);
	var params = url_parts.query;

	var ip = "";
	if(params.ip != undefined)
		ip = params.ip;
	else
		ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	//Handle ips with format: 83.140.153.60:36492, 83.140.154.254
	if(ip.split(',').length > 1)
		ip = ip.split(',')[0];
	if(ip.split(':').length > 1)
		ip = ip.split(':')[0];

    var geoUrl = 'http://api.geoips.com/ip/';
    geoUrl += ip;
    geoUrl += '/key/847580c96fd0c8fb49cadafeb4ec7d29/output/json';
    
    request(geoUrl, function(error, response, body) {
    	if(error)
    		res.send('error');
    	res.send(body);
    });	

    console.log('Processed ' + logcount++ + ' transactions.');
});

app.get('/GetBankUrl', function(req, res) {
	logcount++;
	var url_parts = url.parse(req.url, true);
	var params = url_parts.query;
	var baseUri = 'https://www.swalo.de/Pay.aspx?bookingnumber=' + params.bookingnumber + '&amp;email=' + params.email;
	var totalPrice = parseFloat(params.totalPrice);

	var json = {
		multipay : {
		  amount : totalPrice,
		  currency_code : "EUR",
		  reasons : {
		    reason : params.bookingnumber
		  },
		  notification_urls : 
		  {
		  		notification_url : '<![CDATA[' + getNotificationUrl(params.bookingnumber, params.email, params.po) + ']]>'
		  },
		  su : {},
		  project_id : 179503,
		  success_url : baseUri + '&amp;ispaid=1&amp;waitforpaymentconfirmation=1',
		  abort_url : baseUri
		}
	}

  	var xml = json2xml(json);
  	xml = xml.replace('notification_url>', 'notification_url notify_on=\"pending,recieved\">');
  	
	//Build Sofort Request
	options = {
		url : 'https://api.sofort.com/api/xml',
		method : "POST",
		headers : {
			Authorization : "Basic ODQ0NzQ6NzQ5NWU3MWU3ZDg5OTE2MTU1NTk2Y2JjYWY1YTVhY2U="
		},
		body : xml
	};

	console.log(xml);

	request(options, function(err, response, body) {
		
		var temp = undefined;
		if(err)
		{
			temp = err;
		}

		var splits = body.split('<payment_url>');

		if(splits.length > 1)
			temp = splits[1].split('</payment_url>')[0];
		
		res.send(temp);
	});

	console.log('Processed ' + logcount++ + ' transactions.');
});


function getNotificationUrl(bookingnumber, email, po) {
	var url = "https://www.swalo.de/Pay.aspx?bookingnumber=";
	url +=  bookingnumber;
	url += "&email=";
	url += email;
	url += "&isFrontEndSolutionPayment=true&isSuccess=true";
	url += "&po=" + po;
	return url;
}


function json2xml(o, tab) {
   var toXml = function(v, name, ind) {
      var xml = "";
      if (v instanceof Array) {
         for (var i=0, n=v.length; i<n; i++)
            xml += ind + toXml(v[i], name, ind+"\t") + "\n";
      }
      else if (typeof(v) == "object") {
         var hasChild = false;
         xml += ind + "<" + name;
         for (var m in v) {
            if (m.charAt(0) == "@")
               xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
            else
               hasChild = true;
         }
         xml += hasChild ? ">" : "/>";
         if (hasChild) {
            for (var m in v) {
               if (m == "#text")
                  xml += v[m];
               else if (m == "#cdata")
                  xml += "<![CDATA[" + v[m] + "]]>";
               else if (m.charAt(0) != "@")
                  xml += toXml(v[m], m, ind+"\t");
            }
            xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "</" + name + ">";
         }
      }
      else {
         xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
      }
      return xml;
   }, xml="";
   for (var m in o)
      xml += toXml(o[m], m, "");
   return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
}