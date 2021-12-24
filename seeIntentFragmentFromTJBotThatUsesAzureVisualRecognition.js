/* 
   Author Andrew P. Citron
   
   This file contains example code that replaces call to tj.see() in your tjbot node.js implementation. 
   As of late 2021, tj.see() no longer works

   It is a code fragment intended to illustrate what the tjbot intent 'see' case looks like when using Microsoft Azure's cognitive services instead of IBM's Watson servcies

   The 'see' case is sometimes invoked when it shouldn't be.  This code double checks that this should really be a see 'case'  
     
   Note that tj.see() takes a photo.  The replacement code takes the photo itself, and then passes the image to the code I wrote that invokes 
     Microsoft's vision services.  I did it that way because this code uses

   You can watch my tjbot in action at https://www.youtube.com/playlist?list=PLiBNd_P7062QLBBUJ50LIzQHuxD1KVs0U  


*/ 

var TJBot = require('tjbot');
var config = require('./config');
var microsoftVision = require("./microsoftVision.js");


                    case "see":
                            console.log("see path " + intent.intent);
                            if (config.hasCamera == false) {
                                tj.speak("I'm sorry, I don't have a camera so I can't see anything").then(function(value) {})
                                
                            } else {
								var indexOfUtterance = utterance.indexOf("look");
								if (indexOfUtterance == -1) {       // verify certain phrases are in request.  seems to come down this path too often
								    indexOfUtterance = utterance.indexOf("see");
								    if (indexOfUtterance == -1) {   // still didn't find 'look for ' type phrase
										indexOfUtterance = utterance.indexOf("what is");
								    }	
								
							    }	
																	
								if (indexOfUtterance != -1) {    // seems to default to 'see' more than expected
								  console.log("Index of look see what is ", indexOfUtterance + " utterance " + utterance );	
                                                                    
                                  // added support for Microsft azure visual recognition when IBM Watson dropped their support *****
                                  filePath = process.cwd()+"/photos/photoToFindThingsIn.jpg"; 
                                  console.log("see Taking a photo");
                                  tj.takePhoto(filePath).then(function(filePath) {
	                                 console.log("capture object to analyze called back after photo taken");
                                     microsoftVision.MSAzureSeeObjects(filePath, function(result) {
                                       if (result.photoDescription == undefined) {
                                         tj.speak("I'm not sure I see anything").then(function(value) {})
                                       } else {
										 var whatSeen = "I see " + result.photoDescription + ".  That includes " + result.descriptionOfObjects;
									     	
									     tj.speak(whatSeen).then(function(value) {})  
                                       }
                                                                            
                                    })
                                 
                                  },function(err) {	 
                                       tj.speak("Sorry I can't see anything right now").then(function(value) {})
                                  });
                                spoken = true;
                              } else {
								  // bye gets mistinterpreted as by and gets sent here
								  if (utterance.indexOf("by") != -1 ) {                     // do goodbye processing
									
                                      tj.speak("bye bye", false).then(function(response) {  // in my implementation when a person says goodbye, tj stops listening until facial recognition recognizes someone
										  
										  tj.stopListening();
										   
								      });	  
                                      tj.wave();                       		        
                                      
							      }  else {	  
								    console.log("unexpected intent see " + utterance);
								    
								  }  
						      } 	  
						    }
                            break;
     
