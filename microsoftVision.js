/*******************
 * Javascript methods to use Microsoft Azure facial recognition and object recognition cognitive APIs
 * Author:  Andrew P. Citron 
 * 
 * There are 2 sets of methods
 * 	1) for identifying people in photos
 *  2) for identifying objects in photos
 * 
 * Before identifying people in photos, training is required.  That training was done outside of this code and isn't shown here.  Use Microsoft Azure documentation to figure out how to do that
 * I use jimp to pull people's faces out of the photos before sending the face to Azure.  I don't think this is strictly necessary.  Jimp is not used in the code that recognizes objects in a scene
 * These methods include code to report facial expression.
 * 
 * The code to identify objects in photos was used to replace tj.see() function that used to be provided by IBM.  I don't match that interface.  tj.see() takes the photo itself.  This routine assumes the photo has already been taken and is input to the method.
 * The output is also a different format as Azure provides 2 useful outputs:  a sentence describing the scene as well as a list of objects in the scene.
 * 
 * 
 */ 
https=require ('https');
var request = require('request');
var Jimp = require('jimp');
var fs=require("fs");
var config = require('./config');

const SUBSCRIPTION_KEY=config.azureVisionKey; 
const FACIALRECOGNITION_ENDPOINT=config.azureVisionEndpoint; 

const VISUALRECOGNITION_KEY=config.azureVisualRecognitionKey;
const VISUALRECOGNITION_ENDPOINT=config.azureVisualRecognitionEndpoint;

/*
 * Start of functions that recognize people in a photo
 */

var idToNameArray =                                 // these values determined when group was created.  could fetch them dynamically, but seems like too much trouble
{                                                   // you'll have to replace these with the ids and names of people you trained azure with 
  "01b34334-efb2-4aa3-b656-76556eac3874": "jack",
  "08e5fb4d-ba17-47c4-b486-c11a6c5f8c6e": "jenson",
  "3d591e80-d6e5-4159-8ad6-b7705769af91": "nathan",
  "3f7e081c-3330-4393-9c10-cecad0d7b5a5": "adrienne",
  "43d211b0-5b70-4ee4-931a-80f36834bdc2": "cheryl",
  "5949bdf7-2aa7-4f4d-93ba-a69c6f4323f7": "loren",
  "6bc14b26-c33a-4be1-9c46-266d1a47ef11": "elise",
  "9a57c2c6-34c4-48a3-8a86-8aa33f187205": "pam",
  "b9b286c7-8009-4f98-af1c-5751a1ce8caa": "andy",
  "bb0c2037-ad3b-4d8c-a07b-f1c075fb5c1d": "danielle",
  "be4e8847-73c8-4118-8c37-3781b792aa16": "ben",
  "c60e138a-3012-4abe-9a83-1664a1d777f1": "emily",
  "e2352e17-0258-458d-874d-d66205dec819": "rachel",
  "e7863373-bd76-4b14-b1ce-dfa05876f194": "patrick",
  "9ddd4dfe-92a7-4431-8c0b-a5b469d80509": "lisa",
  "613f70a9-135e-4707-a0f3-17b84bb4a6ec": "mary ellen"
}



// callback has these inputs  err, count, photo, faceValues
exports.MSpullFaceOutOfPhotoAndSave = function(dirAndFilename, counter, callback) {
  
  var directory = process.cwd()+"/photos/";	
  var functions_api = {                                                                             // this is used to save mostRecentFace.jpg in case we get the persons name wrong and need to retrain
	cropAndSaveFaceToFile: function(directory, dirAndFilename, coordinatesObject, counter) { 
	console.log("cropAndSaveFaceToFile called in functions_api" + coordinatesObject);
	
    return new Promise(function (resolve, reject) {
	    var coordinates = JSON.parse(coordinatesObject);
	    console.log("pullFaceOutOfPhotoAndSave " + directory + " " + dirAndFilename + " " +counter);
	    // console.log("pullFaceOutOfPhotoAndSave called with coordinates left " + coordinates.left + " top " + coordinates.top + " width " + coordinates.width + " height " + coordinates.height); 
	
  	    console.log("pullFace Jimp.read " + dirAndFilename);
	    Jimp.read(dirAndFilename).then(function(photo) {
		  console.log("pullFace Jimp.read callback " + dirAndFilename);
          photo
            .crop( coordinates.left, coordinates.top, coordinates.width, coordinates.height )         // crop to the given region
            .resize(256, 256)                                                                         // make smaller size
            .write(directory+"mostRecentFace.jpg", function() {console.log("Done Saving Cropped image")});                                         // save extracted face file 
                                                                                                      // callback invoked after new file created
                     
       })
        .catch(err => {
          console.error(err);
        })
      })
     }
   };
	

  var filename = dirAndFilename;	
  var urlPath = "/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion,smile,facialHair,glasses,hair,occlusion,makeup,accessories";
  // other attributes that can be returned headPose, smile, facialHair, glasses, hair, makeup, occlusion, accessories, blur, exposure and noise
  
  var result = {                                   // use this for callback
	 "hadFace": false, 
	 "savedPhotoID": 0,
     "faceRectangle": {
       "top": 0,
       "left": 0,
       "width": 0,
       "height": 0
     },
    
     "sexLastPersonSeen": "male",
     "minAgeLastPersonSeen": 0,
     "minAgeLastPersonSeen": 0,   
     "emotion": "neutral", 
     "whatISee": "",
     "facialExpression": ""

  };

  console.log("MSpullFaceOutOfPhotoAndSave Processing file " + filename + " Number files processed: " + counter);

  fs.readFile(filename, function(err, data) {
    if (err) {
        console.log("read jpg fail " + err);
    } else {
		console.log("microsoftVision.pullFaceOutOfPhotoAndSave POSTing to " + FACIALRECOGNITION_ENDPOINT +".api.cognitive.microsoft.com" + urlPath);

        var post_options = {
            host: FACIALRECOGNITION_ENDPOINT + '.api.cognitive.microsoft.com',
            method: 'POST',
            data: data,
            path: urlPath,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
                'Content-Length': data.length
            }
        };

        var post_req = https.request(post_options, function (response) {

            var responseText;

            response.on('data', function (rdata) {

                responseText+=rdata;
            });

            response.on('end', function () {
			
			  console.log("face detect returned " + responseText);
			  
			  responseText = responseText.replace("undefined", "");
			  // pull values out of returned info and populate callback structure	
			  jsonResponseText = JSON.parse(responseText);
			  
			  if (jsonResponseText[0] == undefined) {
			    result.hadFace = false;
              } else {
                result.hadFace = true;
                result.savedPhotoID = jsonResponseText[0].faceId;
                result.minAgeLastPersonSeen =jsonResponseText[0].faceAttributes.age;
                result.maxAgeLastPersonSeen =result.minAgeLastPersonSeen + 5;       // microsoft doesn't give a range, but seems to guess low, so add 5 to  min
                result.sexLastPersonSeen =jsonResponseText[0].faceAttributes.gender;
                
                // figure out if any emotion is being shown
               
                var emotionValue = jsonResponseText[0].faceAttributes.emotion.neutral;  // most likely to be neutral    
                result.emotion = "neutral";                                             // assume neutral
                
                // figure out if any non neutral value is greater that neutral or if over .3 (since neutral makes us miss other values)
                // for simplicity, I'm going to assume anything over .3 is worth reporting, not necessarily the highest value.  Unlikely more than one will be over .3
                if  (jsonResponseText[0].faceAttributes.emotion.anger > 0.01) {
				  result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.anger*100) + " percent chance you are angry.";
				  	
                  if ((jsonResponseText[0].faceAttributes.emotion.anger >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.anger >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.anger;
					result.emotion = "angry";
			      }
			    }  		
			    
			    if  (jsonResponseText[0].faceAttributes.emotion.contempt > 0.01) {                
				  result.facialExpression += " There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.contempt*100) + " percent chance you are showing contempt.";
		    
                  if ((jsonResponseText[0].faceAttributes.emotion.contempt >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.contempt >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.contempt;
					result.emotion = "full of contempt";
			      }
			    }  
			     
                if  (jsonResponseText[0].faceAttributes.emotion.disgust > 0.01) {
				  result.facialExpression += " There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.disgust*100) + " percent chance you are disgusted.";
 	
			      if ((jsonResponseText[0].faceAttributes.emotion.disgust >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.disgust >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.disgust;
					result.emotion = "disgusted about something";
			      }
			    }
			    
                if  (jsonResponseText[0].faceAttributes.emotion.fear > 0.01) {
				  result.facialExpression += " There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.fear*100) + " percent chance you are scared.";
  
			      if ((jsonResponseText[0].faceAttributes.emotion.fear >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.fear >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.fear;
					result.emotion = "scared";
			      }
			    }  
			    
                if  (jsonResponseText[0].faceAttributes.emotion.happiness > 0.01) {
				  result.facialExpression += " There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.happiness*100) + " percent chance you are happy.";
   
			      if ((jsonResponseText[0].faceAttributes.emotion.happiness >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.happiness >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.happiness;
					result.emotion = "happy";
			      }
			    }
			    
                if  (jsonResponseText[0].faceAttributes.emotion.sadness > 0.01) {
				  result.facialExpression += " There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.sadness*100) + " percent chance you are sad.";
  
			      if ((jsonResponseText[0].faceAttributes.emotion.sadness >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.sadness >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.sadness;
					result.emotion = "sad";
			      }
			    }
			    
                if  (jsonResponseText[0].faceAttributes.emotion.surprised > 0.01) {
				  result.facialExpression += " There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.surprised*100) + " percent chance you are surprised.";
  
                  if ((jsonResponseText[0].faceAttributes.emotion.surprise >= emotionValue) || (jsonResponseText[0].faceAttributes.emotion.surprise >= .3)) {
					emotionValue = jsonResponseText[0].faceAttributes.emotion.surprise;
					result.emotion = "surprised";
			      }
			    }  
			    
			    console.log("emotion is " + result.emotion + ". Emotion value is " + emotionValue); 
			    console.log("facialExpression is " + result.facialExpression);
			   
		        result.whatISee = "You are a " + result.sexLastPersonSeen + " around " + result.minAgeLastPersonSeen + " years old.";
				   
			    if (result.emotion != "neutral") {
				  result.whatISee += " Your expression seems " + result.emotion + ".";					   
			    }	   	
			       
			    if (jsonResponseText[0].faceAttributes.smile > 0.5) {
					   result.whatISee += " You are smiling. "
			    }	   
			       
			    if (result.sexLastPersonSeen == "male" ) {
					   if (jsonResponseText[0].faceAttributes.facialHair.moustache > 0.5) {
						  result.whatISee += " You have a moustache. ";   
					   }	
					   if (jsonResponseText[0].faceAttributes.facialHair.beard > 0.5) {
						  result.whatISee += " You have a beard. ";   
					   }	   
	     			   if (jsonResponseText[0].faceAttributes.facialHair.sideburns > 0.5) {
						  result.whatISee += " You have a sideburns. ";   
					   }
					   
					   if ((jsonResponseText[0].faceAttributes.hair.invisible == false) && ( jsonResponseText[0].faceAttributes.hair.bald > 0.5)) {
						  result.whatISee += " You are bald. ";   
					   }	
					   					   
					   
					   
				} else {  // female
					   if (jsonResponseText[0].faceAttributes.makeup.eyeMakeup == true) {
					      result.whatISee += " You are wearing eye make up. "
			           }
			           
      				   if ((jsonResponseText[0].faceAttributes.makeup.lipMakeup == true) && ( jsonResponseText[0].faceAttributes.occlusion.mouthOccluded == false)) {
					      result.whatISee += " You are wearing lipstick. "
			           }
					   
				}	 
				   
				if ((jsonResponseText[0].faceAttributes.hair.invisible == false) && (jsonResponseText[0].faceAttributes.hair.hairColor[0] != undefined )) {
					   console.log("Hair seen. color is " + jsonResponseText[0].faceAttributes.hair.hairColor[0].color);
					   result.whatISee += " Your hair is " + jsonResponseText[0].faceAttributes.hair.hairColor[0].color + ".";
				}	     
				
				if  (jsonResponseText[0].faceAttributes.glasses != "NoGlasses") {
				   result.whatISee += " You are wearing " + jsonResponseText[0].faceAttributes.glasses + ".";		   
			    }   
					
			    			    
                // save face location information.  This is useful for retraining if person is misidendified 
                result.faceRectangle.top = jsonResponseText[0].faceRectangle.top;
                result.faceRectangle.left = jsonResponseText[0].faceRectangle.left;
                result.faceRectangle.width = jsonResponseText[0].faceRectangle.width;
                result.faceRectangle.height = jsonResponseText[0].faceRectangle.height;    
                var cropped_image = functions_api.cropAndSaveFaceToFile(directory, dirAndFilename, JSON.stringify(jsonResponseText[0].faceRectangle), 1)
                                   .then(function (cropped_image) {
                                        console.log("cropped_image after function_api.call");
                                   })
                                  .catch(function (err) {
                                     console.error("cropped_image problem " + err); 
		   
                                   });
                
                  
                console.log("MSpullFaceOutOfPhotoAndSave on end: "+ responseText);
                console.log("Persons attributes " + result.whatISee);
              }  
              callback('end', counter, filename, result);               
            });
            
            

        });

        post_req.write(data);

        post_req.end();
    }
  });
}

exports.getNameAssociatedWithFace = function(savedPhotoID, callbackAfterFaceIdentified) {

  
    var result = {                                   // use this for callback
	   "personRecognized": false, 
	   "personId": 0,
       "personName": "I don't recognize you.  Who are you?",
       "confidence": 0,
       "topCandidatesPhrase": "I don't have a second guess"
     };

	
	 console.log("microsoftVision.getNameAssociatedWithFace POSTing to " + FACIALRECOGNITION_ENDPOINT + ".api.cognitive.microsoft.com/face/v1.0/identify for " + savedPhotoID);
	 
	 var myJSONObject = { 
      "personGroupId": "friendsandfamily",
      "faceIds": [
        savedPhotoID
      ],
      "maxNumOfCandidatesReturned": 3,
      "confidenceThreshold": 0.2
     };


    request({
            url: "https://" + FACIALRECOGNITION_ENDPOINT +".api.cognitive.microsoft.com/face/v1.0/identify",
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY               
            },
            method: "POST",
            json: true,   // <--Very important!!!
            body: myJSONObject
            }, function (error, response, body){
                 //console.log("microsoftVision.getNameAssociatedWithFace response " + error + " " + body.url + " " + body.explanation);  
                 console.log('microsoftVision.getNameAssociatedWithFace  error:', error); // Print the error if one occurred
                 console.log('microsoftVision.getNameAssociatedWithFace  statusCode:', response && response.statusCode); // Print the response status code if a response was received
                 console.log('microsoftVision.getNameAssociatedWithFace  body:', body); // Print the HTML
                 
                 if (!error && response.statusCode == 200) {
                    var info = body[0];    // parse blew up JSON.parse(body);
                    if ((info.candidates == undefined) || (info.candidates[0].personId == undefined)) {
					console.log("info.candidates undefined");
					   result.personRecognized = false;	
					   result.personName = "I don't recognize you.  What is your name?";
                    } else {
						console.log("info.candidates is defined");
						result.personRecognized = true;
					    result.personID = info.candidates[0].personId;
					    result.personName = idToNameArray[result.personID];          // pull name out of associative array
					    result.confidence = Math.round(info.candidates[0].confidence*100);
					    // for info, get second most likely name
					    if (info.candidates[1] != undefined) {
						   console.log("mostly likely you are " + result.personName + " confidence " + result.confidence + 
						               ". Second most likely is " + idToNameArray[info.candidates[1].personId] + " confidence " + (Math.round(info.candidates[1].confidence*100)));
						     
						   result.topCandidatesPhrase = "There's a " + result.confidence + " percent chance you are " + result.personName +
						                              ". There's a " + (Math.round(info.candidates[1].confidence*100)) + " percent chance you are " + idToNameArray[info.candidates[1].personId];      							
					    }
					   	
					}	
                    console.log("microsoftVision.getNameAssociatedWithFace person recognized " + result.personRecognized + " person is " + result.personName + " candidate[0].personId is " + info.candidates[0].personId + " candidate[0].confidence is " + info.candidates[0].confidence);
                    
                 } else {
					console.log("getNameAssociatedWithFace error " + error);
					result.personRecognized = false;
					result.personName = "I don't recognize you.  What is your name?";	 
				 }	 
                 
                 callbackAfterFaceIdentified('end', result); 
              });
    
}	
function roundToTwo(num) {    
    return +(Math.round(num + "e+2")  + "e-2");
}

exports.MSreportFacialExpression = function(filename, callBackToReportFacialExpression) {
	
  // a lot of this is lifted from above routine.  Here we're only getting facial expression stuff
  var urlPath = "/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion,smile,facialHair,glasses,hair,occlusion,makeup,accessories";
  // other attributes that can be returned headPose, smile, facialHair, glasses, hair, makeup, occlusion, accessories, blur, exposure and noise
  
  var sentenceForm;
  
  var result = {                                   // use this for callback
	 "hadFace": false, 
	 "savedPhotoID": 0,   
  
     "sexLastPersonSeen": "male",
     "minAgeLastPersonSeen": 0,
     "minAgeLastPersonSeen": 0,   
     "emotion": "neutral", 
     "facialExpression": "",
     
     "emotion": "neutral", 
     "facialExpressionToReport": "",
     "whatISee": ""
     
   
  };

  console.log("MSreportFacialExpression Processing file " + filename);

  fs.readFile(filename, function(err, data) {
    if (err) {
        console.log("read jpg fail " + err);
    } else {
		console.log("MSreportFacialExpression POSTing to " + FACIALRECOGNITION_ENDPOINT +".api.cognitive.microsoft.com" + urlPath);

        var post_options = {
            host: FACIALRECOGNITION_ENDPOINT +'.api.cognitive.microsoft.com',
            method: 'POST',
            data: data,
            path: urlPath,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
                'Content-Length': data.length
            }
        };

        var post_req = https.request(post_options, function (response) {

            var responseText;

            response.on('data', function (rdata) {

                responseText+=rdata;
            });

            response.on('end', function () {
			
			  console.log("MSreportFacialExpression face detect returned " + responseText);
			  
			  responseText = responseText.replace("undefined", "");
			  // pull values out of returned info and populate callback structure	
			  jsonResponseText = JSON.parse(responseText);
			  
			  if (jsonResponseText[0] == undefined) {
			    result.hadFace = false;
              } else {
                result.hadFace = true;
                result.savedPhotoID = jsonResponseText[0].faceId;
                result.minAgeLastPersonSeen =jsonResponseText[0].faceAttributes.age;
                result.maxAgeLastPersonSeen =result.minAgeLastPersonSeen + 5;       // microsoft doesn't give a range, but seems to guess low, so add 5 to  min
                result.sexLastPersonSeen =jsonResponseText[0].faceAttributes.gender;

                
                // figure out if any emotion is being shown
               
                var emotionValue = jsonResponseText[0].faceAttributes.emotion.neutral;  // most likely to be neutral    
                result.emotion = "neutral";                                             // assume neutral
                                                                    
                
                // pick out the highest value
				  	
                if ((jsonResponseText[0].faceAttributes.emotion.anger != 0.0) && (jsonResponseText[0].faceAttributes.emotion.anger >= emotionValue))  {
                    result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.anger*100) + " percent chance you are angry.";

					emotionValue = jsonResponseText[0].faceAttributes.emotion.anger;
					result.emotion = "angry";
					sentenceForm = 1;  
			    }
			    
		    
                if ((jsonResponseText[0].faceAttributes.emotion.contempt != 0.0) && (jsonResponseText[0].faceAttributes.emotion.contempt >= emotionValue))  {
					result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.contempt*100) + " percent chance you are felling contempt.";

					emotionValue = jsonResponseText[0].faceAttributes.emotion.contempt;
					result.emotion = "contemptuous";
					sentenceForm = 1;  
			    }
			     
 	
			    if ((jsonResponseText[0].faceAttributes.emotion.disgust != 0.0) && (jsonResponseText[0].faceAttributes.emotion.disgust >= emotionValue)) {
				    result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.disgust*100) + " percent chance you are disgusted.";

					emotionValue = jsonResponseText[0].faceAttributes.emotion.disgust;
					result.emotion = "disgusted";
					sentenceForm = 2;
			    }
			    
  
			    if ((jsonResponseText[0].faceAttributes.emotion.fear != 0.0) && (jsonResponseText[0].faceAttributes.emotion.fear >= emotionValue))  {
     				result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.fear*100) + " percent chance you are afraid.";

					emotionValue = jsonResponseText[0].faceAttributes.emotion.fear;
					result.emotion = "scared";
					sentenceForm = 2;
			    }
			    
  
         	    if ((jsonResponseText[0].faceAttributes.emotion.happiness != 0.0) && (jsonResponseText[0].faceAttributes.emotion.happiness >= emotionValue)) {
                    result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.happiness*100) + " percent chance you are happy.";

					emotionValue = jsonResponseText[0].faceAttributes.emotion.happiness;
					result.emotion = "happy";
					sentenceForm = 1;  
			    }
			    
  
			    if ((jsonResponseText[0].faceAttributes.emotion.sadness != 0.0) && (jsonResponseText[0].faceAttributes.emotion.sadness >= emotionValue)) {
        			result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.sadness*100) + " percent chance you are sad.";
			
					emotionValue = jsonResponseText[0].faceAttributes.emotion.sadness;
					result.emotion = "sad";
					sentenceForm = 1;  
			    }
			    
  
                if ((jsonResponseText[0].faceAttributes.emotion.surprise != 0.0) && (jsonResponseText[0].faceAttributes.emotion.surprise >= emotionValue)) {
				    result.facialExpression += "There's a " + roundToTwo(jsonResponseText[0].faceAttributes.emotion.surprise*100) + " percent chance you are suprised.";

					emotionValue = jsonResponseText[0].faceAttributes.emotion.surprise;
					result.emotion = "surprised";
					sentenceForm = 2;
			    }

			    
			    console.log("emotion response is " + result.emotion + ". Emotion value is " + emotionValue); 
				   
			    if (result.emotion != "neutral") {
				  if (sentenceForm == 1) {
				    result.facialExpressionToReport += " It seems my answer made you " + result.emotion + ".";					   
			      } else {
					result.facialExpressionToReport += " It seems my answer " + result.emotion + " you.";  
				  }	  	   	
			       
			      if (jsonResponseText[0].faceAttributes.smile > 0.5) {
					   result.facialExpressionToReport += " You are smiling. "
			      }	   
			      
			    } 	    
		        result.whatISee = "You are a " + result.sexLastPersonSeen + " around " + result.minAgeLastPersonSeen + " years old.";
				   
			    if (result.emotion != "neutral") {
				  result.whatISee += " Your expression seems " + result.emotion + ".";					   
			    }	   	
			       
			    if (jsonResponseText[0].faceAttributes.smile > 0.5) {
					   result.whatISee += " You are smiling. "
			    }	   
			       
			    if (result.sexLastPersonSeen == "male" ) {
					   if (jsonResponseText[0].faceAttributes.facialHair.moustache > 0.5) {
						  result.whatISee += " You have a moustache. ";   
					   }	
					   if (jsonResponseText[0].faceAttributes.facialHair.beard > 0.5) {
						  result.whatISee += " You have a beard. ";   
					   }	   
	     			   if (jsonResponseText[0].faceAttributes.facialHair.sideburns > 0.5) {
						  result.whatISee += " You have a sideburns. ";   
					   }
					   
					   if ((jsonResponseText[0].faceAttributes.hair.invisible == false) && ( jsonResponseText[0].faceAttributes.hair.bald > 0.5)) {
						  result.whatISee += " You are bald. ";   
					   }	
					   					   
					   
					   
				} else {  // female
					   if (jsonResponseText[0].faceAttributes.makeup.eyeMakeup == true) {
					      result.whatISee += " You are wearing eye make up. "
			           }
			           
      				   if (jsonResponseText[0].faceAttributes.makeup.lipMakeup == true)  {
					      result.whatISee += " You are wearing lipstick. "
			           }
					   
				}	 
				   
				if ((jsonResponseText[0].faceAttributes.hair.invisible == false) && (jsonResponseText[0].faceAttributes.hair.hairColor[0] != undefined )) {
					   console.log("Hair seen. color is " + jsonResponseText[0].faceAttributes.hair.hairColor[0].color);
					   result.whatISee += " Your hair is " + jsonResponseText[0].faceAttributes.hair.hairColor[0].color + ".";
				}	     
				
				if  (jsonResponseText[0].faceAttributes.glasses != "NoGlasses") {
				   result.whatISee += " You are wearing " + jsonResponseText[0].faceAttributes.glasses + ".";		   
			    }   
        
            }  
            // callback has face=true and facialExpressionToReport isn't "" if there's a useful expression  
			callBackToReportFacialExpression(result);                   

        });
      });

      post_req.write(data);

      post_req.end();

    }
  });	
  	
}
/*
 * End of code that is used to identify people and a persons attributes
 * 
 *? 

/* Start of code that uses Microsoft Azure's visual object recognition.
 * You can use this a basis for replacing tjBot's tj.see() method.  
 * Input: filename containing the image to be analyzed, and a callback function to call after the image has been analyzed
 * Output:  a result structure.  Note this doesn't match the output of tj.see() but could be modified to produce the same output as tj.see()
 */ 
exports.MSAzureSeeObjects = function(filename, callback) {
  

  var urlPath = "/vision/v3.2/describe?maxCandidates=5&language=en&model-version=latest";
  
  var result = {                                   // use this for callback
	 
     "photoDescription": "place",
     "descriptionOfObjects": ""
    
  };

  console.log("MSAzureSeeObjects Processing file " + filename );

  fs.readFile(filename, function(err, data) {
    if (err) {
        console.log("read jpg fail " + err);
    } else {
		console.log("MSAzureSeeObjects POSTing to " + urlPath);

        var post_options = {
            host: VISUALRECOGNITION_ENDPOINT +".cognitiveservices.azure.com",
            method: 'POST',
            data: data,
            path: urlPath,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': VISUALRECOGNITION_KEY,
                'Content-Length': data.length
            }
        };

        var post_req = https.request(post_options, function (response) {
			
			console.log("MSAzureSeeObjects host " + post_options.host + " using path " + post_options.path);

            var responseText;

            response.on('data', function (rdata) {

                responseText+=rdata;
            });

            response.on('end', function () {
			
			  console.log("ms visual object detection returned " + responseText);
			  
			  responseText = responseText.replace("undefined", "");
			  // pull values out of returned info and populate callback structure	
			  jsonResponseText = JSON.parse(responseText);
			  
			  console.log("ms visual object jsonResponseText.description.captions  " + jsonResponseText.description.captions);
			  
			  if (jsonResponseText.description == undefined) {
				result.photoDescription = "Nothing was seen";  				  
			    result.descriptionOfObjects = "";
              } else {
				  
                array = jsonResponseText.description.captions;  
                array.forEach(function (item, index) {                // I've only ever seen one object returned, so a forEach loop might be overkill
                     console.log(index, item );
                     result.photoDescription = item.text; 
				     
                });                                
                
                // then do for each jsonResponseText.description.tags....
                array = jsonResponseText.description.tags;
                array.forEach(function (item, index) {
                     console.log(index, item );
                     result.descriptionOfObjects += " " + item + ","; 
                });
                                                 
                console.log("MSAzureSeeObjects on end: "+ result.photoDescription);
                console.log("descriptionOfObjects " + result.descriptionOfObjects);
              }  
              callback(result);               
            });
            
          });
          
          post_req.write(data);
          post_req.end();

        };
      });
    }    
