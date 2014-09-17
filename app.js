// web.js
var express = require("express");
var url = require('url');
var request = require('request');
var bodyParser = require('body-parser')
var app = express();
app.use(bodyParser.json())
var mongoUrl = 'mongodb://localhost:27017/test';

var MongoClient = require('mongodb').MongoClient;
var mongodb = {};

console.log('Connecting to ' + mongoUrl + ' .. ')
MongoClient.connect(mongoUrl, function(err, db) {
	
	if(err) {
		console.log(err);
		return;
	}
	
	console.log('Connection Established!')
	mongodb = db;
});

app.get('/GetBooking', function(req,res) {
	var bookingnumber = req.url.split('bookingnumber=')[1];
	var collection = mongodb.collection('bookings');
		collection.findOne({_id : bookingnumber}, function(err, docs) {
			res.send(docs);
		});
});

app.post('/SaveBooking', function(req,resp) {
	var booking = req.body;
	booking._id = booking.BookingNumber;
	
	var collection = mongodb.collection('bookings');
	collection.save(booking, function(err, res) {
		console.log(err);
		console.log(res);
		if(err)
			resp.send(err);
		resp.send(res)
	})
});

app.get('/SendPaymentNotification', function(req, res) {
	
	var url_parts = url.parse(req.url, true);
	var params = url_parts.query;
	sendmail(params);
  	res.send('Success');
});

app.get('/GetSaleStatistics', function(req, res) {
	
	var url_parts = url.parse(req.url, true);
	var params = url_parts.query;

	var temp = {
		date: params.date,
		count : new Date().getHours()
	};

	res.setHeader("Content-Type", "application/json");
	res.send(JSON.stringify(temp));
});

app.get('/GetGeoData', function(req, res) {

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
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});


var sendmail = function(params) {
		var nodemailer = require("nodemailer");
		var smtpTransport = nodemailer.createTransport("SMTP",{
		    service: "Gmail",
		    auth: {
		        user: "anders@swedishtravelmafia.com",
		        pass: "86kAanan"
		    }
		});

		var subject = 'Successful Payment Recieved. Email: ' + params.eMail;

		var text =  'DibsReferenceNo:' 	+ params.referenceNo 		+ '\n' + 
					'BillingFirstName:' + params.billingFirstName 	+ '\n' + 
					'BillingLastName:' 	+ params.billingLastName 	+ '\n' + 
					'eMail:' 			+ params.eMail 				+ '\n' + 
					'Sum:'				+ params.sum + ' ' + params.currency;
		
		var mailOptions = {
			from: "anders.back@me.com", 
		    to: "payment-notification@swalo.de",
		    subject: subject,
		    text: text
		};

		//Send Mail
		smtpTransport.sendMail(mailOptions, function(error, response){
		    if(error){
		        console.log(error);
		    }else{
		        console.log("Message sent: " + response.message + ", subject: " + subject);
		    }
		});
}			