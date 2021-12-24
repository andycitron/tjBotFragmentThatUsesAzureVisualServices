// this config file fragment contains the keys and endpoints used with Microsoft's cognitive services that are used for visual recognition
// documentation for these Microsoft services can be found at https://portal.azure.com/  If you don't have an account with Microsoft, you'll have to create one

// these Azure keys and endpoints are used with facial recognition 
// endpoint for these services lookls like https://{putYourOwnEndpointHere}.api.cognitive.microsoft.com/
exports.azureVisionKey = "putYourOwnKeyHere";
exports.azureVisionEndpoint = "eastus";                              // put your own endpoint here


// new resource created in 2021 when IBM discontinued visual recognition.  so use microsoft instead
// endpoint:  https://{putYourOwnEndpointHere}.cognitiveservices.azure.com/
exports.azureVisualRecognitionKey = "putYourOwnKeyHere";             // note this is a different key than the azureVisionKey used above
exports.azureVisualRecognitionEndpoint = "putYourOwnEndpointHere";   // you get name your own endpoint with this service.   



