/*jshint esversion: 6 */

(function(){
	'use strict';

	module.exports = (pluginContext) => {

		const toast = pluginContext.toast;
		const logger = pluginContext.logger;
		const app = pluginContext.app;
		const shell = pluginContext.shell;
          const prefs = pluginContext.preferences;
          
          /* Join Device Types */
          const DEVICE_TYPE_ANDROID_PHONE = 1;
          const DEVICE_TYPE_ANDROID_TABLET = 2;
          const DEVICE_TYPE_CHROME_BROWSER = 3;
          const DEVICE_TYPE_WIDNOWS_PC = 4;
          const DEVICE_TYPE_FIREFOX = 6;
          const DEVICE_TYPE_GROUP = 7;
          const DEVICE_TYPE_ANDROID_TV = 8;
          const DEVICE_TYPE_IOS_PHONE = 10;
          const DEVICE_TYPE_IOS_TABLET = 11;
          const DEVICE_TYPE_IFTTT = 12;
          const DEVICE_TYPE_IP = 13;

          const https = require("https");
          const request = require("superagent");

		var token = null;
		var isValidToken = false;

		function testToken(){
			if(token === null){
				isValidToken = false;
				return;
               }
               
               request
                 .get("https://joinjoaomgcd.appspot.com/_ah/api/registration/v1/listDevices")
                 .query({ apikey: token })
                 .then((res) => {
                    //logger.log("JSON: " + JSON.stringify(res.text) );
                   // Do something
                    var bodyObject = JSON.parse(res.text);
                    if( bodyObject.success == true ){
                         isValidToken = true;
                         toast.enqueue("Good Token");
                    }
                    else{
                         toast.enqueue("Error: " + bodyObject.errorMessage);                         
                    }
                 })
                 .catch(function(err) {
                    toast.enqueue("Bad API request");
                    logger.log(err.message, err.response);
                 });
		}

		function onPrefUpdate(pref) {
               token = prefs.get('token');
			testToken();
		}

		function startup() {
			token = prefs.get("token");
			testToken();
			//logger.log("Pushbullet: token is " + token);
			prefs.on('update', onPrefUpdate);
		}

		function search(query, res) {

               // toast.enqueue(query);

			if(!isValidToken){
				res.add({
					id: "noToken",
					title: "Your Join Api Key is not set or is not correct.",
					desc: "Please add your Api Key in the plugin preferences"
				});
				res.add({
                    id: "noTokenHelp",
                    title: "Your API key can be generated at:",
                    desc: "https://joinjoaomgcd.appspot.com/"
               });
				return;
			}

			const query_trim = query.trim();
               var query_split = query_trim.split(" ");
               
               const query_lower = query.trim().toLowerCase();
               if (query_lower.length == 0){
                    res.add({
                      id: "sendText",
                      title: "Send Message",
                      desc: "Please enter text to send"
                    });
                    return;
               }
               
               // if (query_lower.length >= 0) {
                    
               //      return;
               // }

               //toast.enqueue(query_trim);

               res.remove("sendText");

			res.add({
	    		id: "loadingText",
	    		title: "Your devices are now loading below",
	    		desc: "Please wait..."
	    	     });

	    	     loadDevices( (devices) => {
                    for(var i = 0; i < devices.length; i++){
                         var deviceId = null;
                         var deviceName = null;
                         var deviceIcon = null; 

                         deviceId = devices[i].deviceId;
                         deviceName = devices[i].deviceName;
                         deviceIcon = deviceTypeIcon(devices[i].deviceType);
                         
                         res.add({
                           id: "device",
                           icon: deviceIcon,
                           payload: { id: deviceId, name: deviceName, text: query },
                           title: deviceName
                         });
                         res.remove("loadingText");
                    }
                   });
		}

          function loadDevices(callback){
			if(!isValidToken){
				logger.log("Something is wrong! No valid token.");
				return;
               }
               
               request
                 .get("https://joinjoaomgcd.appspot.com/_ah/api/registration/v1/listDevices")
                 .query({ apikey: token })
                 .then((res, err) => {
                    // Do something
                    var bodyObject = JSON.parse(res.text);
                    const devices = bodyObject.records;

                    if (bodyObject.success == false) {
                         toast.enqueue("Something is wrong with your access token! Please reset it in the plugin preferences");
                         isValidToken = false;
                         return;
                    }
                    callback(devices);
                 })
                 .catch(function(err) {
                   toast.enqueue("Unable to connect to Join. Please try again later.");
                   logger.log(err.message);
                 });
		}

          function deviceTypeIcon(deviceType){
               switch (deviceType) {
                 case DEVICE_TYPE_ANDROID_PHONE:
                   return "#fab fa-android";
                 case DEVICE_TYPE_ANDROID_TABLET:
                   return "#fab fa-android";
                 case DEVICE_TYPE_CHROME_BROWSER:
                   return "#fab fa-chrome";
                 case DEVICE_TYPE_WIDNOWS_PC:
                   return "#fab fa-windows";
                 case DEVICE_TYPE_FIREFOX:
                   return "#fab fa-firefox";
                 case DEVICE_TYPE_GROUP:
                   return "join-transparent.png";
                 case DEVICE_TYPE_ANDROID_TV:
                   return "#fas fa-tv";
                 case DEVICE_TYPE_IOS_PHONE:
                   return "#fas fa-mobile";
                 case DEVICE_TYPE_IOS_TABLET:
                   return "#fas fa-tablet-alt";
                 case DEVICE_TYPE_IFTTT:
                   return "join-transparent.png";
                 case DEVICE_TYPE_IP:
                   return "join-transparent.png";
               }
          }

		function execute(id, payload){
               // How important is it really that id's are unique? Considering changing this.
               //

			if( id === "device" ){
				request
                    .get("https://joinjoaomgcd.appspot.com/_ah/api/messaging/v1/sendPush")
                    .query({
                         apikey: token,
                         deviceId: payload.id,
                         title: "Pushed from Hain",
                         text: payload.text
                    })
                    .then((res, err) => {
                         // Do something
                         var bodyObject = JSON.parse(res.text);

                         if (bodyObject.success == false) {
                              toast.enqueue("Something is wrong with your access token! Please reset it in the plugin preferences");
                              return;
                         }

                         toast.enqueue("Pushed to " + payload.name);
                    })
                    .catch(function(err) {
                         toast.enqueue("Unable to connect to Join. Please try again later.");
                         logger.log(err.message);
                    });
               }
		}

		return { startup, search, execute };
	};
})();